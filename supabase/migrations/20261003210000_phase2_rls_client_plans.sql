-- VeriFit Phase 2: client_plans, RLS and booking safety.
-- Staging-only; no destructive column drops.
-- Rollback hint: export client_plans first, then drop policies/table and restore prior policies manually.

create table if not exists public.client_plans (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  user_id uuid not null references public.clients(id) on delete cascade,
  plan_type text not null check (plan_type in ('workout', 'nutrition')),
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists client_plans_user_created_idx
  on public.client_plans (user_id, created_at desc);

alter table public.client_plans enable row level security;

-- Remove permissive legacy policies before defining the narrow set.
drop policy if exists "Allow public insert for registration" on public.clients;
drop policy if exists "Allow public insert" on public.trainers;
drop policy if exists "Trainer can update own profile" on public.trainers;
drop policy if exists "Trainer dürfen ihren Status nicht selbst ändern" on public.trainers;
drop policy if exists "Trainer können sich nur als pending registrieren" on public.trainers;
drop policy if exists "Clients können eigenes Profil lesen" on public.clients;
drop policy if exists "Users can insert their own client profile." on public.clients;
drop policy if exists "Users can insert messages" on public.messages;
drop policy if exists "Users can view their own messages" on public.messages;
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Öffentlicher Lesezugriff" on public.trainers;
drop policy if exists "Admin update trainers" on public.trainers;
drop policy if exists bookings_read_participants on public.bookings;
drop policy if exists slots_public_read on public.trainer_slots;
drop policy if exists slots_trainer_delete_free on public.trainer_slots;
drop policy if exists slots_trainer_insert on public.trainer_slots;

create or replace function public.prevent_protected_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if auth.uid() = old.id then
    if new.status is distinct from old.status
      or new.stripe_account_id is distinct from old.stripe_account_id
      or new.charges_enabled is distinct from old.charges_enabled
      or new.id is distinct from old.id
      or new.email is distinct from old.email then
      raise exception 'Geschützte Trainerfelder dürfen nicht selbst geändert werden';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_trainer_profile on public.trainers;
create trigger protect_trainer_profile
before update on public.trainers
for each row execute function public.prevent_protected_profile_changes();

create or replace function public.prevent_profile_role_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() and new.role is distinct from old.role then
    raise exception 'Die Rolle darf nicht selbst geändert werden';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
before update on public.profiles
for each row execute function public.prevent_profile_role_changes();

drop policy if exists trainers_public_read_approved on public.trainers;
drop policy if exists trainers_owner_update on public.trainers;
drop policy if exists trainers_admin_update on public.trainers;
drop policy if exists clients_owner_select on public.clients;
drop policy if exists clients_owner_update on public.clients;
drop policy if exists clients_owner_insert on public.clients;
drop policy if exists profiles_owner_select on public.profiles;
drop policy if exists profiles_admin_update on public.profiles;
drop policy if exists trainer_slots_public_read on public.trainer_slots;
drop policy if exists trainer_slots_owner_insert on public.trainer_slots;
drop policy if exists trainer_slots_owner_delete_free on public.trainer_slots;
drop policy if exists bookings_participant_read on public.bookings;
drop policy if exists bookings_admin_update on public.bookings;
drop policy if exists messages_participant_select on public.messages;
drop policy if exists messages_participant_insert on public.messages;
drop policy if exists client_plans_participant_read on public.client_plans;
drop policy if exists client_plans_trainer_insert on public.client_plans;
drop policy if exists client_plans_trainer_update on public.client_plans;
drop policy if exists client_plans_trainer_delete on public.client_plans;

create policy trainers_public_read_approved on public.trainers
for select to anon, authenticated
using (status = 'approved' or auth.uid() = id or public.is_admin());

create policy trainers_owner_update on public.trainers
for update to authenticated
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

create policy trainers_admin_update on public.trainers
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy clients_owner_select on public.clients
for select to authenticated
using (
  auth.uid() = id
  or public.is_admin()
  or exists (select 1 from public.bookings b where b.client_id = clients.id and b.trainer_id = auth.uid())
);

create policy clients_owner_update on public.clients
for update to authenticated
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

create policy clients_owner_insert on public.clients
for insert to authenticated
with check (auth.uid() = id);

create policy profiles_owner_select on public.profiles
for select to authenticated
using (auth.uid() = id or public.is_admin());

create policy profiles_admin_update on public.profiles
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy trainer_slots_public_read on public.trainer_slots
for select to anon, authenticated
using (status = 'free' or auth.uid() = trainer_id or public.is_admin());

create policy trainer_slots_owner_insert on public.trainer_slots
for insert to authenticated
with check (auth.uid() = trainer_id and status = 'free');

create policy trainer_slots_owner_delete_free on public.trainer_slots
for delete to authenticated
using (auth.uid() = trainer_id and status = 'free');

create policy bookings_participant_read on public.bookings
for select to authenticated
using (client_id = auth.uid() or trainer_id = auth.uid() or public.is_admin());

create policy bookings_admin_update on public.bookings
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy messages_participant_select on public.messages
for select to authenticated
using (
  sender_id = auth.uid() or receiver_id = auth.uid() or public.is_admin()
);

create policy messages_participant_insert on public.messages
for insert to authenticated
with check (
  sender_id = auth.uid()
  and (
    public.is_admin()
    or exists (
      select 1 from public.bookings b
      where (b.client_id = sender_id and b.trainer_id = receiver_id)
         or (b.client_id = receiver_id and b.trainer_id = sender_id)
    )
    or exists (
      select 1 from public.messages m
      where (m.sender_id = sender_id and m.receiver_id = receiver_id)
         or (m.sender_id = receiver_id and m.receiver_id = sender_id)
    )
  )
);

create policy client_plans_participant_read on public.client_plans
for select to authenticated
using (user_id = auth.uid() or trainer_id = auth.uid() or public.is_admin());

create policy client_plans_trainer_insert on public.client_plans
for insert to authenticated
with check (
  trainer_id = auth.uid()
  and exists (select 1 from public.bookings b where b.trainer_id = auth.uid() and b.client_id = client_plans.user_id)
);

create policy client_plans_trainer_update on public.client_plans
for update to authenticated
using (trainer_id = auth.uid() or public.is_admin())
with check (trainer_id = auth.uid() or public.is_admin());

create policy client_plans_trainer_delete on public.client_plans
for delete to authenticated
using (trainer_id = auth.uid() or public.is_admin());

-- Verification documents are private: only the owner and admin can access them.
drop policy if exists "Trainer Dokumente Lesen" on storage.objects;
drop policy if exists "Trainer Dokumente Upload" on storage.objects;
drop policy if exists "Trainer lesen eigene Dokumente" on storage.objects;
drop policy if exists "Trainer upload eigene Dokumente" on storage.objects;
drop policy if exists "Trainer löschen eigene Dokumente" on storage.objects;
create policy verification_docs_owner_read on storage.objects
for select to authenticated
using (bucket_id = 'verification-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy verification_docs_owner_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy verification_docs_owner_delete on storage.objects
for delete to authenticated
using (bucket_id = 'verification-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

revoke execute on function public.cancel_booking(uuid) from public, anon;
grant execute on function public.cancel_booking(uuid) to authenticated;
revoke execute on function public.respond_to_booking(uuid, boolean) from public, anon;
grant execute on function public.respond_to_booking(uuid, boolean) to authenticated;

-- Run expiry every 15 minutes when pg_cron is available in the project.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    execute 'create extension if not exists pg_cron with schema extensions';
    if not exists (select 1 from cron.job where jobname = 'verifit-expire-unpaid-bookings') then
      perform cron.schedule('verifit-expire-unpaid-bookings', '*/15 * * * *', 'select public.expire_unpaid_bookings()');
    end if;
  end if;
exception when others then
  raise notice 'pg_cron konnte nicht aktiviert werden: %', sqlerrm;
end;
$$;
