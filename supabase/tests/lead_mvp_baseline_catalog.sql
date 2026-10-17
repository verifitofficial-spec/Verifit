-- Read-only catalog verification for the VeriFit Lead-MVP baseline.
-- Run only against a disposable local database after applying the baseline alone.

begin;

do $$
declare
  relation_name text;
  actual_columns text[];
  function_source text;
  function_record record;
begin
  foreach relation_name in array array[
    'profiles', 'clients', 'trainers', 'trainer_offers',
    'inquiries', 'inquiry_status_events', 'trainers_public'
  ]
  loop
    if to_regclass('public.' || relation_name) is null then
      raise exception 'Fehlendes MVP-Objekt: public.%', relation_name;
    end if;
  end loop;

  foreach relation_name in array array[
    'bookings', 'trainer_slots', 'messages', 'client_plans', 'client_trackings',
    'food_database', 'nutrition_plans', 'workout_plans', 'appointments'
  ]
  loop
    if to_regclass('public.' || relation_name) is not null then
      raise exception 'Nicht-MVP-Objekt vorhanden: public.%', relation_name;
    end if;
  end loop;

  if exists (
    select 1
    from pg_class class
    join pg_namespace namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and class.relname in (
        'profiles', 'clients', 'trainers', 'trainer_offers',
        'inquiries', 'inquiry_status_events'
      )
      and (not class.relrowsecurity or not class.relforcerowsecurity)
  ) then
    raise exception 'Mindestens eine öffentliche MVP-Tabelle hat RLS/FORCE RLS nicht vollständig aktiviert.';
  end if;

  select array_agg(column_name::text order by ordinal_position)
  into actual_columns
  from information_schema.columns
  where table_schema = 'public' and table_name = 'trainers_public';

  if actual_columns is distinct from array[
    'id', 'name', 'bio', 'city', 'service_mode', 'specialties', 'target_levels',
    'qualifications', 'avatar_url', 'instagram_url', 'tiktok_url',
    'hourly_rate', 'availability_status'
  ]::text[] then
    raise exception 'Öffentliche Trainer-Whitelist weicht ab: %', actual_columns;
  end if;

  if not exists (
    select 1
    from pg_class class
    join pg_namespace namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and class.relname = 'trainers_public'
      and class.relkind = 'v'
      and 'security_invoker=true' = any(coalesce(class.reloptions, '{}'::text[]))
  ) then
    raise exception 'trainers_public ist keine security_invoker-View.';
  end if;

  if has_column_privilege('authenticated', 'public.trainers', 'status', 'UPDATE')
     or has_column_privilege('authenticated', 'public.trainers', 'email', 'UPDATE')
     or has_column_privilege('authenticated', 'public.trainers', 'license_document_path', 'UPDATE')
     or has_column_privilege('authenticated', 'public.trainers', 'insurance_document_path', 'UPDATE') then
    raise exception 'Authenticated besitzt ein unerlaubtes UPDATE-Recht auf geschützte Trainerspalten.';
  end if;

  if not has_column_privilege('authenticated', 'public.trainers', 'name', 'UPDATE')
     or not has_column_privilege('authenticated', 'public.trainers', 'target_levels', 'UPDATE')
     or not has_column_privilege('authenticated', 'public.trainers', 'liability_insurance_expiry', 'UPDATE') then
    raise exception 'Erforderliche Trainer-UPDATE-Spaltenrechte fehlen.';
  end if;

  if has_any_column_privilege('anon', 'public.trainers', 'SELECT')
     or has_table_privilege('anon', 'public.trainers', 'SELECT') then
    raise exception 'Anon besitzt unerlaubten direkten Lesezugriff auf public.trainers.';
  end if;

  if (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'trainers'
      and policyname in ('trainers_owner_admin_select', 'trainers_owner_update')
  ) <> 2 then
    raise exception 'Private Trainer-Policy-Matrix ist unvollständig.';
  end if;

  if has_function_privilege('anon', 'public.create_inquiry(uuid,uuid,text,uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.create_inquiry(uuid,uuid,text,uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.assert_user_deletion_allowed(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.delete_user_data(uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.assert_user_deletion_allowed(uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.delete_user_data(uuid)', 'EXECUTE') then
    raise exception 'Funktionsrecht-Matrix weicht vom MVP-Sollzustand ab.';
  end if;

  for function_record in
    select namespace.nspname as schema_name,
           procedure.proname as function_name,
           procedure.prosecdef,
           procedure.proconfig,
           pg_get_userbyid(procedure.proowner) as owner_name
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where (namespace.nspname, procedure.proname) in (
      ('verifit_private', 'is_admin'),
      ('verifit_private', 'is_approved_trainer'),
      ('verifit_private', 'public_trainers'),
      ('verifit_private', 'handle_new_user'),
      ('public', 'create_inquiry'),
      ('public', 'transition_inquiry_status'),
      ('public', 'assert_user_deletion_allowed'),
      ('public', 'delete_user_data')
    )
  loop
    if not function_record.prosecdef
       or function_record.owner_name <> 'postgres'
       or not coalesce(function_record.proconfig, '{}'::text[]) @> array['search_path=""']::text[] then
      raise exception 'Privilegierte Funktion %.% ist nicht sicher konfiguriert.',
        function_record.schema_name, function_record.function_name;
    end if;
  end loop;

  if (
    select count(*)
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where (namespace.nspname, procedure.proname) in (
      ('verifit_private', 'is_admin'),
      ('verifit_private', 'is_approved_trainer'),
      ('verifit_private', 'public_trainers'),
      ('verifit_private', 'handle_new_user'),
      ('public', 'create_inquiry'),
      ('public', 'transition_inquiry_status'),
      ('public', 'assert_user_deletion_allowed'),
      ('public', 'delete_user_data')
    )
  ) <> 8 then
    raise exception 'Mindestens eine erwartete privilegierte Funktion fehlt.';
  end if;

  select pg_get_functiondef('verifit_private.handle_new_user()'::regprocedure)
  into function_source;
  if function_source not like '%requested_role = ''trainer''%'
     or function_source like '%requested_role = ''admin''%' then
    raise exception 'Signup-Rollenwhitelist ist nicht nachweisbar sicher.';
  end if;

  if (select count(*) from storage.buckets where id = 'avatars' and public) <> 1
     or (select count(*) from storage.buckets where id = 'verification-docs' and not public) <> 1 then
    raise exception 'Storage-Bucket-Konfiguration weicht ab.';
  end if;

  if (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'avatars_owner_select', 'avatars_owner_insert', 'avatars_owner_update', 'avatars_owner_delete',
        'verification_docs_owner_select', 'verification_docs_owner_insert',
        'verification_docs_owner_update', 'verification_docs_owner_delete'
      )
  ) <> 8 then
    raise exception 'Storage-Policy-Matrix ist unvollständig.';
  end if;

  if to_regprocedure('public.assert_user_deletion_allowed(uuid)') is null
     or to_regprocedure('public.delete_user_data(uuid)') is null then
    raise exception 'Kontolöschungsfunktionen fehlen.';
  end if;
end $$;

rollback;
