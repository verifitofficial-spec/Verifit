-- Preserve registration data when Supabase requires email confirmation.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text;
  requested_name text;
  requested_bio text;
begin
  requested_role := case
    when new.raw_user_meta_data ->> 'role' in ('client', 'trainer') then new.raw_user_meta_data ->> 'role'
    else 'client'
  end;
  requested_name := nullif(trim(new.raw_user_meta_data ->> 'name'), '');
  requested_bio := nullif(trim(new.raw_user_meta_data ->> 'bio'), '');

  insert into public.profiles (id, email, role)
  values (new.id, new.email, requested_role)
  on conflict (id) do update set email = excluded.email;

  if requested_role = 'trainer' then
    insert into public.trainers (id, email, name, bio, status)
    values (new.id, new.email, requested_name, requested_bio, 'pending')
    on conflict (id) do update set
      email = excluded.email,
      name = coalesce(public.trainers.name, excluded.name),
      bio = coalesce(public.trainers.bio, excluded.bio);
  else
    insert into public.clients (id, email, name)
    values (new.id, new.email, coalesce(requested_name, split_part(new.email, '@', 1), 'Kunde'))
    on conflict (id) do update set
      email = excluded.email,
      name = coalesce(public.clients.name, excluded.name);
  end if;
  return new;
end;
$$;
