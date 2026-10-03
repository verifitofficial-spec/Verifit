-- VeriFit Phase 2: Auth, RLS and public-data hardening.
-- Staging only. Apply after reviewing the exported schema in docs/db/.
-- Rollback hint: restore the previous policies/functions from the staging export;
-- dropping the view/policies does not restore the intentionally removed access.

begin;

-- Consent records are created by the auth trigger from signup metadata.
create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  version text not null,
  accepted_at timestamptz not null default now(),
  unique (user_id, type, version)
);

alter table public.consents enable row level security;

-- Never trust a client-supplied admin role. The trigger also creates the
-- domain profile atomically, so email confirmation cannot leave a half-signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  safe_role text;
  consent jsonb;
begin
  safe_role := case when new.raw_user_meta_data ->> 'role' = 'trainer' then 'trainer' else 'client' end;

  insert into public.profiles (id, email, role)
  values (new.id, new.email, safe_role)
  on conflict (id) do update
    set email = excluded.email,
        role = case when public.profiles.role in ('admin', 'trainer') then public.profiles.role else excluded.role end;

  if safe_role = 'trainer' then
    insert into public.trainers (id, name, email, bio, status)
    values (
      new.id,
      nullif(new.raw_user_meta_data ->> 'name', ''),
      new.email,
      nullif(new.raw_user_meta_data ->> 'bio', ''),
      'pending'
    )
    on conflict (id) do nothing;
  else
    insert into public.clients (id, name, email)
    values (new.id, nullif(new.raw_user_meta_data ->> 'name', ''), new.email)
    on conflict (id) do nothing;
  end if;

  consent := coalesce(new.raw_user_meta_data -> 'consents', '{}'::jsonb);
  if consent ->> 'health_data' = 'true' then
    insert into public.consents (user_id, type, version)
    values (new.id, 'health_data', coalesce(consent ->> 'version', '2026-10-01'))
    on conflict do nothing;
  end if;
  if consent ->> 'terms' = 'true' then
    insert into public.consents (user_id, type, version)
    values (new.id, 'terms', coalesce(consent ->> 'version', '2026-10-01'))
    on conflict do nothing;
  end if;
  if consent ->> 'privacy' = 'true' then
    insert into public.consents (user_id, type, version)
    values (new.id, 'privacy', coalesce(consent ->> 'version', '2026-10-01'))
    on conflict do nothing;
  end if;

  return new;
end;
$function$;

-- Ensure the auth trigger exists without creating a duplicate trigger.
do $block$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace n on n.oid = p.pronamespace
    where t.tgrelid = 'auth.users'::regclass
      and not t.tgisinternal
      and n.nspname = 'public'
      and p.proname = 'handle_new_user'
  ) then
    execute 'create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user()';
  end if;
end;
$block$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$function$;

-- Protected trainer fields cannot be changed by a trainer update, even if a
-- future policy is accidentally widened. Admin changes remain allowed.
create or replace function public.prevent_trainer_protected_updates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not public.is_admin() then
    if new.status is distinct from old.status then
      raise exception 'Geschützte Trainerdaten können nur durch einen Admin geändert werden';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists protect_trainer_fields on public.trainers;
create trigger protect_trainer_fields
before update on public.trainers
for each row execute function public.prevent_trainer_protected_updates();

-- Public trainer data is an explicit whitelist. Sensitive columns never pass
-- through this view. `verified` is derived because the staging export has no
-- separate verified column.
drop view if exists public.trainers_public;
create view public.trainers_public as
select id, name, bio, city, service_mode, specialties,
       instagram_url, tiktok_url,
       (status = 'approved') as verified
from public.trainers
where status = 'approved';

grant select on public.trainers_public to anon, authenticated;

-- Replace the exported permissive policies with least-privilege policies.
do $block$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename in
    ('profiles','clients','trainers','trainer_offers','trainer_slots','bookings','client_trackings','messages','foods','consents') loop
    execute format('drop policy if exists %I on public.%I', p.policyname,
      case when p.tablename = 'profiles' then 'profiles'
           when p.tablename = 'clients' then 'clients'
           when p.tablename = 'trainers' then 'trainers'
           when p.tablename = 'trainer_offers' then 'trainer_offers'
           when p.tablename = 'trainer_slots' then 'trainer_slots'
           when p.tablename = 'bookings' then 'bookings'
           when p.tablename = 'client_trackings' then 'client_trackings'
           when p.tablename = 'messages' then 'messages'
           when p.tablename = 'foods' then 'foods'
           else 'consents' end);
  end loop;
end;
$block$;

alter table public.profiles enable row level security;
create policy profiles_read_own on public.profiles for select to authenticated using (auth.uid() = id or public.is_admin());

alter table public.clients enable row level security;
create policy clients_read_own on public.clients for select to authenticated using (auth.uid() = id or public.is_admin());
create policy clients_update_own on public.clients for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

alter table public.trainers enable row level security;
create policy trainers_read_owner_admin on public.trainers for select to authenticated using (auth.uid() = id or public.is_admin());
create policy trainers_update_owner_profile on public.trainers for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy trainers_update_admin on public.trainers for update to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.trainer_offers enable row level security;
create policy offers_read_public_approved on public.trainer_offers for select to anon, authenticated
  using (is_active and exists (select 1 from public.trainers t where t.id = trainer_id and t.status = 'approved'));
create policy offers_read_owner_admin on public.trainer_offers for select to authenticated using (auth.uid() = trainer_id or public.is_admin());
create policy offers_owner_write on public.trainer_offers for all to authenticated
  using (auth.uid() = trainer_id or public.is_admin())
  with check (auth.uid() = trainer_id or public.is_admin());

alter table public.trainer_slots enable row level security;
create policy slots_read_free_approved on public.trainer_slots for select to anon, authenticated
  using (status = 'free' and exists (select 1 from public.trainers t where t.id = trainer_id and t.status = 'approved'));
create policy slots_owner_read on public.trainer_slots for select to authenticated using (auth.uid() = trainer_id or public.is_admin());
create policy slots_owner_insert_free on public.trainer_slots for insert to authenticated
  with check (auth.uid() = trainer_id and status = 'free');
create policy slots_owner_delete_free on public.trainer_slots for delete to authenticated
  using (auth.uid() = trainer_id and status = 'free');

alter table public.bookings enable row level security;
create policy bookings_read_participants on public.bookings for select to authenticated
  using (auth.uid() = client_id or auth.uid() = trainer_id or public.is_admin());

create policy consents_read_own on public.consents for select to authenticated
  using (auth.uid() = user_id or public.is_admin());

alter table public.client_trackings enable row level security;
create policy tracking_client_owner on public.client_trackings for all to authenticated
  using (auth.uid() = client_id) with check (auth.uid() = client_id);
create policy tracking_trainer_opt_in on public.client_trackings for select to authenticated
  using (exists (
    select 1 from public.bookings b
    join public.clients c on c.id = b.client_id
    where b.client_id = client_trackings.client_id
      and b.trainer_id = auth.uid()
      and b.status = 'confirmed'
      and c.share_data = true
  ));
create policy tracking_admin_read on public.client_trackings for select to authenticated using (public.is_admin());

alter table public.messages enable row level security;
create policy messages_read_participants on public.messages for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy messages_insert_active_booking on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.status = 'confirmed'
        and ((b.client_id = sender_id and b.trainer_id = receiver_id)
          or (b.client_id = receiver_id and b.trainer_id = sender_id))
    )
  );

alter table public.foods enable row level security;
create policy foods_read_authenticated on public.foods for select to authenticated using (true);
create policy foods_admin_write on public.foods for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- A paid acceptance remains pending until Stripe confirms payment. This
-- replaces the exported function, which incorrectly marked paid slots booked
-- before payment.
create or replace function public.respond_to_booking(p_booking_id uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = 'public'
as $function$
declare b public.bookings%rowtype; new_status text;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Buchung nicht gefunden'; end if;
  if b.trainer_id is distinct from auth.uid() then raise exception 'Keine Berechtigung'; end if;
  if b.status <> 'pending' then raise exception 'Anfrage wurde bereits bearbeitet'; end if;

  if p_accept then
    if b.price > 0 then
      new_status := 'accepted';
      update public.bookings
        set status = 'accepted', responded_at = now(), payment_due_at = now() + interval '24 hours'
        where id = b.id;
    else
      new_status := 'confirmed';
      update public.bookings set status = 'confirmed', responded_at = now() where id = b.id;
      update public.trainer_slots set status = 'booked' where id = b.slot_id and status = 'pending';
    end if;
  else
    new_status := 'declined';
    update public.bookings set status = 'declined', responded_at = now() where id = b.id;
    update public.trainer_slots set status = 'free' where id = b.slot_id and status = 'pending';
  end if;
  return new_status;
end;
$function$;

-- Expire unanswered requests as well as accepted unpaid requests.
create or replace function public.expire_unpaid_bookings()
returns void
language plpgsql
security definer
set search_path = 'public'
as $function$
begin
  with expired as (
    update public.bookings
    set status = 'expired'
    where (status = 'pending' and created_at < now() - interval '24 hours')
       or (status = 'accepted' and payment_due_at < now())
    returning slot_id
  )
  update public.trainer_slots
  set status = 'free'
  where id in (select slot_id from expired) and status = 'pending';
end;
$function$;

-- Storage: remove the exported bucket-wide trainer access. The verification
-- bucket is private and paths are always prefixed by the trainer auth id.
drop policy if exists "Trainer Dokumente Lesen" on storage.objects;
drop policy if exists "Trainer Dokumente Upload" on storage.objects;
drop policy if exists "Admins lesen alle Verifizierungsdokumente" on storage.objects;
drop policy if exists "Trainer lesen eigene Dokumente" on storage.objects;
drop policy if exists "Trainer löschen eigene Dokumente" on storage.objects;
drop policy if exists "Trainer upload eigene Dokumente" on storage.objects;
create policy verification_docs_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and public.is_admin());
create policy verification_docs_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy verification_docs_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy verification_docs_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);

commit;

-- Manual rollback hint (run only after confirming a replacement policy set):
-- drop view if exists public.trainers_public;
-- drop table if exists public.consents;
