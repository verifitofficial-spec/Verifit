-- VeriFit: Least-Privilege für public.trainers und public.trainer_offers.
--
-- WICHTIG:
-- 1. Erst nach 20261011170000_quiz_matching_offer_metadata.sql ausführen.
-- 2. Die zugehörige App-Version und diese Migration in einem koordinierten
--    Wartungsfenster ausrollen. Die App nutzt trainers_public und den serverseitigen
--    Endpunkt für Dokumentpfade. Nur SQLSTATE 42P01 erlaubt vorübergehend den
--    Tabellen-Fallback; PGRST205 schlägt absichtlich geschlossen fehl.
-- 3. Diese Migration verändert keine Nutzdaten. Unerwartete Policies, geerbte
--    Rollenrechte, bestehende gleichnamige Objekte oder fehlende App-Spalten führen
--    vor den dauerhaften Änderungen zu einem atomaren Abbruch.
-- 4. Die Migration setzt PostgreSQL 15+ voraus, weil security_invoker für Views erst
--    dort unterstützt wird. Live-Version, Auth-Trigger und Funktionsdefinitionen
--    müssen zusätzlich gemäß Rollout-Dokument manuell bestätigt werden.

begin;

do $$
declare
  missing_columns text;
  unexpected_policies text;
  inherited_privileges text;
  existing_view_oid oid;
  existing_function_oid oid;
  trainers_policy_names text[];
  offers_policy_names text[];
begin
  if current_setting('server_version_num')::integer < 150000 then
    raise exception 'Sicherheitsmigration abgebrochen: PostgreSQL 15 oder neuer ist für security_invoker erforderlich (gefunden: %).',
      current_setting('server_version');
  end if;

  if to_regclass('public.trainers') is null or to_regclass('public.trainer_offers') is null then
    raise exception 'Sicherheitsmigration abgebrochen: trainers oder trainer_offers fehlt.';
  end if;

  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('trainers', 'trainer_offers')
      and c.relkind not in ('r', 'p')
  ) then
    raise exception 'Sicherheitsmigration abgebrochen: trainers oder trainer_offers ist keine Tabelle/partitionierte Tabelle.';
  end if;

  if not exists (select 1 from pg_roles where rolname = 'postgres')
     or not exists (select 1 from pg_roles where rolname = 'anon')
     or not exists (select 1 from pg_roles where rolname = 'authenticated')
     or not exists (select 1 from pg_roles where rolname = 'service_role') then
    raise exception 'Sicherheitsmigration abgebrochen: mindestens eine erwartete Supabase-Rolle fehlt (postgres, anon, authenticated, service_role).';
  end if;

  if current_user <> 'postgres' then
    raise exception 'Sicherheitsmigration abgebrochen: Ausführung muss als postgres erfolgen (aktuell: %), damit View-/Funktions-Owner deterministisch sind.', current_user;
  end if;

  if to_regprocedure('public.is_admin()') is null then
    raise exception 'Sicherheitsmigration abgebrochen: public.is_admin() fehlt.';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'is_admin'
      and p.pronargs = 0
      and p.prorettype = 'boolean'::regtype
      and p.prosecdef
      and p.provolatile = 's'
      and pg_get_userbyid(p.proowner) = 'postgres'
      and exists (
        select 1
        from unnest(coalesce(p.proconfig, '{}'::text[])) as settings(setting)
        where setting = 'search_path=public'
      )
  ) then
    raise exception 'Sicherheitsmigration abgebrochen: public.is_admin() hat nicht die erwartete Signatur, Stabilität, SECURITY-DEFINER-Einstellung, search_path oder den Owner postgres.';
  end if;

  if has_schema_privilege('anon', 'public', 'CREATE')
     or has_schema_privilege('authenticated', 'public', 'CREATE')
     or exists (
       select 1
       from pg_namespace n
       cross join lateral aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) acl
       where n.nspname = 'public'
         and acl.grantee = 0
         and acl.privilege_type = 'CREATE'
     ) then
    raise exception 'Sicherheitsmigration abgebrochen: PUBLIC, anon oder authenticated hat CREATE auf Schema public; SECURITY-DEFINER-Aufrufe wären nicht ausreichend gegen Object-Hijacking abgesichert.';
  end if;

  -- Der Browser führt bei der Registrierung keinen INSERT auf trainers aus. Deshalb
  -- muss ein aktiver SECURITY-DEFINER-Trigger auf auth.users vorhanden sein. Ob sein
  -- Funktionskörper Rollen whitelisted und trainers/clients korrekt anlegt, lässt sich
  -- nicht zuverlässig syntaktisch beweisen und bleibt eine manuelle Vorabprüfung.
  if to_regprocedure('public.handle_new_user()') is null then
    raise exception 'Sicherheitsmigration abgebrochen: public.handle_new_user() fehlt; Registrierung ohne direkte trainers-INSERT-Rechte wäre nicht verifiziert.';
  end if;

  if not exists (
    select 1
    from pg_proc p
    where p.oid = to_regprocedure('public.handle_new_user()')
      and p.prorettype = 'trigger'::regtype
      and p.prosecdef
      and pg_get_userbyid(p.proowner) = 'postgres'
      and exists (
        select 1
        from unnest(coalesce(p.proconfig, '{}'::text[])) as settings(setting)
        where setting in ('search_path=', 'search_path=""')
      )
  ) then
    raise exception 'Sicherheitsmigration abgebrochen: public.handle_new_user() ist nicht die erwartete SECURITY-DEFINER-Triggerfunktion mit Owner postgres und leerem search_path.';
  end if;

  -- AFTER INSERT ON auth.users FOR EACH ROW, exakt der verifizierte Trigger.
  -- tgtype = ROW (1) + INSERT (4); AFTER hat kein zusätzliches Bit.
  if to_regclass('auth.users') is null or (
    select count(*)
    from pg_trigger t
    where t.tgrelid = 'auth.users'::regclass
      and t.tgname = 'on_auth_user_created'
      and t.tgfoid = to_regprocedure('public.handle_new_user()')
      and not t.tgisinternal
      and t.tgenabled = 'O'
      and t.tgtype = 5
  ) <> 1 then
    raise exception 'Sicherheitsmigration abgebrochen: on_auth_user_created ist nicht exakt als aktiver AFTER INSERT FOR EACH ROW-Trigger auf auth.users für public.handle_new_user() vorhanden.';
  end if;

  if to_regprocedure('public.prevent_protected_profile_changes()') is null or not exists (
    select 1
    from pg_proc p
    where p.oid = to_regprocedure('public.prevent_protected_profile_changes()')
      and p.prorettype = 'trigger'::regtype
      and p.prosecdef
      and pg_get_userbyid(p.proowner) = 'postgres'
      and exists (
        select 1
        from unnest(coalesce(p.proconfig, '{}'::text[])) as settings(setting)
        where setting = 'search_path=public'
      )
  ) then
    raise exception 'Sicherheitsmigration abgebrochen: public.prevent_protected_profile_changes() hat nicht den verifizierten Owner, Sicherheitsmodus oder search_path.';
  end if;

  -- BEFORE UPDATE ON public.trainers FOR EACH ROW, exakt der bestehende
  -- Defense-in-Depth-Trigger. tgtype = ROW (1) + BEFORE (2) + UPDATE (16).
  if (
    select count(*)
    from pg_trigger t
    where t.tgrelid = 'public.trainers'::regclass
      and t.tgname = 'protect_trainer_profile'
      and t.tgfoid = to_regprocedure('public.prevent_protected_profile_changes()')
      and not t.tgisinternal
      and t.tgenabled = 'O'
      and t.tgtype = 19
  ) <> 1 then
    raise exception 'Sicherheitsmigration abgebrochen: protect_trainer_profile ist nicht exakt als aktiver BEFORE UPDATE FOR EACH ROW-Trigger auf public.trainers vorhanden.';
  end if;

  select string_agg(required.column_name, ', ' order by required.column_name)
    into missing_columns
  from unnest(array[
    'id', 'name', 'email', 'bio', 'status', 'city', 'service_mode', 'specialties',
    'target_levels', 'license_number', 'liability_insurance_expiry',
    'license_document_path', 'insurance_document_path', 'avatar_url',
    'stripe_account_id', 'charges_enabled', 'qualifications', 'instagram_url',
    'tiktok_url', 'hourly_rate', 'availability_status'
  ]::text[]) as required(column_name)
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'trainers'
      and c.column_name = required.column_name
  );
  if missing_columns is not null then
    raise exception 'Sicherheitsmigration abgebrochen; trainers-Spalten fehlen: %', missing_columns;
  end if;

  select string_agg(required.column_name, ', ' order by required.column_name)
    into missing_columns
  from unnest(array[
    'id', 'trainer_id', 'title', 'type', 'duration_minutes', 'price', 'description',
    'is_active', 'created_at', 'service_mode', 'pricing_model', 'included_sessions'
  ]::text[]) as required(column_name)
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'trainer_offers'
      and c.column_name = required.column_name
  );
  if missing_columns is not null then
    raise exception 'Sicherheitsmigration abgebrochen; trainer_offers-Spalten fehlen: %', missing_columns;
  end if;

  select array_agg(policyname::text order by policyname)
    into trainers_policy_names
  from pg_policies
  where schemaname = 'public' and tablename = 'trainers';

  if trainers_policy_names is distinct from array[
       'trainers_admin_update', 'trainers_owner_update', 'trainers_public_read_approved'
     ]::text[]
     and trainers_policy_names is distinct from array[
       'trainers_admin_update', 'trainers_owner_admin_read', 'trainers_owner_update'
     ]::text[] then
    raise exception 'Sicherheitsmigration abgebrochen; trainers-Policy-Matrix ist weder der verifizierte Ausgangs- noch der verwaltete Zielzustand: %', trainers_policy_names;
  end if;

  if trainers_policy_names = array[
       'trainers_admin_update', 'trainers_owner_update', 'trainers_public_read_approved'
     ]::text[] then
    select string_agg(expected.policy_name, ', ' order by expected.policy_name)
      into unexpected_policies
    from (values
      (
        'trainers_admin_update', 'PERMISSIVE', array['authenticated']::text[], 'UPDATE',
        'public.is_admin()', 'public.is_admin()'
      ),
      (
        'trainers_owner_update', 'PERMISSIVE', array['authenticated']::text[], 'UPDATE',
        '(auth.uid() = id)', '(auth.uid() = id)'
      ),
      (
        'trainers_public_read_approved', 'PERMISSIVE', array['anon', 'authenticated']::text[], 'SELECT',
        '(status = ''approved''::text)', ''
      )
    ) as expected(policy_name, permissive_mode, role_names, command_name, expected_qual, expected_check)
    left join pg_policies p
      on p.schemaname = 'public'
     and p.tablename = 'trainers'
     and p.policyname = expected.policy_name
    where p.policyname is null
       or p.permissive is distinct from expected.permissive_mode
       or array(
            select role_name::text
            from unnest(p.roles) as policy_role(role_name)
            order by role_name::text
          ) is distinct from expected.role_names
       or p.cmd is distinct from expected.command_name
       or replace(regexp_replace(coalesce(p.qual, ''), '[[:space:]]+', '', 'g'), 'public.', '')
            is distinct from replace(regexp_replace(expected.expected_qual, '[[:space:]]+', '', 'g'), 'public.', '')
       or replace(regexp_replace(coalesce(p.with_check, ''), '[[:space:]]+', '', 'g'), 'public.', '')
            is distinct from replace(regexp_replace(expected.expected_check, '[[:space:]]+', '', 'g'), 'public.', '');

    if unexpected_policies is not null then
      raise exception 'Sicherheitsmigration abgebrochen: Definition der verifizierten trainers-Ausgangspolicies weicht ab: %.', unexpected_policies;
    end if;
  else
    select string_agg(expected.policy_name, ', ' order by expected.policy_name)
      into unexpected_policies
    from (values
      (
        'trainers_owner_admin_read', 'PERMISSIVE', array['authenticated']::text[], 'SELECT',
        '((auth.uid() = id) OR public.is_admin())', ''
      ),
      (
        'trainers_owner_update', 'PERMISSIVE', array['authenticated']::text[], 'UPDATE',
        '(auth.uid() = id)', '(auth.uid() = id)'
      ),
      (
        'trainers_admin_update', 'PERMISSIVE', array['authenticated']::text[], 'UPDATE',
        'public.is_admin()', 'public.is_admin()'
      )
    ) as expected(policy_name, permissive_mode, role_names, command_name, expected_qual, expected_check)
    left join pg_policies p
      on p.schemaname = 'public'
     and p.tablename = 'trainers'
     and p.policyname = expected.policy_name
    where p.policyname is null
       or p.permissive is distinct from expected.permissive_mode
       or array(
            select role_name::text
            from unnest(p.roles) as policy_role(role_name)
            order by role_name::text
          ) is distinct from expected.role_names
       or p.cmd is distinct from expected.command_name
       or replace(regexp_replace(coalesce(p.qual, ''), '[[:space:]]+', '', 'g'), 'public.', '')
            is distinct from replace(regexp_replace(expected.expected_qual, '[[:space:]]+', '', 'g'), 'public.', '')
       or replace(regexp_replace(coalesce(p.with_check, ''), '[[:space:]]+', '', 'g'), 'public.', '')
            is distinct from replace(regexp_replace(expected.expected_check, '[[:space:]]+', '', 'g'), 'public.', '');

    if unexpected_policies is not null then
      raise exception 'Sicherheitsmigration abgebrochen: Definition der verwalteten trainers-Zielpolicies weicht ab: %.', unexpected_policies;
    end if;
  end if;

  select string_agg(policyname, ', ' order by policyname)
    into unexpected_policies
  from pg_policies
  where schemaname = 'public'
    and tablename = 'trainers'
    and not (policyname = any (array[
      'trainers_admin_update',
      'trainers_owner_update',
      'trainers_public_read_approved',
      'trainers_owner_admin_read'
    ]::text[]));
  if unexpected_policies is not null then
    raise exception 'Sicherheitsmigration abgebrochen; unerwartete trainers-Policies: %', unexpected_policies;
  end if;

  select array_agg(policyname::text order by policyname)
    into offers_policy_names
  from pg_policies
  where schemaname = 'public' and tablename = 'trainer_offers';

  if offers_policy_names is distinct from array['offers_read', 'offers_trainer_write']::text[]
     and offers_policy_names is distinct from array[
       'offers_owner_admin_read', 'offers_owner_insert', 'offers_owner_update', 'offers_public_read'
     ]::text[] then
    raise exception 'Sicherheitsmigration abgebrochen; trainer_offers-Policy-Matrix ist weder der verifizierte Ausgangs- noch der verwaltete Zielzustand: %', offers_policy_names;
  end if;

  if offers_policy_names = array['offers_read', 'offers_trainer_write']::text[] then
    select string_agg(expected.policy_name, ', ' order by expected.policy_name)
      into unexpected_policies
    from (values
      (
        'offers_read', 'PERMISSIVE', array['public']::text[], 'SELECT',
        $policy$((is_active AND (EXISTS ( SELECT 1
           FROM public.trainers t
          WHERE ((t.id = trainer_offers.trainer_id) AND (t.status = 'approved'::text))))) OR (auth.uid() = trainer_id) OR public.is_admin())$policy$,
        ''
      ),
      (
        'offers_trainer_write', 'PERMISSIVE', array['authenticated']::text[], 'ALL',
        '(auth.uid() = trainer_id)', '(auth.uid() = trainer_id)'
      )
    ) as expected(policy_name, permissive_mode, role_names, command_name, expected_qual, expected_check)
    left join pg_policies p
      on p.schemaname = 'public'
     and p.tablename = 'trainer_offers'
     and p.policyname = expected.policy_name
    where p.policyname is null
       or p.permissive is distinct from expected.permissive_mode
       or array(
            select role_name::text
            from unnest(p.roles) as policy_role(role_name)
            order by role_name::text
          ) is distinct from expected.role_names
       or p.cmd is distinct from expected.command_name
       or replace(regexp_replace(coalesce(p.qual, ''), '[[:space:]]+', '', 'g'), 'public.', '')
            is distinct from replace(regexp_replace(expected.expected_qual, '[[:space:]]+', '', 'g'), 'public.', '')
       or replace(regexp_replace(coalesce(p.with_check, ''), '[[:space:]]+', '', 'g'), 'public.', '')
            is distinct from replace(regexp_replace(expected.expected_check, '[[:space:]]+', '', 'g'), 'public.', '');

    if unexpected_policies is not null then
      raise exception 'Sicherheitsmigration abgebrochen: Definition der verifizierten trainer_offers-Ausgangspolicies weicht ab: %.', unexpected_policies;
    end if;
  else
    select string_agg(expected.policy_name, ', ' order by expected.policy_name)
      into unexpected_policies
    from (values
      (
        'offers_public_read', 'PERMISSIVE', array['anon', 'authenticated']::text[], 'SELECT',
        '((is_active = true) AND public.is_approved_trainer(trainer_id))', ''
      ),
      (
        'offers_owner_admin_read', 'PERMISSIVE', array['authenticated']::text[], 'SELECT',
        '((auth.uid() = trainer_id) OR public.is_admin())', ''
      ),
      (
        'offers_owner_insert', 'PERMISSIVE', array['authenticated']::text[], 'INSERT',
        '', '(auth.uid() = trainer_id)'
      ),
      (
        'offers_owner_update', 'PERMISSIVE', array['authenticated']::text[], 'UPDATE',
        '(auth.uid() = trainer_id)', '(auth.uid() = trainer_id)'
      )
    ) as expected(policy_name, permissive_mode, role_names, command_name, expected_qual, expected_check)
    left join pg_policies p
      on p.schemaname = 'public'
     and p.tablename = 'trainer_offers'
     and p.policyname = expected.policy_name
    where p.policyname is null
       or p.permissive is distinct from expected.permissive_mode
       or array(
            select role_name::text
            from unnest(p.roles) as policy_role(role_name)
            order by role_name::text
          ) is distinct from expected.role_names
       or p.cmd is distinct from expected.command_name
       or replace(regexp_replace(coalesce(p.qual, ''), '[[:space:]]+', '', 'g'), 'public.', '')
            is distinct from replace(regexp_replace(expected.expected_qual, '[[:space:]]+', '', 'g'), 'public.', '')
       or replace(regexp_replace(coalesce(p.with_check, ''), '[[:space:]]+', '', 'g'), 'public.', '')
            is distinct from replace(regexp_replace(expected.expected_check, '[[:space:]]+', '', 'g'), 'public.', '');

    if unexpected_policies is not null then
      raise exception 'Sicherheitsmigration abgebrochen: Definition der verwalteten trainer_offers-Zielpolicies weicht ab: %.', unexpected_policies;
    end if;
  end if;

  select string_agg(policyname, ', ' order by policyname)
    into unexpected_policies
  from pg_policies
  where schemaname = 'public'
    and tablename = 'trainer_offers'
    and not (policyname = any (array[
      'offers_read',
      'offers_public_read',
      'offers_owner_admin_read',
      'offers_trainer_write',
      'offers_owner_insert',
      'offers_owner_update'
    ]::text[]));
  if unexpected_policies is not null then
    raise exception 'Sicherheitsmigration abgebrochen; unerwartete trainer_offers-Policies: %', unexpected_policies;
  end if;

  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('trainers', 'trainer_offers')
      and not c.relrowsecurity
  ) then
    raise exception 'Sicherheitsmigration abgebrochen: RLS ist auf trainers oder trainer_offers nicht aktiviert.';
  end if;

  -- PUBLIC-Rechte werden später gezielt nur auf diesen Objekten entfernt. Rechte
  -- anderer Rollen dürfen anon/authenticated aber nicht über Rollenmitgliedschaften
  -- erben; solche unbekannten Abhängigkeiten werden vor jeder Änderung abgebrochen.
  select string_agg(
           format('%I.%I: %I über Rolle %I', schema_name, relation_name, privilege_type, grantee_name),
           ', ' order by schema_name, relation_name, grantee_name, privilege_type
         )
    into inherited_privileges
  from (
    select distinct
      n.nspname as schema_name,
      c.relname as relation_name,
      acl.privilege_type,
      grantee.rolname as grantee_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
    join pg_roles grantee on grantee.oid = acl.grantee
    where n.nspname = 'public'
      and c.relname in ('trainers', 'trainer_offers', 'trainers_public')
      and grantee.rolname not in ('anon', 'authenticated')
      and (
        pg_has_role('anon', grantee.oid, 'USAGE')
        or pg_has_role('authenticated', grantee.oid, 'USAGE')
      )

    union

    select distinct
      n.nspname,
      c.relname,
      acl.privilege_type,
      grantee.rolname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    cross join lateral aclexplode(coalesce(a.attacl, '{}'::aclitem[])) acl
    join pg_roles grantee on grantee.oid = acl.grantee
    where n.nspname = 'public'
      and c.relname in ('trainers', 'trainer_offers', 'trainers_public')
      and grantee.rolname not in ('anon', 'authenticated')
      and (
        pg_has_role('anon', grantee.oid, 'USAGE')
        or pg_has_role('authenticated', grantee.oid, 'USAGE')
      )
  ) inherited;
  if inherited_privileges is not null then
    raise exception 'Sicherheitsmigration abgebrochen; anon/authenticated erben Rechte aus unerwarteten Rollen: %', inherited_privileges;
  end if;

  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('trainers', 'trainer_offers')
      and (
        pg_has_role('anon', c.relowner, 'USAGE')
        or pg_has_role('authenticated', c.relowner, 'USAGE')
      )
  ) then
    raise exception 'Sicherheitsmigration abgebrochen: anon oder authenticated erbt Eigentümerrechte auf trainers/trainer_offers.';
  end if;

  select c.oid
    into existing_view_oid
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'trainers_public';

  if existing_view_oid is not null then
    if (select relkind from pg_class where oid = existing_view_oid) <> 'v' then
      raise exception 'Sicherheitsmigration abgebrochen: public.trainers_public existiert, ist aber keine normale View.';
    end if;
    if obj_description(existing_view_oid, 'pg_class') is distinct from
       'VeriFit managed trainers_public v1: nur freigegebene Trainer und explizit öffentliche Profilspalten.' then
      raise exception 'Sicherheitsmigration abgebrochen: public.trainers_public existiert mit unbekannter Herkunft/Definition; vorab manuell prüfen.';
    end if;
  end if;

  select p.oid
    into existing_function_oid
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'is_approved_trainer'
    and p.proargtypes = '2950'::oidvector;

  if existing_function_oid is not null then
    if obj_description(existing_function_oid, 'pg_proc') is distinct from
       'VeriFit managed is_approved_trainer(uuid) v1 für öffentliche Angebots-Policies.' then
      raise exception 'Sicherheitsmigration abgebrochen: public.is_approved_trainer(uuid) existiert mit unbekannter Herkunft/Definition.';
    end if;

    if exists (
      select 1
      from pg_proc p
      where p.oid = existing_function_oid
        and (
          p.prorettype <> 'boolean'::regtype
          or not p.prosecdef
          or p.provolatile <> 's'
          or pg_get_userbyid(p.proowner) <> 'postgres'
          or not exists (
            select 1
            from unnest(coalesce(p.proconfig, '{}'::text[])) as settings(setting)
            where setting in ('search_path=', 'search_path=""')
          )
          or regexp_replace(p.prosrc, '[[:space:]]+', '', 'g') <>
             regexp_replace($expected$
               select exists (
                 select 1
                 from public.trainers t
                 where t.id = p_trainer_id and t.status = 'approved'
               );
             $expected$, '[[:space:]]+', '', 'g')
        )
    ) then
      raise exception 'Sicherheitsmigration abgebrochen: verwaltete public.is_approved_trainer(uuid) hat eine unerwartete Definition, Option oder einen unerwarteten Owner.';
    end if;
  end if;
end $$;

-- Eine temporäre Referenz-View ermöglicht einen kanonischen Vergleich über
-- pg_get_viewdef(). Dadurch wird eine nachträglich veränderte, aber noch mit dem
-- VeriFit-Kommentar markierte View ebenfalls vor den dauerhaften Änderungen erkannt.
create temporary view verifit_expected_trainers_public as
select
  id,
  name,
  bio,
  city,
  service_mode,
  specialties,
  target_levels,
  avatar_url,
  qualifications,
  hourly_rate,
  instagram_url,
  tiktok_url,
  availability_status
from public.trainers
where status = 'approved';

do $$
declare
  existing_view_oid oid := to_regclass('public.trainers_public');
  expected_view_oid oid := to_regclass('pg_temp.verifit_expected_trainers_public');
  view_options text[];
begin
  if existing_view_oid is null then
    return;
  end if;

  select coalesce(c.reloptions, '{}'::text[])
    into view_options
  from pg_class c
  where c.oid = existing_view_oid;

  if pg_get_viewdef(existing_view_oid, false) <> pg_get_viewdef(expected_view_oid, false) then
    raise exception 'Sicherheitsmigration abgebrochen: public.trainers_public hat trotz VeriFit-Markierung eine unerwartete Definition.';
  end if;
  if not ('security_barrier=true' = any (view_options)) then
    raise exception 'Sicherheitsmigration abgebrochen: bestehende public.trainers_public hat security_barrier nicht aktiviert.';
  end if;
  if 'security_invoker=true' = any (view_options)
     or not ('security_invoker=false' = any (view_options)) then
    raise exception 'Sicherheitsmigration abgebrochen: bestehende public.trainers_public ist security_invoker oder legt den Modus nicht explizit fest.';
  end if;
  if (select pg_get_userbyid(relowner) from pg_class where oid = existing_view_oid) <> 'postgres' then
    raise exception 'Sicherheitsmigration abgebrochen: bestehende public.trainers_public gehört nicht postgres.';
  end if;
end $$;

-- Öffentliche Projektion: Die View läuft ausdrücklich mit Owner-Rechten
-- (security_invoker=false), enthält nur freigegebene Zeilen und nur die für Liste,
-- Profil, Quiz und Kontaktanzeige benötigten Spalten. RLS allein kann keine Spalten
-- aus einer ansonsten sichtbaren Zeile verbergen.
create or replace view public.trainers_public
with (security_barrier = true, security_invoker = false)
as
select
  id,
  name,
  bio,
  city,
  service_mode,
  specialties,
  target_levels,
  avatar_url,
  qualifications,
  hourly_rate,
  instagram_url,
  tiktok_url,
  availability_status
from public.trainers
where status = 'approved';

alter view public.trainers_public owner to postgres;
comment on view public.trainers_public is
  'VeriFit managed trainers_public v1: nur freigegebene Trainer und explizit öffentliche Profilspalten.';

revoke all privileges on table public.trainers_public from public, anon, authenticated;
grant select on table public.trainers_public to anon, authenticated;

-- Die Hilfsfunktion verhindert, dass die öffentliche Angebots-Policy selbst
-- SELECT-Rechte auf der sensiblen Basistabelle trainers benötigt.
create or replace function public.is_approved_trainer(p_trainer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trainers t
    where t.id = p_trainer_id and t.status = 'approved'
  );
$$;

alter function public.is_approved_trainer(uuid) owner to postgres;
comment on function public.is_approved_trainer(uuid) is
  'VeriFit managed is_approved_trainer(uuid) v1 für öffentliche Angebots-Policies.';
revoke all on function public.is_approved_trainer(uuid) from public, anon, authenticated;
grant execute on function public.is_approved_trainer(uuid) to anon, authenticated, service_role;

-- Bekannte Policies vollständig und deterministisch ersetzen. Permissive Policies
-- werden mit OR kombiniert; deshalb darf keine alte öffentliche Policy parallel
-- bestehen bleiben.
drop policy if exists trainers_public_read_approved on public.trainers;
drop policy if exists trainers_owner_admin_read on public.trainers;
drop policy if exists trainers_owner_update on public.trainers;
drop policy if exists trainers_admin_update on public.trainers;

create policy trainers_owner_admin_read
on public.trainers
for select
to authenticated
using (auth.uid() = id or public.is_admin());

create policy trainers_owner_update
on public.trainers
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy trainers_admin_update
on public.trainers
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists offers_read on public.trainer_offers;
drop policy if exists offers_public_read on public.trainer_offers;
drop policy if exists offers_owner_admin_read on public.trainer_offers;
drop policy if exists offers_trainer_write on public.trainer_offers;
drop policy if exists offers_owner_insert on public.trainer_offers;
drop policy if exists offers_owner_update on public.trainer_offers;

create policy offers_public_read
on public.trainer_offers
for select
to anon, authenticated
using (is_active = true and public.is_approved_trainer(trainer_id));

create policy offers_owner_admin_read
on public.trainer_offers
for select
to authenticated
using (auth.uid() = trainer_id or public.is_admin());

create policy offers_owner_insert
on public.trainer_offers
for insert
to authenticated
with check (auth.uid() = trainer_id);

create policy offers_owner_update
on public.trainer_offers
for update
to authenticated
using (auth.uid() = trainer_id)
with check (auth.uid() = trainer_id);

alter table public.trainers enable row level security;
alter table public.trainer_offers enable row level security;

-- Tabellenweite Rechte und PUBLIC-Rechte gezielt nur für die beiden Basistabellen
-- entfernen. Separat vergebene Spaltenrechte bleiben bei einem Tabellen-REVOKE
-- erhalten und werden deshalb auf Basistabellen und View einzeln entfernt.
revoke all privileges on table public.trainers from public, anon, authenticated;
revoke all privileges on table public.trainer_offers from public, anon, authenticated;

do $$
declare
  target record;
begin
  -- PostgreSQL 17 behandelt Views für GRANT/REVOKE als Relationen und lässt
  -- SELECT/INSERT/UPDATE/REFERENCES als Spaltenrechte zu. REFERENCES auf der
  -- View ist fachlich nicht nutzbar, wird hier aber bewusst mit entfernt, damit
  -- auch ein vorhandenes Spalten-ACL vollständig bereinigt wird.
  for target in
    select c.table_name, c.column_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name in ('trainers', 'trainer_offers', 'trainers_public')
  loop
    execute format(
      'revoke select (%1$I), insert (%1$I), update (%1$I), references (%1$I) on table public.%2$I from public, anon, authenticated',
      target.column_name,
      target.table_name
    );
  end loop;

  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
    join pg_roles grantee on grantee.oid = acl.grantee
    where n.nspname = 'public'
      and c.relname in ('trainers', 'trainer_offers', 'trainers_public')
      and grantee.rolname in ('anon', 'authenticated')
      and acl.is_grantable

    union all

    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    cross join lateral aclexplode(coalesce(a.attacl, '{}'::aclitem[])) acl
    join pg_roles grantee on grantee.oid = acl.grantee
    where n.nspname = 'public'
      and c.relname in ('trainers', 'trainer_offers', 'trainers_public')
      and grantee.rolname in ('anon', 'authenticated')
      and acl.is_grantable
  ) then
    raise exception 'Sicherheitsmigration abgebrochen: anon/authenticated besitzt ein unerwartetes Tabellen- oder Spaltenrecht WITH GRANT OPTION.';
  end if;
end $$;

-- Basistabelle trainers: authentifizierte Nutzer dürfen nur die durch RLS auf
-- Eigentümer/Admin begrenzten Zeilen lesen. Jedes direkte UPDATE-Recht entspricht
-- einem aktuell belegten Dashboard-Schreibpfad:
-- name/bio/city (Profil), avatar_url (Profilbild), service_mode/specialties/
-- target_levels (Matching) sowie license_number/liability_insurance_expiry
-- (eigene Verifizierungsangaben). Status, E-Mail, Stripe-Daten und Dokumentpfade
-- bleiben Server-Endpunkten mit Service-Role vorbehalten.
grant select on table public.trainers to authenticated;
grant update (
  name,
  bio,
  city,
  service_mode,
  specialties,
  target_levels,
  avatar_url,
  license_number,
  liability_insurance_expiry
) on table public.trainers to authenticated;

-- qualifications, instagram_url, tiktok_url, hourly_rate und availability_status
-- werden derzeit öffentlich gelesen, aber nirgends im Dashboard geschrieben. Sie
-- erhalten daher bewusst kein direktes UPDATE-Recht.

-- Angebote: öffentliche Leser sehen nur fachliche Angebotsdaten. Trainer können
-- eigene Angebote anlegen, bearbeiten und per is_active=false deaktivieren. Das
-- Dashboard führt keinen echten DELETE aus, daher gibt es weder DELETE-Grant noch
-- DELETE-Policy. trainer_id ist nur beim INSERT erlaubt und kann nicht nachträglich
-- geändert werden.
grant select (
  id,
  trainer_id,
  title,
  type,
  duration_minutes,
  price,
  description,
  is_active,
  created_at,
  service_mode,
  pricing_model,
  included_sessions
) on table public.trainer_offers to anon, authenticated;

grant insert (
  trainer_id,
  title,
  type,
  duration_minutes,
  price,
  description,
  service_mode,
  pricing_model,
  included_sessions
) on table public.trainer_offers to authenticated;

grant update (
  title,
  type,
  duration_minutes,
  price,
  description,
  is_active,
  service_mode,
  pricing_model,
  included_sessions
) on table public.trainer_offers to authenticated;

-- Effektive Nachbedingungen innerhalb derselben Transaktion. has_*_privilege
-- berücksichtigt PUBLIC und geerbte Rollenrechte; ein Verstoß rollt alles zurück.
do $$
declare
  unexpected_public_acl text;
begin
  select string_agg(
           format('%I.%I %I', relation_name, column_name, privilege_type),
           ', ' order by relation_name, column_name, privilege_type
         )
    into unexpected_public_acl
  from (
    select c.relname as relation_name, '*'::text as column_name, acl.privilege_type
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
    where n.nspname = 'public'
      and c.relname in ('trainers', 'trainer_offers', 'trainers_public')
      and acl.grantee = 0

    union all

    select c.relname, a.attname, acl.privilege_type
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    cross join lateral aclexplode(coalesce(a.attacl, '{}'::aclitem[])) acl
    where n.nspname = 'public'
      and c.relname in ('trainers', 'trainer_offers', 'trainers_public')
      and acl.grantee = 0
  ) public_acl;

  if unexpected_public_acl is not null then
    raise exception 'Sicherheitsmigration abgebrochen; PUBLIC-Rechte sind nach REVOKE verblieben: %', unexpected_public_acl;
  end if;

  if has_table_privilege('anon', 'public.trainers', 'SELECT')
     or has_table_privilege('anon', 'public.trainers', 'INSERT')
     or has_table_privilege('anon', 'public.trainers', 'UPDATE')
     or has_table_privilege('anon', 'public.trainers', 'DELETE')
     or has_table_privilege('anon', 'public.trainers', 'TRUNCATE')
     or has_table_privilege('anon', 'public.trainers', 'REFERENCES')
     or has_table_privilege('anon', 'public.trainers', 'TRIGGER')
     or has_table_privilege('anon', 'public.trainer_offers', 'SELECT')
     or has_table_privilege('anon', 'public.trainer_offers', 'INSERT')
     or has_table_privilege('anon', 'public.trainer_offers', 'UPDATE')
     or has_table_privilege('anon', 'public.trainer_offers', 'DELETE')
     or has_table_privilege('anon', 'public.trainer_offers', 'TRUNCATE')
     or has_table_privilege('anon', 'public.trainer_offers', 'REFERENCES')
     or has_table_privilege('anon', 'public.trainer_offers', 'TRIGGER')
     or has_table_privilege('authenticated', 'public.trainers', 'INSERT')
     or has_table_privilege('authenticated', 'public.trainers', 'UPDATE')
     or has_table_privilege('authenticated', 'public.trainers', 'DELETE')
     or has_table_privilege('authenticated', 'public.trainers', 'TRUNCATE')
     or has_table_privilege('authenticated', 'public.trainers', 'REFERENCES')
     or has_table_privilege('authenticated', 'public.trainers', 'TRIGGER')
     or has_table_privilege('authenticated', 'public.trainer_offers', 'SELECT')
     or has_table_privilege('authenticated', 'public.trainer_offers', 'INSERT')
     or has_table_privilege('authenticated', 'public.trainer_offers', 'UPDATE')
     or has_table_privilege('authenticated', 'public.trainer_offers', 'DELETE')
     or has_table_privilege('authenticated', 'public.trainer_offers', 'TRUNCATE')
     or has_table_privilege('authenticated', 'public.trainer_offers', 'REFERENCES')
     or has_table_privilege('authenticated', 'public.trainer_offers', 'TRIGGER') then
    raise exception 'Sicherheitsmigration abgebrochen: unerwartetes effektives Tabellenrecht für anon/authenticated verblieben.';
  end if;

  if not has_table_privilege('authenticated', 'public.trainers', 'SELECT')
     or not has_table_privilege('anon', 'public.trainers_public', 'SELECT')
     or not has_table_privilege('authenticated', 'public.trainers_public', 'SELECT')
     or not has_column_privilege('anon', 'public.trainer_offers', 'title', 'SELECT')
     or not has_column_privilege('authenticated', 'public.trainer_offers', 'title', 'SELECT')
     or not has_column_privilege('authenticated', 'public.trainer_offers', 'trainer_id', 'INSERT')
     or not has_column_privilege('authenticated', 'public.trainer_offers', 'is_active', 'UPDATE') then
    raise exception 'Sicherheitsmigration abgebrochen: mindestens ein erforderliches App-Recht fehlt nach GRANT.';
  end if;

  if has_column_privilege('authenticated', 'public.trainers', 'status', 'UPDATE')
     or has_column_privilege('authenticated', 'public.trainers', 'email', 'UPDATE')
     or has_column_privilege('authenticated', 'public.trainers', 'stripe_account_id', 'UPDATE')
     or has_column_privilege('authenticated', 'public.trainers', 'charges_enabled', 'UPDATE')
     or has_column_privilege('authenticated', 'public.trainers', 'license_document_path', 'UPDATE')
     or has_column_privilege('authenticated', 'public.trainers', 'insurance_document_path', 'UPDATE')
     or has_column_privilege('authenticated', 'public.trainers', 'qualifications', 'UPDATE')
     or has_column_privilege('authenticated', 'public.trainers', 'instagram_url', 'UPDATE')
     or has_column_privilege('authenticated', 'public.trainers', 'tiktok_url', 'UPDATE')
     or has_column_privilege('authenticated', 'public.trainers', 'hourly_rate', 'UPDATE')
     or has_column_privilege('authenticated', 'public.trainers', 'availability_status', 'UPDATE')
     or has_column_privilege('authenticated', 'public.trainer_offers', 'trainer_id', 'UPDATE') then
    raise exception 'Sicherheitsmigration abgebrochen: sensibles oder unbelegtes UPDATE-Recht ist effektiv verfügbar.';
  end if;
end $$;

-- Vollständige Zielprüfung: View, Policies, Funktionsrechte und jedes effektive
-- Tabellen-/Spaltenrecht der Browserrollen werden geprüft. Dadurch können weder
-- neue Spalten noch zusätzliche Grant-Arten unbemerkt außerhalb der Positivliste
-- bleiben.
do $$
declare
  target record;
  normalized_qual text;
  normalized_check text;
  expected_select boolean;
  expected_insert boolean;
  expected_update boolean;
  view_options text[];
  actual_view_columns text[];
begin
  select coalesce(c.reloptions, '{}'::text[])
    into view_options
  from pg_class c
  where c.oid = 'public.trainers_public'::regclass;

  if pg_get_viewdef('public.trainers_public'::regclass, false)
       <> pg_get_viewdef('pg_temp.verifit_expected_trainers_public'::regclass, false)
     or not ('security_barrier=true' = any (view_options))
     or not ('security_invoker=false' = any (view_options))
     or 'security_invoker=true' = any (view_options)
     or (select pg_get_userbyid(relowner) from pg_class where oid = 'public.trainers_public'::regclass) <> 'postgres'
     or obj_description('public.trainers_public'::regclass, 'pg_class') is distinct from
        'VeriFit managed trainers_public v1: nur freigegebene Trainer und explizit öffentliche Profilspalten.' then
    raise exception 'Sicherheitsmigration abgebrochen: Definition, Optionen, Owner oder Kommentar von trainers_public weichen vom Zielzustand ab.';
  end if;

  select array_agg(column_name::text order by ordinal_position)
    into actual_view_columns
  from information_schema.columns
  where table_schema = 'public' and table_name = 'trainers_public';

  if actual_view_columns is distinct from array[
    'id', 'name', 'bio', 'city', 'service_mode', 'specialties', 'target_levels',
    'avatar_url', 'qualifications', 'hourly_rate', 'instagram_url', 'tiktok_url',
    'availability_status'
  ]::text[] then
    raise exception 'Sicherheitsmigration abgebrochen: trainers_public exponiert eine unerwartete Spaltenliste: %', actual_view_columns;
  end if;

  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'trainers') <> 3
     or (select count(*) from pg_policies where schemaname = 'public' and tablename = 'trainer_offers') <> 4 then
    raise exception 'Sicherheitsmigration abgebrochen: Anzahl der Ziel-Policies stimmt nicht.';
  end if;

  for target in
    select *
    from (values
      (
        'trainers', 'trainers_owner_admin_read', 'PERMISSIVE', array['authenticated']::text[], 'SELECT',
        '((auth.uid() = id) OR public.is_admin())', ''
      ),
      (
        'trainers', 'trainers_owner_update', 'PERMISSIVE', array['authenticated']::text[], 'UPDATE',
        '(auth.uid() = id)', '(auth.uid() = id)'
      ),
      (
        'trainers', 'trainers_admin_update', 'PERMISSIVE', array['authenticated']::text[], 'UPDATE',
        'public.is_admin()', 'public.is_admin()'
      ),
      (
        'trainer_offers', 'offers_public_read', 'PERMISSIVE', array['anon', 'authenticated']::text[], 'SELECT',
        '((is_active = true) AND public.is_approved_trainer(trainer_id))', ''
      ),
      (
        'trainer_offers', 'offers_owner_admin_read', 'PERMISSIVE', array['authenticated']::text[], 'SELECT',
        '((auth.uid() = trainer_id) OR public.is_admin())', ''
      ),
      (
        'trainer_offers', 'offers_owner_insert', 'PERMISSIVE', array['authenticated']::text[], 'INSERT',
        '', '(auth.uid() = trainer_id)'
      ),
      (
        'trainer_offers', 'offers_owner_update', 'PERMISSIVE', array['authenticated']::text[], 'UPDATE',
        '(auth.uid() = trainer_id)', '(auth.uid() = trainer_id)'
      )
    ) as expected(table_name, policy_name, permissive_mode, role_names, command_name, expected_qual, expected_check)
  loop
    select
      replace(regexp_replace(coalesce(p.qual, ''), '[[:space:]]+', '', 'g'), 'public.', ''),
      replace(regexp_replace(coalesce(p.with_check, ''), '[[:space:]]+', '', 'g'), 'public.', '')
      into normalized_qual, normalized_check
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = target.table_name
      and p.policyname = target.policy_name
      and p.permissive = target.permissive_mode
      and array(
            select role_name::text
            from unnest(p.roles) as policy_role(role_name)
            order by role_name::text
          ) = target.role_names
      and p.cmd = target.command_name;

    if not found then
      raise exception 'Sicherheitsmigration abgebrochen: Policy-Metadaten weichen ab: %.%', target.table_name, target.policy_name;
    end if;

    if normalized_qual is distinct from
         replace(regexp_replace(target.expected_qual, '[[:space:]]+', '', 'g'), 'public.', '')
       or normalized_check is distinct from
         replace(regexp_replace(target.expected_check, '[[:space:]]+', '', 'g'), 'public.', '') then
      raise exception 'Sicherheitsmigration abgebrochen: Policy-Ausdruck weicht ab: %.% (USING %, WITH CHECK %).',
        target.table_name, target.policy_name, normalized_qual, normalized_check;
    end if;
  end loop;

  for target in
    select relation_name, role_name, privilege_name,
           (relation_name = 'trainers' and role_name = 'authenticated' and privilege_name = 'SELECT')
           or (relation_name = 'trainers_public' and role_name in ('anon', 'authenticated') and privilege_name = 'SELECT') as expected
    from unnest(array['trainers', 'trainer_offers', 'trainers_public']) as relations(relation_name)
    cross join unnest(array['anon', 'authenticated']) as roles(role_name)
    cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) as privileges(privilege_name)
  loop
    if has_table_privilege(target.role_name, format('public.%I', target.relation_name), target.privilege_name)
       is distinct from target.expected then
      raise exception 'Sicherheitsmigration abgebrochen: unerwartetes effektives Tabellenrecht %.% % für %.',
        'public', target.relation_name, target.privilege_name, target.role_name;
    end if;
  end loop;

  for target in
    select c.table_name, c.column_name, roles.role_name
    from information_schema.columns c
    cross join unnest(array['anon', 'authenticated']) roles(role_name)
    where c.table_schema = 'public'
      and c.table_name in ('trainers', 'trainer_offers', 'trainers_public')
  loop
    expected_select :=
      (target.table_name = 'trainers' and target.role_name = 'authenticated')
      or target.table_name = 'trainers_public'
      or (
        target.table_name = 'trainer_offers'
        and target.column_name = any (array[
          'id', 'trainer_id', 'title', 'type', 'duration_minutes', 'price',
          'description', 'is_active', 'created_at', 'service_mode',
          'pricing_model', 'included_sessions'
        ]::text[])
      );
    expected_insert :=
      target.table_name = 'trainer_offers'
      and target.role_name = 'authenticated'
      and target.column_name = any (array[
        'trainer_id', 'title', 'type', 'duration_minutes', 'price', 'description',
        'service_mode', 'pricing_model', 'included_sessions'
      ]::text[]);
    expected_update :=
      target.role_name = 'authenticated'
      and (
        (
          target.table_name = 'trainers'
          and target.column_name = any (array[
            'name', 'bio', 'city', 'service_mode', 'specialties', 'target_levels',
            'avatar_url', 'license_number', 'liability_insurance_expiry'
          ]::text[])
        )
        or (
          target.table_name = 'trainer_offers'
          and target.column_name = any (array[
            'title', 'type', 'duration_minutes', 'price', 'description', 'is_active',
            'service_mode', 'pricing_model', 'included_sessions'
          ]::text[])
        )
      );

    if has_column_privilege(target.role_name, format('public.%I', target.table_name), target.column_name, 'SELECT')
         is distinct from expected_select
       or has_column_privilege(target.role_name, format('public.%I', target.table_name), target.column_name, 'INSERT')
         is distinct from expected_insert
       or has_column_privilege(target.role_name, format('public.%I', target.table_name), target.column_name, 'UPDATE')
         is distinct from expected_update
       or has_column_privilege(target.role_name, format('public.%I', target.table_name), target.column_name, 'REFERENCES') then
      raise exception 'Sicherheitsmigration abgebrochen: Spaltenrecht-Matrix weicht ab: %.% für %.',
        target.table_name, target.column_name, target.role_name;
    end if;
  end loop;

  if not has_table_privilege('service_role', 'public.trainers', 'SELECT')
     or not has_table_privilege('service_role', 'public.trainers', 'INSERT')
     or not has_table_privilege('service_role', 'public.trainers', 'UPDATE')
     or not has_table_privilege('service_role', 'public.trainers', 'DELETE')
     or not has_table_privilege('service_role', 'public.trainer_offers', 'SELECT')
     or not has_table_privilege('service_role', 'public.trainer_offers', 'INSERT')
     or not has_table_privilege('service_role', 'public.trainer_offers', 'UPDATE')
     or not has_table_privilege('service_role', 'public.trainer_offers', 'DELETE') then
    raise exception 'Sicherheitsmigration abgebrochen: erforderliche Service-Role-Tabellenrechte sind nicht vollständig verfügbar.';
  end if;

  if not has_function_privilege('anon', 'public.is_approved_trainer(uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.is_approved_trainer(uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.is_approved_trainer(uuid)', 'EXECUTE')
     or exists (
       select 1
       from pg_proc p
       cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
       where p.oid = 'public.is_approved_trainer(uuid)'::regprocedure
         and acl.grantee = 0
         and acl.privilege_type = 'EXECUTE'
     )
     or exists (
       select 1
       from pg_proc p
       cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
       join pg_roles grantee on grantee.oid = acl.grantee
       where p.oid = 'public.is_approved_trainer(uuid)'::regprocedure
         and grantee.rolname in ('anon', 'authenticated', 'service_role')
         and acl.privilege_type = 'EXECUTE'
         and acl.is_grantable
     ) then
    raise exception 'Sicherheitsmigration abgebrochen: EXECUTE-Matrix von is_approved_trainer(uuid) weicht ab.';
  end if;
end $$;

drop view pg_temp.verifit_expected_trainers_public;

-- PostgREST soll die neue View und die geänderten Rechte unmittelbar nach COMMIT
-- neu einlesen. Das Signal ersetzt nicht die anschließende Cache-/Smoke-Prüfung.
notify pgrst, 'reload schema';

commit;
