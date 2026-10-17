# Trainer-/Angebotsrechte – sichere Produktionsvorbereitung

Stand: 11.10.2026. Die Migration ist **lokal vorbereitet, nicht ausgeführt und nicht produktionsbereit**. In dieser Arbeitssitzung wurde keine Supabase-Verbindung hergestellt. Die unten als Produktionsbefund bezeichneten Angaben stammen aus den vom Betreiber bereitgestellten Resultaten read-only ausgeführter SQL-Abfragen; sie wurden hier nicht eigenständig gegen die entfernte Umgebung wiederholt. Vor einem produktiven Einsatz muss die Migration in einer separaten, produktionsgleichen Staging-Datenbank ausgeführt und mit echten Rollen getestet werden.

## 1. Lokaler Befund und Grenzen

### Bestätigt im aktuellen Repository

- `src/app/trainer/register/page.tsx` ruft ausschließlich `supabase.auth.signUp()` auf und sendet `role`, `name`, `bio` als Auth-Metadaten. Der Browser führt keinen direkten `INSERT` auf `public.trainers` aus.
- Direkte Browser-Updates auf `public.trainers` sind auf folgende Spalten begrenzt:
  - `name`, `bio`, `city`: `src/components/trainer-dashboard/ProfileSection.tsx`
  - `avatar_url`: `src/components/trainer-dashboard/ProfileSection.tsx`
  - `specialties`, `service_mode`, `target_levels`: `src/components/trainer-dashboard/SpecialtiesSection.tsx`
  - `license_number`, `liability_insurance_expiry`: `src/components/trainer-dashboard/VerificationSection.tsx`
- `license_document_path` und `insurance_document_path` werden über den authentifizierten Route Handler `POST /api/trainer/verification-document` mit Service Role geschrieben. `status`, `stripe_account_id` und `charges_enabled` werden ebenfalls nur in vorhandenen Admin-/Stripe-Serverpfaden mit Service Role geändert.
- `qualifications`, `instagram_url`, `tiktok_url`, `hourly_rate` und `availability_status` werden im aktuellen App-Code nur gelesen. Dafür ist deshalb bewusst kein direktes UPDATE-Recht vorgesehen. Wenn dafür später Dashboard-Felder hinzukommen, müssen Validierung, UI und Grant gemeinsam in einer neuen Änderung geprüft werden.
- `src/hooks/trainer-dashboard/useTrainerSchedule.ts` liest aktive eigene Angebote, legt Angebote an, aktualisiert deren Fachdaten und deaktiviert sie per `is_active=false`. Es gibt keinen direkten `DELETE` auf `trainer_offers`. Die Migration erteilt deshalb kein DELETE-Recht und legt keine DELETE-Policy an.
- Dasselbe Hook filtert die sichtbare Dashboard-Liste ausdrücklich mit `is_active=true`. Die Owner-SELECT-Policy erlaubt zwar weiterhin das Lesen eigener inaktiver Angebote, die aktuelle UI zeigt sie aber unverändert nicht an und bietet keine Reaktivierung. Das ist ein bestehendes Produktverhalten, kein durch die Migration verursachter Rechtefehler.
- `trainer_id` wird beim Angebots-INSERT benötigt, beim UPDATE aber weder vom Code geschrieben noch von der Migration erlaubt.
- Öffentliche Liste, Quiz und Profil lesen ausschließlich die expliziten Spalten der View `trainers_public` sowie aktive Angebote. Das Eigentümer-Dashboard benötigt darüber hinaus `is_active` für den Filter und `created_at` für die Sortierung; beide Spalten sind im SELECT-Grant enthalten.
- Buchungs- und Zahlungsrouten greifen mit `getAdminClient()`/Service Role auf Trainer und Angebote zu. Die Migration entzieht `service_role` keine Rechte und ändert diese Abläufe nicht.

### Teilweise bestätigt oder widersprüchlich

- `docs/db/functions.md` und `docs/db/triggers.md` exportieren einen veralteten Körper von `public.handle_new_user()`, der nur `profiles` anlegt und `raw_user_meta_data.role` ungefiltert übernimmt. Der bereitgestellte Produktionsbefund bestätigt dagegen eine Whitelist auf `client`/`trainer`, den Fallback `client` und die Anlage von Trainern mit `status = 'pending'`. Der Repository-Export bleibt damit nachweislich ungeeignet als Live-Quelle und sollte separat aktualisiert werden.
- Der lokale Policy-Export `docs/db/rls-policies.md` zeigt andere, ältere Policy-Namen und -Definitionen. Für diese Migration gilt der bereitgestellte Produktionsbefund mit `trainers_admin_update`, `trainers_owner_update`, `trainers_public_read_approved`, `offers_read` und `offers_trainer_write` als erwarteter Ausgangszustand. Eine spätere erneute Live-Diagnose bleibt Pflicht, weil lokale Dateien keinen entfernten Zustand beweisen.
- Die Migration prüft nun den exakten Namen, die Tabelle, `AFTER INSERT`, `FOR EACH ROW`, die aufgerufene Funktion und den Status des Registrierungstriggers. Für `handle_new_user()`, `is_admin()` und `prevent_protected_profile_changes()` prüft sie Signatur, Owner, Sicherheitsmodus und relevanten `search_path`. Den fachlichen Funktionskörper von `handle_new_user()` und `prevent_protected_profile_changes()` vergleicht sie bewusst nicht textuell: Format- oder Implementierungsvarianten wären zu fragil; die bereitgestellte Read-only-Prüfung und isolierte Verhaltenstests bleiben maßgeblich.

### Vom Betreiber read-only bestätigter Produktionszustand

- PostgreSQL 17.6; `current_user` und `session_user` waren `postgres`.
- `on_auth_user_created` ist aktiv und ruft als `AFTER INSERT ON auth.users FOR EACH ROW` die Funktion `public.handle_new_user()` auf. Die Funktion gehört `postgres`, ist `SECURITY DEFINER` und verwendet einen leeren `search_path`.
- `protect_trainer_profile` ist als `BEFORE UPDATE ON public.trainers FOR EACH ROW` aktiv und ruft `public.prevent_protected_profile_changes()` auf. Die Funktion gehört `postgres`, ist `SECURITY DEFINER` und verwendet `search_path = public`. Ihr bestätigter Körper schützt bei Selbständerungen `id`, `email`, `status`, `stripe_account_id` und `charges_enabled`; Service-/Admin-Pfade bleiben erhalten.
- `public.is_admin()` gehört `postgres`, ist `SECURITY DEFINER`, stabil und verwendet `search_path = public`. `PUBLIC`, `anon` und `authenticated` besitzen kein `CREATE` auf dem Schema `public`.
- Die Ausgangs-Policy `trainers_public_read_approved` gilt laut Read-only-Befund exakt für `{anon,authenticated}` (nicht für `{public}`). Die Migration prüft diese Rollenmenge sowie Befehl, Permissivität, `USING` und `WITH CHECK` vor jeder dauerhaften Änderung.
- `public.trainers_public` existierte zum Prüfzeitpunkt nicht. Direkte Tabellen- und Spaltenrechte für `anon` und `authenticated` waren auf `trainers` und `trainer_offers` breit vergeben. Die Default Privileges von `postgres` sind ebenfalls breit, werden von dieser gezielten Migration aber bewusst nicht global verändert.

## 2. Begründung der direkten Trainer-UPDATE-Rechte

| Spalte | Aktueller Schreibpfad | Begründung |
|---|---|---|
| `name` | Profilformular | Eigene öffentliche Stammdaten |
| `bio` | Profilformular | Eigene öffentliche Profilbeschreibung |
| `city` | Profilformular | Eigener öffentlicher Standort |
| `avatar_url` | Profilbild-Upload | Verweis auf eigenes öffentliches Profilbild; Storage-Regeln separat prüfen |
| `specialties` | Fachgebietsbereich | Eigenes Matching-/Profilmerkmal |
| `service_mode` | Fachgebietsbereich | Eigene allgemeine Trainingsform |
| `target_levels` | Fachgebietsbereich | Eigene Matching-Zielgruppen |
| `license_number` | Verifizierungsbereich | Eigene fachliche Angabe; Admin-Freigabestatus bleibt getrennt |
| `liability_insurance_expiry` | Verifizierungsbereich | Eigene Nachweisangabe; Dokumentpfad und Freigabe bleiben serverseitig |

Nicht direkt änderbar bleiben insbesondere `email`, `status`, `license_document_path`, `insurance_document_path`, `stripe_account_id`, `charges_enabled` sowie die derzeit nur gelesenen Felder `qualifications`, `instagram_url`, `tiktok_url`, `hourly_rate`, `availability_status`.

## 3. Read-only-Prüfung vor dem Rollout

Die folgenden Abfragen müssen in der **tatsächlichen Zielumgebung** mit einer Rolle ausgeführt werden, die Katalogmetadaten lesen darf. Ergebnisse vollständig sichern und mit dem erwarteten Zustand abgleichen. Keine der Abfragen verändert Daten oder Rechte.

### Version, Objektarten, Owner und RLS

```sql
select current_setting('server_version') as server_version,
       current_setting('server_version_num') as server_version_num,
       current_user;

select n.nspname as schema_name,
       c.relname,
       c.relkind,
       c.relrowsecurity,
       c.relforcerowsecurity,
       pg_get_userbyid(c.relowner) as owner,
       c.reloptions,
       obj_description(c.oid, 'pg_class') as object_comment
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('trainers', 'trainer_offers', 'trainers_public')
order by c.relname;
```

Erwartung: PostgreSQL 15 oder neuer; `trainers` und `trainer_offers` sind Tabellen. Falls `trainers_public` bereits existiert, Migration **nicht** ausführen, bevor Definition, Owner und Optionen geklärt wurden. Eine bestehende View mit `security_invoker=true`, unbekanntem Kommentar, anderem Owner oder anderer Definition führt absichtlich zum atomaren Abbruch.

### Alle direkten Tabellenrechte einschließlich PUBLIC

`information_schema.role_table_grants` kann die Sicht auf Rollen einschränken. Deshalb zusätzlich die ACLs direkt aus dem Katalog auslesen:

```sql
select n.nspname as schema_name,
       c.relname,
       case when acl.grantee = 0 then 'PUBLIC' else grantee.rolname end as grantee,
       grantor.rolname as grantor,
       acl.privilege_type,
       acl.is_grantable
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
left join pg_roles grantee on grantee.oid = acl.grantee
left join pg_roles grantor on grantor.oid = acl.grantor
where n.nspname = 'public'
  and c.relname in ('trainers', 'trainer_offers', 'trainers_public')
order by c.relname, grantee, acl.privilege_type;
```

### Alle direkten Spaltenrechte einschließlich PUBLIC

```sql
select n.nspname as schema_name,
       c.relname,
       a.attname as column_name,
       case when acl.grantee = 0 then 'PUBLIC' else grantee.rolname end as grantee,
       grantor.rolname as grantor,
       acl.privilege_type,
       acl.is_grantable
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join pg_attribute a on a.attrelid = c.oid
  and a.attnum > 0
  and not a.attisdropped
cross join lateral aclexplode(coalesce(a.attacl, '{}'::aclitem[])) acl
left join pg_roles grantee on grantee.oid = acl.grantee
left join pg_roles grantor on grantor.oid = acl.grantor
where n.nspname = 'public'
  and c.relname in ('trainers', 'trainer_offers', 'trainers_public')
order by c.relname, a.attnum, grantee, acl.privilege_type;
```

Die Migration entfernt Tabellen- und Spaltenrechte von `PUBLIC`, `anon` und `authenticated` gezielt nur auf diesen beiden Tabellen und der öffentlichen View und vergibt anschließend die dokumentierte Positivliste. Eine vollständige Nachbedingung iteriert über sämtliche vorhandenen Spalten und prüft für beide Browserrollen `SELECT`, `INSERT`, `UPDATE` und `REFERENCES`; auf Relationsebene werden alle sieben Tabellenrechte geprüft. Damit führen auch später hinzugekommene, nicht freigegebene Spalten zum Abbruch. Default Privileges und Rechte anderer Tabellen/Views werden nicht verändert.

### Rollenmitgliedschaften und effektiv geerbte Rechte

```sql
select target.rolname as app_role,
       inherited.rolname as inherited_role,
       pg_has_role(target.oid, inherited.oid, 'USAGE') as privileges_immediately_available,
       pg_has_role(target.oid, inherited.oid, 'MEMBER') as is_direct_or_indirect_member
from pg_roles target
cross join pg_roles inherited
where target.rolname in ('anon', 'authenticated')
  and target.oid <> inherited.oid
  and (
    pg_has_role(target.oid, inherited.oid, 'USAGE')
    or pg_has_role(target.oid, inherited.oid, 'MEMBER')
  )
order by target.rolname, inherited.rolname;

select
  has_table_privilege('anon', 'public.trainers', 'SELECT') as anon_trainers_select,
  has_table_privilege('anon', 'public.trainers', 'INSERT') as anon_trainers_insert,
  has_table_privilege('anon', 'public.trainers', 'UPDATE') as anon_trainers_update,
  has_table_privilege('anon', 'public.trainers', 'DELETE') as anon_trainers_delete,
  has_table_privilege('authenticated', 'public.trainers', 'SELECT') as auth_trainers_select,
  has_table_privilege('authenticated', 'public.trainers', 'INSERT') as auth_trainers_insert,
  has_table_privilege('authenticated', 'public.trainers', 'UPDATE') as auth_trainers_update,
  has_table_privilege('authenticated', 'public.trainer_offers', 'DELETE') as auth_offer_delete;
```

Die Migration bricht ab, wenn `anon` oder `authenticated` Tabellen-/Spaltenrechte über eine weitere Rolle oder Eigentümerrolle erben. `PUBLIC` wird separat gezielt entzogen. Rechte einer anderen, nicht geerbten Betriebsrolle werden nicht pauschal verändert und müssen vorab fachlich zugeordnet werden.

### Policies

```sql
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('trainers', 'trainer_offers')
order by tablename, policyname;
```

Keine zusätzliche permissive oder restrictive Policy darf ungeklärt bleiben. Die Migration akzeptiert nur die vollständige, verifizierte Ausgangsmatrix oder die vollständige verwaltete Zielmatrix; fehlende, zusätzliche oder gemischte Zustände brechen ab. Vor dem Ersetzen und danach prüft sie Anzahl, Rollen, Befehle, Permissivität sowie normalisierte `USING`-/`WITH CHECK`-Ausdrücke. Die Normalisierung ignoriert nur Whitespace und die optionale `public.`-Qualifizierung; Klammerung, Operatoren, Casts und Literale bleiben Teil des Vergleichs.

### View-Definition, Optionen, Spalten und Abhängigkeiten

```sql
select c.oid::regclass as view_name,
       c.relkind,
       pg_get_userbyid(c.relowner) as owner,
       c.reloptions,
       obj_description(c.oid, 'pg_class') as object_comment,
       pg_get_viewdef(c.oid, false) as definition
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'trainers_public';

select table_schema, table_name, ordinal_position, column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'trainers_public'
order by ordinal_position;

select view_schema, view_name, table_schema, table_name, column_name
from information_schema.view_column_usage
where view_schema = 'public' and view_name = 'trainers_public'
order by table_schema, table_name, column_name;
```

Die Ziel-View wird explizit mit `security_barrier=true`, `security_invoker=false` und Owner `postgres` erstellt. Sie filtert `status = 'approved'` und exponiert ausschließlich:

`id`, `name`, `bio`, `city`, `service_mode`, `specialties`, `target_levels`, `avatar_url`, `qualifications`, `hourly_rate`, `instagram_url`, `tiktok_url`, `availability_status`.

Eine unbekannte gleichnamige Relation/View wird nicht überschrieben. Bei einer von dieser Migration verwalteten bestehenden View vergleicht die Migration zusätzlich die kanonische Definition, Optionen und den Owner, bevor `CREATE OR REPLACE` ausgeführt wird.

### Funktionen und Auth-Trigger

```sql
select p.oid::regprocedure as function_name,
       p.prosecdef as security_definer,
       p.provolatile,
       p.proconfig,
       pg_get_userbyid(p.proowner) as owner,
       obj_description(p.oid, 'pg_proc') as object_comment,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'is_admin',
    'handle_new_user',
    'prevent_protected_profile_changes',
    'is_approved_trainer'
  )
order by p.oid::regprocedure::text;

select t.tgname as trigger_name,
       t.tgenabled,
       t.tgfoid::regprocedure as function_name,
       p.prosecdef as security_definer,
       p.proconfig,
       pg_get_userbyid(p.proowner) as function_owner,
       pg_get_triggerdef(t.oid, true) as trigger_definition,
       pg_get_functiondef(p.oid) as function_definition
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'auth.users'::regclass
  and not t.tgisinternal
order by t.tgname;

select t.tgname as trigger_name,
       t.tgenabled,
       t.tgfoid::regprocedure as function_name,
       p.prosecdef as security_definer,
       p.proconfig,
       pg_get_userbyid(p.proowner) as function_owner,
       pg_get_triggerdef(t.oid, true) as trigger_definition,
       pg_get_functiondef(p.oid) as function_definition
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'public.trainers'::regclass
  and t.tgname = 'protect_trainer_profile'
  and not t.tgisinternal;

select n.nspname as schema_name,
       case when acl.grantee = 0 then 'PUBLIC' else grantee.rolname end as grantee,
       acl.privilege_type,
       acl.is_grantable
from pg_namespace n
cross join lateral aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) acl
left join pg_roles grantee on grantee.oid = acl.grantee
where n.nspname = 'public'
order by grantee, acl.privilege_type;
```

Vor Ausführung manuell bestätigen:

- `is_admin()` ermittelt ausschließlich die Rolle des aktuellen `auth.uid()` aus einer vertrauenswürdigen Tabelle. Owner, `search_path` und CREATE-Rechte auf alle verwendeten Schemas verhindern Object-Hijacking.
- Ein aktiver Trigger auf `auth.users` ruft tatsächlich `public.handle_new_user()` auf.
- `handle_new_user()` whitelisted ausschließlich `client` und `trainer`, verwendet als Fallback `client`, erlaubt nie die browserseitige Vergabe von `admin` und legt `profiles` sowie den passenden `clients`-/`trainers`-Datensatz atomar an.
- Der Trigger läuft in einem sicheren Ausführungskontext und ist nicht von direkten `INSERT`-Rechten für `anon` oder `authenticated` auf `public.trainers` abhängig.
- Registrierung mit E-Mail-Bestätigung **an und aus** wurde in Staging getestet. Keine Annahme aus den veralteten lokalen Exporten ersetzt diesen Test.

### Default Privileges nur diagnostizieren

```sql
select pg_get_userbyid(d.defaclrole) as owner,
       n.nspname as schema_name,
       d.defaclobjtype,
       d.defaclacl
from pg_default_acl d
left join pg_namespace n on n.oid = d.defaclnamespace
where n.nspname = 'public' or d.defaclnamespace = 0
order by owner, schema_name, d.defaclobjtype;
```

Breite Default Privileges können zukünftige Objekte betreffen, umgehen aber keinen erfolgreichen gezielten REVOKE am bestehenden Objekt. Sie werden hier bewusst nicht verändert; eine Korrektur gehört in eine separate, eigentümerbezogene Migration mit eigenem Scope.

## 4. Sichere Ausführungsreihenfolge

1. Vollständiges Projekt-/Datenbank-Backup, verantwortliche Person und Wartungsfenster festlegen.
2. Alle Read-only-Abfragen aus Abschnitt 3 in der Zielumgebung ausführen, Ergebnisse sichern und jede Abweichung aufklären.
3. Insbesondere PostgreSQL-Version, `PUBLIC`-/Spaltenrechte, Rollenmitgliedschaften, vorhandene View/Funktion, `is_admin()` sowie Auth-Trigger/Funktionskörper bestätigen.
4. Eine separate Staging-Datenbank mit produktionsgleichem Schema/Rechtemodell herstellen. Die produktive Datenbank ist kein Ersatz für Staging.
5. Ein koordiniertes Wartungsfenster verwenden. Die neue App-Version enthält `/api/trainer/verification-document` und nutzt `trainers_public`. Nur ein eindeutiger PostgreSQL-Fehler `42P01` erlaubt den kurzen Deploy-vor-Migration-Fallback. `PGRST205` ist kein Beweis für eine fehlende View und schlägt bewusst geschlossen fehl; damit kann die öffentliche Traineranzeige bis zur Migration und Cache-Aktualisierung vorübergehend nicht verfügbar sein.
6. In Staging zuerst `20261011170000_quiz_matching_offer_metadata.sql`, danach `20261011193000_trainers_offers_least_privilege.sql` jeweils vollständig ausführen. Den zweiten Migrationsblock nie abschnittsweise ausführen. Er sendet am Transaktionsende `NOTIFY pgrst, 'reload schema'`.
7. Nach dem Commit prüfen, dass PostgREST den Cache tatsächlich aktualisiert hat. Bei `PGRST205` keinen Tabellen-Fallback aktivieren, sondern Cache-Aktualisierung wiederholen bzw. die Ursache klären. Erst danach sämtliche Nachprüfungen/Rollentests aus Abschnitt 5 durchführen und das Wartungsfenster beenden.
8. Erst nach dokumentierter Freigabe denselben koordinierten Ablauf im produktiven Wartungsfenster wiederholen: erneute Read-only-Diagnose, App-Rollout, Phase-3-Migration, Least-Privilege-Migration, bestätigte Cache-Aktualisierung, Smoke-/Negativtests.
9. Bei irgendeiner unerwarteten Vorbedingung oder einem Abbruch nicht improvisieren: Zustand sichern, Ursache klären und eine neue Forward-Fix-Migration erstellen.

## 5. Read-only-Nachprüfung und Rollenmatrix

### ACLs, Policies und View erneut prüfen

Nach der Migration dieselben ACL-, Policy-, View- und Funktionsabfragen aus Abschnitt 3 erneut ausführen. Zusätzlich:

```sql
select
  has_table_privilege('anon', 'public.trainers', 'SELECT') as anon_trainers_select,
  has_table_privilege('anon', 'public.trainers', 'INSERT') as anon_trainers_insert,
  has_table_privilege('anon', 'public.trainers', 'UPDATE') as anon_trainers_update,
  has_table_privilege('anon', 'public.trainers', 'DELETE') as anon_trainers_delete,
  has_table_privilege('anon', 'public.trainers', 'TRUNCATE') as anon_trainers_truncate,
  has_table_privilege('anon', 'public.trainers_public', 'SELECT') as anon_public_view_select,
  has_table_privilege('authenticated', 'public.trainers', 'SELECT') as auth_trainers_select,
  has_table_privilege('authenticated', 'public.trainers', 'INSERT') as auth_trainers_insert,
  has_table_privilege('authenticated', 'public.trainers', 'DELETE') as auth_trainers_delete,
  has_column_privilege('authenticated', 'public.trainers', 'bio', 'UPDATE') as auth_bio_update,
  has_column_privilege('authenticated', 'public.trainers', 'status', 'UPDATE') as auth_status_update,
  has_column_privilege('authenticated', 'public.trainers', 'stripe_account_id', 'UPDATE') as auth_stripe_update,
  has_column_privilege('authenticated', 'public.trainers', 'license_document_path', 'UPDATE') as auth_document_update,
  has_column_privilege('authenticated', 'public.trainers', 'qualifications', 'UPDATE') as auth_qualifications_update;

select
  has_column_privilege('anon', 'public.trainer_offers', 'title', 'SELECT') as anon_offer_title_select,
  has_column_privilege('authenticated', 'public.trainer_offers', 'trainer_id', 'INSERT') as auth_offer_owner_insert,
  has_column_privilege('authenticated', 'public.trainer_offers', 'trainer_id', 'UPDATE') as auth_offer_owner_update,
  has_column_privilege('authenticated', 'public.trainer_offers', 'title', 'UPDATE') as auth_offer_title_update,
  has_column_privilege('authenticated', 'public.trainer_offers', 'is_active', 'UPDATE') as auth_offer_deactivate,
  has_table_privilege('authenticated', 'public.trainer_offers', 'DELETE') as auth_offer_delete;
```

Erwartung:

- `anon_public_view_select`, `auth_trainers_select`, `auth_bio_update`, `anon_offer_title_select`, `auth_offer_owner_insert`, `auth_offer_title_update` und `auth_offer_deactivate` sind `true`.
- Alle übrigen obigen Prüfungen sind `false`, insbesondere direkte Basistabellenrechte für `anon`, sensibles Trainer-UPDATE, `trainer_id`-UPDATE und Angebots-DELETE.
- In den ACL-Abfragen existieren keine Tabellen- oder Spaltenrechte für `PUBLIC` auf `trainers`/`trainer_offers`. Auf `trainers_public` hat `PUBLIC` ebenfalls keine Rechte; SELECT ist direkt nur `anon` und `authenticated` erteilt.

### Manuelle Rollenmatrix

Nur mit dedizierten Testkonten und Testdaten in Staging ausführen:

| Rolle | Erlaubt | Muss scheitern bzw. unsichtbar bleiben |
|---|---|---|
| `anon` | Freigegebene Zeilen/Spalten aus `trainers_public`; aktive Angebote freigegebener Trainer | Basistabelle `trainers`; ausstehende/abgelehnte Trainer; inaktive Angebote; jede Mutation beider Tabellen |
| Client A | Öffentliche View und öffentliche Angebote; eigener Buchungsablauf | Fremde Trainer-Basissätze; inaktive Angebote; jede Profil-/Angebotsmutation |
| Client B | Spiegelbildlich zu Client A | Zugriff über Rechte von Client A oder Trainerrechten |
| Trainer A | Eigener vollständiger Basissatz; die neun dokumentierten eigenen Profilfelder; eigene aktive **und inaktive** Angebote lesen; eigenes Angebot anlegen/bearbeiten/deaktivieren; eigener Dokumentpfad über API | Status, E-Mail, Stripe-/Dokumentpfad und unbelegte Profilfelder direkt ändern; Trainer-B-Datensatz/-Angebote ändern; `trainer_id` ändern; Angebot hart löschen |
| Trainer B | Spiegelbildlich zu Trainer A | Zugriff oder Mutation bei Trainer A |
| Admin | Alle Trainer-Basissätze über Admin-SELECT-Policy; Status-/Dokumentaktionen über vorhandene Server-Routen | Keine Abhängigkeit von direkten Browserrechten auf sensible Felder |

Zusätzliche positive und negative Tests:

- Trainerregistrierung mit und ohne E-Mail-Bestätigung erzeugt genau einen korrekten `profiles`- und `trainers`-Datensatz mit Status `pending`; manipuliertes `role=admin` wird nicht übernommen.
- Öffentliche Liste, öffentliches Profil, Quiz und Client-Chatkontakt zeigen nur freigegebene Trainer und nur View-Spalten.
- Trainer-Dashboard lädt das eigene vollständige Profil; Profil, Avatar, Fachgebiete, Trainingsform, Zielgruppen, Lizenznummer und Versicherungsablauf lassen sich speichern.
- Dokument ersetzen/löschen funktioniert über `/api/trainer/verification-document`; direkte Updates beider Dokumentpfade scheitern.
- Angebot anlegen, bearbeiten, laden und deaktivieren funktioniert; inaktive eigene Angebote sind per gezielter Abfrage sichtbar; fremde/inaktive öffentliche Angebote bleiben unsichtbar; hartes DELETE und Änderung von `trainer_id` scheitern.
- Admin-Freigabe, Stripe-Connect-Synchronisierung, Buchungsanfrage und Checkout-Vorbereitung bleiben funktionsfähig.

## 6. Fehlerbehandlung und Rollback-Grenze

Vor `commit` sorgt jeder Fehler für den vollständigen Transaktions-Rollback. Nach einem erfolgreichen Commit ist der bevorzugte Weg eine geprüfte **Forward-Fix-Migration**.

Es gibt absichtlich kein SQL-Skript, das unbekannte frühere Rechte als „exakten“ oder „sicheren“ Rollback wiederherstellt. Die früheren Tabellen-/Spaltenrechte, Rollenvererbungen und Objektdefinitionen sind nicht vollständig verifiziert; ein pauschales Wiedererteilen von `ALL`, `DELETE`, `TRUNCATE`, `REFERENCES` oder `TRIGGER` würde die bekannte Least-Privilege-Absicht aufheben und könnte weitere unbekannte Rechte falsch rekonstruieren. Falls ein Notfall-Rollback betrieblich erforderlich wird, muss er aus dem gesicherten Vorab-ACL-/Policy-/Objektstand individuell erstellt, reviewed und zunächst in Staging getestet werden.

## 7. Noch offene Live-Prüfungen

Die Migration darf erst nach dokumentierter Bestätigung aller Punkte freigegeben werden:

1. Tatsächliche PostgreSQL-Hauptversion ist mindestens 15; `security_invoker=false` wird unterstützt.
2. Vollständige Tabellen- und Spalten-ACLs einschließlich `PUBLIC`, Grantor und Grant Option sind bekannt.
3. Rollenmitgliedschaften/Owner erzeugen keine zusätzlichen effektiven Rechte für `anon` oder `authenticated`; Betriebsrollen mit eigenen Grants sind erklärt.
4. Vorhandensein, Typ, Definition, Owner, Kommentar und Optionen einer eventuell bestehenden `trainers_public` sind geklärt; insbesondere keine unbekannte View mit `security_invoker=true`.
5. Eine eventuell bestehende `is_approved_trainer(uuid)` ist geklärt; die Migration überschreibt keine unbekannte Funktion.
6. `is_admin()`-Definition, Owner, `SECURITY DEFINER`, `search_path` sowie Schema-CREATE-Rechte sind sicher.
7. Aktiver Trigger auf `auth.users` und vollständige Live-Definition von `handle_new_user()` sind geprüft: Rollen-Whitelist, Default `client`, kein `admin`, atomare Anlage von `profiles` und `trainers`/`clients`.
8. Service-Role-Rechte und RLS-Bypass der verwendeten Serverpfade funktionieren in der Zielumgebung wie erwartet.
9. Storage-Policies für `avatars` und `verification-docs` sind separat geprüft; diese Migration ändert sie nicht.
10. Phase-3-Migration ist in Staging erfolgreich angewandt und der Bestand erfüllt die neuen Constraints.
11. Vollständige Rollenmatrix einschließlich erlaubter und verbotener Zugriffe wurde in produktionsgleichem Staging bestanden.
12. Default Privileges wurden read-only bewertet; eine mögliche separate Korrektur ist abgegrenzt und verändert nicht ungeprüft andere Tabellen.
