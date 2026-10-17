-- Minimal local Supabase platform contract for the Lead-MVP baseline tests.
-- This is a test fixture, not a migration and not a replacement for Supabase.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role supabase_admin nologin bypassrls;

create schema auth;
create schema storage;

create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

create or replace function auth.uid()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(pg_catalog.current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create table storage.buckets (
  id text primary key,
  name text not null unique,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets(id),
  name text not null,
  owner_id text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket_id, name)
);

create or replace function storage.foldername(name text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case
    when pg_catalog.strpos(name, '/') = 0 then '{}'::text[]
    else pg_catalog.string_to_array(
      pg_catalog.left(name, pg_catalog.length(name) - pg_catalog.strpos(pg_catalog.reverse(name), '/')),
      '/'
    )
  end;
$$;

alter table storage.objects enable row level security;
alter table storage.objects force row level security;

grant usage on schema auth, storage to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function storage.foldername(text) to anon, authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to anon, authenticated;
grant all on storage.buckets, storage.objects to service_role;
