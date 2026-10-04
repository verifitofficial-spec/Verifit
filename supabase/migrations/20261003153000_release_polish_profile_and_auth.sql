-- VeriFit Phase: release-polish
-- Staging-only migration. No destructive column drops.
-- Rollback hint: remove the added columns/policies/bucket only after a data export and review.

alter table public.trainers
  add column if not exists avatar_url text,
  add column if not exists hourly_rate numeric,
  add column if not exists qualifications text,
  add column if not exists slug text,
  add column if not exists stripe_account_id text,
  add column if not exists charges_enabled boolean not null default false;

create unique index if not exists trainers_slug_unique_idx
  on public.trainers (slug)
  where slug is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']::text[])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar public read" on storage.objects;
create policy "Avatar public read"
on storage.objects for select
to public
using (bucket_id = 'avatars');

drop policy if exists "Avatar owner upload" on storage.objects;
create policy "Avatar owner upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Avatar owner update" on storage.objects;
create policy "Avatar owner update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Avatar owner delete" on storage.objects;
create policy "Avatar owner delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- Signup is the single source of truth for the role-specific row.
-- Only client/trainer are accepted from metadata; admin can never be self-created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text;
begin
  requested_role := case
    when new.raw_user_meta_data ->> 'role' in ('client', 'trainer')
      then new.raw_user_meta_data ->> 'role'
    else 'client'
  end;

  insert into public.profiles (id, email, role)
  values (new.id, new.email, requested_role)
  on conflict (id) do update set email = excluded.email;

  if requested_role = 'trainer' then
    insert into public.trainers (id, email, status)
    values (new.id, new.email, 'pending')
    on conflict (id) do nothing;
  else
    insert into public.clients (id, email, name)
    values (new.id, new.email, coalesce(split_part(new.email, '@', 1), 'Kunde'))
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

comment on column public.trainers.avatar_url is 'Public avatar URL from the avatars bucket';
comment on column public.trainers.stripe_account_id is 'Stripe Connect Express account ID; test mode in staging';
comment on column public.trainers.charges_enabled is 'Updated from Stripe account.updated webhook';
