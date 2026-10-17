-- VeriFit Lead-MVP baseline.
--
-- Ziel: einmaliger, reproduzierbarer Aufbau auf einer leeren Supabase-Datenbank
-- (PostgreSQL 15+ mit vorhandenen Schemas auth und storage).
-- Diese Datei ist bewusst NICHT Teil der bisherigen Legacy-Migrationskette.
-- Aktivierungs- und Testreihenfolge: docs/db/lead-mvp-baseline.md.

begin;

do $$
declare
  relation_name text;
begin
  if current_setting('server_version_num')::integer < 150000 then
    raise exception 'VeriFit-Baseline benötigt PostgreSQL 15 oder neuer (gefunden: %).', current_setting('server_version');
  end if;

  if current_user <> 'postgres' then
    raise exception 'VeriFit-Baseline muss als postgres ausgeführt werden (aktuell: %).', current_user;
  end if;

  if to_regclass('auth.users') is null
     or to_regclass('storage.buckets') is null
     or to_regclass('storage.objects') is null then
    raise exception 'VeriFit-Baseline benötigt eine Supabase-Datenbank mit auth- und storage-Schema.';
  end if;

  if not exists (select 1 from pg_roles where rolname = 'anon')
     or not exists (select 1 from pg_roles where rolname = 'authenticated')
     or not exists (select 1 from pg_roles where rolname = 'service_role') then
    raise exception 'VeriFit-Baseline: erwartete Supabase-Rollen fehlen.';
  end if;

  foreach relation_name in array array[
    'profiles', 'clients', 'trainers', 'trainer_offers',
    'inquiries', 'inquiry_status_events', 'trainers_public'
  ]
  loop
    if to_regclass('public.' || relation_name) is not null then
      raise exception 'VeriFit-Baseline darf nur auf leerem Zielschema laufen; public.% existiert bereits.', relation_name;
    end if;
  end loop;

  if to_regnamespace('verifit_private') is not null then
    raise exception 'VeriFit-Baseline darf nur auf leerem Zielschema laufen; verifit_private existiert bereits.';
  end if;

  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and tgname = 'on_auth_user_created'
      and not tgisinternal
  ) then
    raise exception 'VeriFit-Baseline: auth.users-Trigger on_auth_user_created existiert bereits.';
  end if;

  if exists (select 1 from storage.buckets where id in ('avatars', 'verification-docs')) then
    raise exception 'VeriFit-Baseline: mindestens ein verwalteter Storage-Bucket existiert bereits.';
  end if;
end $$;

revoke create on schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;

create schema verifit_private;
revoke all on schema verifit_private from public, anon, authenticated;
grant usage on schema verifit_private to anon, authenticated, service_role;

alter default privileges for role postgres in schema public revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke all on tables from public;
alter default privileges for role postgres in schema verifit_private revoke execute on functions from public;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_valid check (role in ('client', 'trainer', 'admin'))
);

comment on table public.profiles is
  'Autorisierungsprofil. Admin-Rollen werden niemals aus frei gesetzten Signup-Metadaten übernommen.';

create table public.clients (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  terms_accepted_at timestamptz,
  health_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_name_length check (char_length(btrim(name)) between 1 and 200),
  constraint clients_email_length check (char_length(email) between 3 and 320)
);

comment on column public.clients.health_consent_at is
  'Vom aktuellen Registrierungsformular übermittelter Einwilligungszeitpunkt; keine Gesundheitsdaten werden im Lead-MVP gespeichert.';

create table public.trainers (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  bio text,
  status text not null default 'pending',
  city text,
  service_mode text,
  specialties text,
  target_levels text[] not null default '{}'::text[],
  license_number text,
  liability_insurance_expiry date,
  license_document_path text,
  insurance_document_path text,
  avatar_url text,
  qualifications text,
  instagram_url text,
  tiktok_url text,
  hourly_rate numeric(10,2),
  availability_status text not null default 'available',
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trainers_name_length check (char_length(btrim(name)) between 1 and 200),
  constraint trainers_email_length check (char_length(email) between 3 and 320),
  constraint trainers_status_valid check (status in ('pending', 'approved', 'rejected')),
  constraint trainers_service_mode_valid check (
    service_mode is null or service_mode in ('Vor Ort', 'Online', 'Hybrid')
  ),
  constraint trainers_target_levels_valid check (
    array_position(target_levels, null) is null
    and target_levels <@ array['Anfänger', 'Fortgeschritten', 'Profi']::text[]
  ),
  constraint trainers_hourly_rate_valid check (hourly_rate is null or hourly_rate > 0),
  constraint trainers_availability_status_valid check (
    availability_status in ('available', 'limited', 'unavailable')
  )
);

comment on column public.trainers.status is
  'Administrative Freigabe: pending, approved oder rejected. Nicht durch Trainer änderbar.';
comment on column public.trainers.specialties is
  'Kommagetrennter Bestand der in src/lib/constants.ts definierten Fachgebiete.';
comment on column public.trainers.target_levels is
  'Explizit betreute Niveaus für das Matching: Anfänger, Fortgeschritten, Profi.';

create index trainers_approved_name_idx
  on public.trainers (name, id)
  where status = 'approved';

create table public.trainer_offers (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  title text not null,
  type text not null,
  duration_minutes integer not null default 60,
  price numeric(10,2) not null,
  description text,
  is_active boolean not null default true,
  service_mode text not null,
  pricing_model text,
  included_sessions integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trainer_offers_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint trainer_offers_type_valid check (type in ('discovery', 'paid')),
  constraint trainer_offers_duration_valid check (duration_minutes > 0),
  constraint trainer_offers_price_valid check (
    (type = 'discovery' and price = 0)
    or (type = 'paid' and price > 0)
  ),
  constraint trainer_offers_service_mode_valid check (service_mode in ('Vor Ort', 'Online', 'Hybrid')),
  constraint trainer_offers_pricing_model_valid check (
    (type = 'discovery' and pricing_model is null)
    or (type = 'paid' and pricing_model in ('single_session', 'package', 'monthly'))
  ),
  constraint trainer_offers_included_sessions_valid check (
    (pricing_model = 'package' and included_sessions is not null and included_sessions > 0)
    or (pricing_model is distinct from 'package' and included_sessions is null)
  )
);

create index trainer_offers_trainer_active_created_idx
  on public.trainer_offers (trainer_id, is_active, created_at);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  trainer_id uuid not null references public.trainers(id) on delete restrict,
  offer_id uuid references public.trainer_offers(id) on delete set null,
  client_name text not null,
  client_email text not null,
  trainer_name text not null,
  offer_title text,
  message text not null,
  status text not null default 'new',
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status_changed_at timestamptz not null default now(),
  constraint inquiries_message_length check (char_length(message) between 10 and 1000),
  constraint inquiries_status_valid check (status in ('new', 'viewed', 'contacted', 'declined', 'closed')),
  constraint inquiries_client_idempotency_unique unique (client_id, idempotency_key)
);

comment on table public.inquiries is
  'Unverbindliche Lead-Anfragen mit personenbezogenen Momentaufnahmen. Kontolöschung wird bei vorhandenen Anfragen bis zu einer freigegebenen Aufbewahrungsentscheidung blockiert.';

create index inquiries_client_created_idx
  on public.inquiries (client_id, created_at desc);
create index inquiries_trainer_created_idx
  on public.inquiries (trainer_id, created_at desc);

create table public.inquiry_status_events (
  id bigint generated always as identity primary key,
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid not null references auth.users(id) on delete restrict,
  actor_role text not null,
  changed_at timestamptz not null default now(),
  constraint inquiry_status_events_from_valid check (
    from_status is null or from_status in ('new', 'viewed', 'contacted', 'declined', 'closed')
  ),
  constraint inquiry_status_events_to_valid check (
    to_status in ('new', 'viewed', 'contacted', 'declined', 'closed')
  ),
  constraint inquiry_status_events_actor_role_valid check (actor_role in ('client', 'trainer', 'admin'))
);

create index inquiry_status_events_inquiry_changed_idx
  on public.inquiry_status_events (inquiry_id, changed_at);
create index inquiry_status_events_changed_by_idx
  on public.inquiry_status_events (changed_by);

create or replace function verifit_private.try_timestamptz(value text)
returns timestamptz
language plpgsql
immutable
set search_path = ''
as $$
begin
  if value is null or btrim(value) = '' then
    return null;
  end if;
  return value::timestamptz;
exception when others then
  return null;
end;
$$;

create or replace function verifit_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function verifit_private.set_updated_at();
create trigger clients_set_updated_at
before update on public.clients
for each row execute function verifit_private.set_updated_at();
create trigger trainers_set_updated_at
before update on public.trainers
for each row execute function verifit_private.set_updated_at();
create trigger trainer_offers_set_updated_at
before update on public.trainer_offers
for each row execute function verifit_private.set_updated_at();
create trigger inquiries_set_updated_at
before update on public.inquiries
for each row execute function verifit_private.set_updated_at();

create or replace function verifit_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = (select auth.uid())
      and profile.role = 'admin'
  );
$$;

alter function verifit_private.is_admin() owner to postgres;
revoke all on function verifit_private.is_admin() from public, anon, authenticated;
grant execute on function verifit_private.is_admin() to authenticated, service_role;

create or replace function verifit_private.is_approved_trainer(p_trainer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trainers trainer
    where trainer.id = p_trainer_id
      and trainer.status = 'approved'
  );
$$;

create or replace function verifit_private.public_trainers()
returns table (
  id uuid,
  name text,
  bio text,
  city text,
  service_mode text,
  specialties text,
  target_levels text[],
  qualifications text,
  avatar_url text,
  instagram_url text,
  tiktok_url text,
  hourly_rate numeric,
  availability_status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    trainer.id,
    trainer.name,
    trainer.bio,
    trainer.city,
    trainer.service_mode,
    trainer.specialties,
    trainer.target_levels,
    trainer.qualifications,
    trainer.avatar_url,
    trainer.instagram_url,
    trainer.tiktok_url,
    trainer.hourly_rate,
    trainer.availability_status
  from public.trainers trainer
  where trainer.status = 'approved';
$$;

alter function verifit_private.is_approved_trainer(uuid) owner to postgres;
alter function verifit_private.public_trainers() owner to postgres;
revoke all on function verifit_private.is_approved_trainer(uuid) from public, anon, authenticated;
revoke all on function verifit_private.public_trainers() from public, anon, authenticated;
grant execute on function verifit_private.is_approved_trainer(uuid) to anon, authenticated, service_role;
grant execute on function verifit_private.public_trainers() to anon, authenticated, service_role;

create or replace function verifit_private.prevent_protected_trainer_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin')
     or (select verifit_private.is_admin()) then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.email is distinct from old.email
     or new.status is distinct from old.status
     or new.license_document_path is distinct from old.license_document_path
     or new.insurance_document_path is distinct from old.insurance_document_path
     or new.terms_accepted_at is distinct from old.terms_accepted_at
     or new.created_at is distinct from old.created_at then
    raise exception using errcode = '42501', message = 'TRAINER_PROTECTED_FIELD';
  end if;

  return new;
end;
$$;

create trigger trainers_protect_sensitive_fields
before update on public.trainers
for each row execute function verifit_private.prevent_protected_trainer_changes();

create or replace function verifit_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data ->> 'role', 'client');
  safe_role text := case when requested_role = 'trainer' then 'trainer' else 'client' end;
  safe_email text := lower(coalesce(new.email, ''));
  safe_name text := left(
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), nullif(safe_email, ''), 'VeriFit Nutzer'),
    200
  );
  accepted_at timestamptz := verifit_private.try_timestamptz(new.raw_user_meta_data ->> 'terms_accepted_at');
begin
  insert into public.profiles (id, role)
  values (new.id, safe_role);

  if safe_role = 'trainer' then
    insert into public.trainers (id, name, email, bio, status, terms_accepted_at)
    values (
      new.id,
      safe_name,
      safe_email,
      left(nullif(btrim(new.raw_user_meta_data ->> 'bio'), ''), 5000),
      'pending',
      accepted_at
    );
  else
    insert into public.clients (id, name, email, terms_accepted_at, health_consent_at)
    values (
      new.id,
      safe_name,
      safe_email,
      accepted_at,
      verifit_private.try_timestamptz(new.raw_user_meta_data ->> 'health_consent_at')
    );
  end if;

  return new;
end;
$$;

alter function verifit_private.handle_new_user() owner to postgres;
revoke all on function verifit_private.handle_new_user() from public, anon, authenticated, service_role;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function verifit_private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.clients enable row level security;
alter table public.clients force row level security;
alter table public.trainers enable row level security;
alter table public.trainers force row level security;
alter table public.trainer_offers enable row level security;
alter table public.trainer_offers force row level security;
alter table public.inquiries enable row level security;
alter table public.inquiries force row level security;
alter table public.inquiry_status_events enable row level security;
alter table public.inquiry_status_events force row level security;

create policy profiles_owner_select
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy clients_owner_select
on public.clients for select to authenticated
using ((select auth.uid()) = id);

create policy trainers_owner_admin_select
on public.trainers for select to authenticated
using ((select auth.uid()) = id or (select verifit_private.is_admin()));

create policy trainers_owner_update
on public.trainers for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy trainer_offers_public_active_select
on public.trainer_offers for select to anon, authenticated
using (
  is_active
  and (select verifit_private.is_approved_trainer(trainer_id))
);

create policy trainer_offers_owner_admin_select
on public.trainer_offers for select to authenticated
using ((select auth.uid()) = trainer_id or (select verifit_private.is_admin()));

create policy trainer_offers_owner_insert
on public.trainer_offers for insert to authenticated
with check ((select auth.uid()) = trainer_id);

create policy trainer_offers_owner_update
on public.trainer_offers for update to authenticated
using ((select auth.uid()) = trainer_id)
with check ((select auth.uid()) = trainer_id);

create policy inquiries_participant_admin_select
on public.inquiries for select to authenticated
using (
  (select auth.uid()) = client_id
  or (select auth.uid()) = trainer_id
  or (select verifit_private.is_admin())
);

create policy inquiry_status_events_participant_admin_select
on public.inquiry_status_events for select to authenticated
using (
  exists (
    select 1
    from public.inquiries inquiry
    where inquiry.id = inquiry_status_events.inquiry_id
      and (
        inquiry.client_id = (select auth.uid())
        or inquiry.trainer_id = (select auth.uid())
        or (select verifit_private.is_admin())
      )
  )
);

revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.clients from public, anon, authenticated;
revoke all on table public.trainers from public, anon, authenticated;
revoke all on table public.trainer_offers from public, anon, authenticated;
revoke all on table public.inquiries from public, anon, authenticated;
revoke all on table public.inquiry_status_events from public, anon, authenticated;

grant select on table public.profiles to authenticated;
grant select on table public.clients to authenticated;
grant select on table public.trainers to authenticated;
grant update (
  name, bio, city, service_mode, specialties, target_levels,
  avatar_url, license_number, liability_insurance_expiry
) on public.trainers to authenticated;

grant select on table public.trainer_offers to anon, authenticated;
grant insert (
  trainer_id, title, type, duration_minutes, price, description,
  service_mode, pricing_model, included_sessions
) on public.trainer_offers to authenticated;
grant update (
  title, type, duration_minutes, price, description, is_active,
  service_mode, pricing_model, included_sessions
) on public.trainer_offers to authenticated;

grant select on table public.inquiries to authenticated;
grant select on table public.inquiry_status_events to authenticated;

grant all on table public.profiles to service_role;
grant all on table public.clients to service_role;
grant all on table public.trainers to service_role;
grant all on table public.trainer_offers to service_role;
grant all on table public.inquiries to service_role;
grant all on table public.inquiry_status_events to service_role;
grant usage, select on sequence public.inquiry_status_events_id_seq to service_role;

create view public.trainers_public
with (security_invoker = true)
as
select * from verifit_private.public_trainers();

comment on view public.trainers_public is
  'Explizite öffentliche Whitelist ausschließlich administrativ freigegebener Trainer.';

revoke all on table public.trainers_public from public, anon, authenticated;
grant select on table public.trainers_public to anon, authenticated;

create or replace function public.create_inquiry(
  p_trainer_id uuid,
  p_offer_id uuid,
  p_message text,
  p_idempotency_key uuid
)
returns table (inquiry_id uuid, was_created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_id uuid := auth.uid();
  user_role text;
  client_name text;
  client_email text;
  trainer_name text;
  offer_title text;
  clean_message text := btrim(coalesce(p_message, ''));
  existing_inquiry public.inquiries%rowtype;
  new_inquiry_id uuid;
begin
  if user_id is null then
    raise exception using errcode = '42501', message = 'INQUIRY_UNAUTHENTICATED';
  end if;

  select profile.role into user_role
  from public.profiles profile
  where profile.id = user_id;

  if user_role is distinct from 'client' then
    raise exception using errcode = '42501', message = 'INQUIRY_CLIENT_ONLY';
  end if;

  if p_trainer_id is null or p_idempotency_key is null
     or char_length(clean_message) < 10 or char_length(clean_message) > 1000 then
    raise exception using errcode = '22023', message = 'INQUIRY_INVALID_INPUT';
  end if;

  select coalesce(nullif(btrim(client.name), ''), client.email), client.email
  into client_name, client_email
  from public.clients client
  where client.id = user_id;

  if not found then
    raise exception using errcode = '42501', message = 'INQUIRY_CLIENT_MISSING';
  end if;

  select coalesce(nullif(btrim(trainer.name), ''), 'Trainer')
  into trainer_name
  from public.trainers trainer
  where trainer.id = p_trainer_id
    and trainer.status = 'approved';

  if not found then
    raise exception using errcode = 'P0002', message = 'INQUIRY_TRAINER_UNAVAILABLE';
  end if;

  if p_offer_id is not null then
    select offer.title into offer_title
    from public.trainer_offers offer
    where offer.id = p_offer_id
      and offer.trainer_id = p_trainer_id
      and offer.is_active
      and (
        (offer.type = 'discovery' and offer.price = 0)
        or (offer.type = 'paid' and offer.price > 0)
      );

    if not found then
      raise exception using errcode = '22023', message = 'INQUIRY_OFFER_UNAVAILABLE';
    end if;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('verifit-inquiry:' || user_id::text, 0)
  );

  select inquiry.* into existing_inquiry
  from public.inquiries inquiry
  where inquiry.client_id = user_id
    and inquiry.idempotency_key = p_idempotency_key;

  if found then
    if existing_inquiry.trainer_id = p_trainer_id
       and existing_inquiry.offer_id is not distinct from p_offer_id
       and existing_inquiry.message = clean_message then
      return query select existing_inquiry.id, false;
      return;
    end if;
    raise exception using errcode = '22023', message = 'INQUIRY_IDEMPOTENCY_CONFLICT';
  end if;

  if (
    select count(*) from public.inquiries inquiry
    where inquiry.client_id = user_id
      and inquiry.created_at > now() - interval '1 hour'
  ) >= 5
  or (
    select count(*) from public.inquiries inquiry
    where inquiry.client_id = user_id
      and inquiry.created_at > now() - interval '24 hours'
  ) >= 20 then
    raise exception using errcode = 'P0001', message = 'INQUIRY_RATE_LIMIT';
  end if;

  insert into public.inquiries (
    client_id, trainer_id, offer_id, client_name, client_email,
    trainer_name, offer_title, message, idempotency_key
  ) values (
    user_id, p_trainer_id, p_offer_id, client_name, client_email,
    trainer_name, offer_title, clean_message, p_idempotency_key
  ) returning id into new_inquiry_id;

  insert into public.inquiry_status_events (
    inquiry_id, from_status, to_status, changed_by, actor_role
  ) values (new_inquiry_id, null, 'new', user_id, 'client');

  return query select new_inquiry_id, true;
end;
$$;

create or replace function public.transition_inquiry_status(
  p_inquiry_id uuid,
  p_status text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_id uuid := auth.uid();
  user_role text;
  inquiry_row public.inquiries%rowtype;
begin
  if user_id is null then
    raise exception using errcode = '42501', message = 'INQUIRY_UNAUTHENTICATED';
  end if;

  select profile.role into user_role
  from public.profiles profile
  where profile.id = user_id;

  if user_role is distinct from 'trainer' then
    raise exception using errcode = '42501', message = 'INQUIRY_TRAINER_ONLY';
  end if;

  if p_status is null or p_status not in ('new', 'viewed', 'contacted', 'declined', 'closed') then
    raise exception using errcode = '22023', message = 'INQUIRY_INVALID_STATUS';
  end if;

  select inquiry.* into inquiry_row
  from public.inquiries inquiry
  where inquiry.id = p_inquiry_id
  for update;

  if not found or inquiry_row.trainer_id is distinct from user_id then
    raise exception using errcode = 'P0002', message = 'INQUIRY_NOT_FOUND';
  end if;

  if inquiry_row.status = p_status then
    return inquiry_row.status;
  end if;

  if not (
    (inquiry_row.status = 'new' and p_status in ('viewed', 'declined', 'closed'))
    or (inquiry_row.status = 'viewed' and p_status in ('contacted', 'declined', 'closed'))
    or (inquiry_row.status = 'contacted' and p_status = 'closed')
    or (inquiry_row.status = 'declined' and p_status = 'closed')
  ) then
    raise exception using errcode = '22023', message = 'INQUIRY_INVALID_TRANSITION';
  end if;

  update public.inquiries
  set status = p_status,
      status_changed_at = now()
  where id = inquiry_row.id;

  insert into public.inquiry_status_events (
    inquiry_id, from_status, to_status, changed_by, actor_role
  ) values (inquiry_row.id, inquiry_row.status, p_status, user_id, 'trainer');

  return p_status;
end;
$$;

alter function public.create_inquiry(uuid, uuid, text, uuid) owner to postgres;
alter function public.transition_inquiry_status(uuid, text) owner to postgres;
revoke all on function public.create_inquiry(uuid, uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.transition_inquiry_status(uuid, text) from public, anon, authenticated;
grant execute on function public.create_inquiry(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.transition_inquiry_status(uuid, text) to authenticated;

create or replace function public.assert_user_deletion_allowed(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    raise exception using errcode = '22023', message = 'ACCOUNT_DELETION_INVALID_USER';
  end if;

  if exists (
    select 1
    from public.inquiries inquiry
    where inquiry.client_id = p_user_id or inquiry.trainer_id = p_user_id
  ) or exists (
    select 1
    from public.inquiry_status_events event
    where event.changed_by = p_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'ACCOUNT_DELETION_REQUIRES_INQUIRY_RETENTION_DECISION';
  end if;
end;
$$;

create or replace function public.delete_user_data(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_user_deletion_allowed(p_user_id);

  delete from public.trainer_offers where trainer_id = p_user_id;
  delete from public.trainers where id = p_user_id;
  delete from public.clients where id = p_user_id;
  delete from public.profiles where id = p_user_id;
end;
$$;

alter function public.assert_user_deletion_allowed(uuid) owner to postgres;
alter function public.delete_user_data(uuid) owner to postgres;
revoke all on function public.assert_user_deletion_allowed(uuid) from public, anon, authenticated;
revoke all on function public.delete_user_data(uuid) from public, anon, authenticated;
grant execute on function public.assert_user_deletion_allowed(uuid) to service_role;
grant execute on function public.delete_user_data(uuid) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('verification-docs', 'verification-docs', false, 10485760, array['application/pdf']::text[]);

create policy avatars_owner_select
on storage.objects for select to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy avatars_owner_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy avatars_owner_update
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy avatars_owner_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy verification_docs_owner_select
on storage.objects for select to authenticated
using (
  bucket_id = 'verification-docs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy verification_docs_owner_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'verification-docs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy verification_docs_owner_update
on storage.objects for update to authenticated
using (
  bucket_id = 'verification-docs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'verification-docs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy verification_docs_owner_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'verification-docs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

notify pgrst, 'reload schema';

commit;
