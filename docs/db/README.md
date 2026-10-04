# DB-Export (Staging-Struktur, keine Nutzerdaten)

Im Supabase **SQL Editor** (Staging-Projekt) nacheinander ausführen. Ergebnis jeweils als Markdown/CSV kopieren und in die genannte Datei unter `docs/db/` legen. Enthalten ist nur Struktur, keine Daten. Vor dem Commit kurz prüfen, ob Policies hart codierte E-Mail-Adressen enthalten.

## 1. `docs/db/tables.md`: Spalten
```sql
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;
```

## 2. `docs/db/rls-status.md`: RLS an/aus pro Tabelle
```sql
select c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;
```

## 3. `docs/db/rls-policies.md`: Policies (public)
```sql
select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

## 4. `docs/db/storage.md`: Buckets und Storage-Policies
```sql
select id, name, public, file_size_limit, allowed_mime_types from storage.buckets;

select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
```

## 5. `docs/db/functions.md`: Funktionen (u. a. `respond_to_booking`)
```sql
select p.proname, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;
```

## 6. `docs/db/triggers.md`: Trigger (public und auth.users)
```sql
select event_object_table, trigger_name, action_timing, event_manipulation, action_statement
from information_schema.triggers
where trigger_schema = 'public';

select tgname, pg_get_triggerdef(oid) as definition
from pg_trigger
where tgrelid = 'auth.users'::regclass and not tgisinternal;
```

## 7. `docs/db/realtime-und-indizes.md`
```sql
select * from pg_publication_tables where pubname = 'supabase_realtime';

select tablename, indexname, indexdef from pg_indexes where schemaname = 'public' order by tablename;
```

Zusätzlich: Dashboard → **Advisors → Security** öffnen, Warnungen als Text in `docs/db/advisors.md` kopieren.
