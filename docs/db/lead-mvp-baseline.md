# VeriFit Lead-MVP-Datenbankbaseline

Stand: 17. Oktober 2026

## Zweck und aktiver Einstiegspunkt

Die vollständige Baseline liegt in:

`supabase/baseline/20261017120000_lead_mvp_baseline.sql`

Sie ist für eine **leere Supabase-Datenbank mit PostgreSQL 15+** vorgesehen. `auth` und `storage` müssen als Supabase-Systemschemas bereits vorhanden sein. Die Baseline bricht ab, sobald eines der verwalteten Objekte, Buckets oder der Auth-Trigger bereits existiert. Dadurch kann sie nicht versehentlich über einen unbekannten Bestand gelegt werden.

Die Datei liegt absichtlich noch nicht unter `supabase/migrations/`: Die dort vorhandenen älteren Dateien sind keine reproduzierbare Leerdatenbank-Kette. Insbesondere setzt `20261005120000_final_release_tracking_and_account_deletion.sql` ausgeschlossene Tabellen voraus und `20261011193000_trainers_offers_least_privilege.sql` setzt ein bereits bestehendes Legacy-Schema voraus.

Für eine neue MVP-Umgebung ist deshalb ausschließlich die Baseline der aktive SQL-Einstiegspunkt. Die vorhandenen Dateien bleiben unverändert als Legacy-/Delta-Historie erhalten:

- `20261005120000_final_release_tracking_and_account_deletion.sql`: nicht aktiv; Nicht-MVP-Abhängigkeiten.
- `20261011170000_quiz_matching_offer_metadata.sql`: in die Baseline integriert; nicht zusätzlich ausführen.
- `20261011193000_trainers_offers_least_privilege.sql`: Sicherheitsideen kontrolliert integriert; nicht zusätzlich ausführen.
- `20261017003000_inquiry_core.sql`: Anfragekern kontrolliert integriert; nicht zusätzlich ausführen.

Vor einer Remote-Anwendung ist in einem eigenen freigegebenen Schritt zu entscheiden, ob die Legacy-Dateien archiviert/verschoben und die Baseline als alleinige Datei nach `supabase/migrations/` übernommen wird. Ohne diese Bereinigung darf `supabase db reset` gegen den heutigen Standardordner nicht als Baseline-Test verwendet werden.

## Enthaltene Datenbankobjekte

### Tabellen und Spalten

| Objekt | Relevante Spalten | Zweck |
|---|---|---|
| `profiles` | `id`, `role`, `created_at`, `updated_at` | Autorisierungsrolle; `client`, `trainer`, `admin` |
| `clients` | `id`, `name`, `email`, `terms_accepted_at`, `health_consent_at`, Zeitstempel | Minimales Kundenprofil und Nachweis der aktuell erhobenen Einwilligungen |
| `trainers` | Identität, Kontakt, Profilfelder, `status`, Fachgebiete, `target_levels`, Verifizierungsdaten, öffentliche optionale Felder, Zeitstempel | Privates vollständiges Trainerprofil |
| `trainer_offers` | Titel, Typ, Dauer, Preis, Trainingsform, Preismodell, Einheitenzahl, Aktivstatus, Zeitstempel | Preis- und Angebotsmatching |
| `inquiries` | Teilnehmer, optionale Angebotsreferenz, Kontakt-Momentaufnahmen, Nachricht, Status, Idempotenz, Zeitstempel | Unverbindliche Kontaktanfragen |
| `inquiry_status_events` | Anfrage, alter/neuer Status, Akteur, Rolle, Zeitpunkt | Unveränderbarer Statusverlauf |

Nicht enthalten sind Slots, Buchungen, Zahlungen, Stripe, Chat, Realtime, Pläne, Tracking oder Lebensmittel.

### Constraints und Fremdschlüssel

- Alle fachlichen Status-, Rollen-, Trainingsform-, Preis- und Angebotsmodelle sind per `CHECK` begrenzt.
- Discovery-Angebote müssen Preis `0` haben; bezahlte Angebote einen positiven Preis.
- Pakete benötigen eine positive ganzzahlige Einheitenzahl; andere Preismodelle dürfen keine Paket-Einheiten speichern.
- Trainerregistrierungen beginnen immer mit `pending`.
- Profile verweisen mit `ON DELETE CASCADE` auf `auth.users`.
- Kontaktanfragen verwenden für Client und Trainer `ON DELETE RESTRICT`. Dadurch kann eine Account-Löschung vorhandene Leads nicht versehentlich kaskadierend vernichten.
- Gelöschte/deaktivierte Angebote werden in bestehenden Anfragen über `offer_id ON DELETE SET NULL` und die gespeicherte Titel-Momentaufnahme nachvollziehbar gehalten.
- `changed_by` verhindert mit `ON DELETE RESTRICT`, dass ein Akteur mit vorhandenem Statusverlauf unbemerkt entfernt wird.

### Indizes

- Freigegebene Trainer: partieller Index auf `(name, id)` für `status = 'approved'`.
- Angebote: `(trainer_id, is_active, created_at)`.
- Anfragen: `(client_id, created_at desc)` und `(trainer_id, created_at desc)`.
- Statusverlauf: `(inquiry_id, changed_at)` und `changed_by`.
- Fremdschlüsselspalten sind damit für die relevanten Lese- und Löschpfade indexiert.

### View

`trainers_public` ist eine `security_invoker`-View mit einer expliziten Whitelist:

- `id`, `name`, `bio`, `city`, `service_mode`, `specialties`, `target_levels`
- `qualifications`, `avatar_url`, `instagram_url`, `tiktok_url`
- `hourly_rate`, `availability_status`

Die View liest ausschließlich aus der privaten, fest typisierten Funktion `verifit_private.public_trainers()`. Diese Funktion filtert auf `status = 'approved'` und kann nur die genannten Rückgabespalten liefern. Dadurch benötigt `anon` keinerlei Leserecht auf der privaten Basistabelle. E-Mail, Status, Lizenznummer, Versicherungsablauf und Dokumentpfade werden nicht ausgegeben. Quiz, Liste und öffentliches Profil verwenden ausschließlich diese View.

## Rollen- und Signup-Sicherheit

`verifit_private.handle_new_user()` akzeptiert aus `raw_user_meta_data.role` ausschließlich den Wert `trainer`. Jeder andere Wert – einschließlich `admin` – wird zu `client`. Ein Admin muss bewusst außerhalb des öffentlichen Signup-Flows durch einen autorisierten Datenbank-/Serviceprozess provisioniert werden.

Der Trigger legt atomar an:

- immer eine Zeile in `profiles`,
- für `client` eine Zeile in `clients`,
- für `trainer` eine Zeile in `trainers` mit `status = 'pending'`.

Zeitstempel aus Metadaten werden fehlertolerant geparst; ungültige Werte werden nicht als Berechtigungsinformation verwendet.

## Grants und RLS

Für jede öffentliche MVP-Tabelle sind RLS und `FORCE ROW LEVEL SECURITY` aktiv.

| Rolle | Zugriff |
|---|---|
| `anon` | Whitelist-Spalten freigegebener Trainer über `trainers_public`; aktive Angebote ausschließlich freigegebener Trainer |
| Client | eigenes `profiles`-/`clients`-Profil, eigene Anfragen und deren Statusverlauf, öffentliche Trainer/Angebote |
| Trainer | eigenes vollständiges Trainerprofil, eigene Angebote, an ihn gerichtete Anfragen und Statusverläufe, öffentliche Trainer/Angebote |
| Admin | alle Trainer über RLS; Status- und Dokumentaktionen erfolgen weiterhin über serverseitige Service-Role-Routen |
| `service_role` | erforderlicher Serverzugriff für Adminaktionen, Dokumentprüfung, Inquiry-Vorprüfung und Kontolöschung |

Trainer erhalten nur `UPDATE` auf die tatsächlich im Dashboard pflegbaren Spalten. `status`, `email`, Dokumentpfade und Signup-Zeitstempel sind nicht direkt beschreibbar. Ein zusätzlicher Trigger blockiert Änderungen geschützter Felder als Defense-in-Depth.

Kontaktanfragen sind direkt nur lesbar. Erstellung und Statuswechsel erfolgen ausschließlich über die geprüften Funktionen `create_inquiry` und `transition_inquiry_status`.

## Funktionen und Trigger

| Objekt | Sicherheitsmodell |
|---|---|
| `verifit_private.is_admin()` | `SECURITY DEFINER`, leerer `search_path`, nur `authenticated`/`service_role` ausführbar |
| `verifit_private.is_approved_trainer(uuid)` | schmale öffentliche Statusprüfung für Offer-RLS; keine privaten Rückgabedaten |
| `verifit_private.public_trainers()` | schmale öffentliche Approved-Whitelist als Quelle der `security_invoker`-View |
| `verifit_private.handle_new_user()` | Auth-Trigger, `SECURITY DEFINER`, nicht direkt ausführbar |
| `verifit_private.set_updated_at()` | Triggerfunktion, keine direkte öffentliche Ausführung |
| `verifit_private.prevent_protected_trainer_changes()` | zusätzlicher Schutz sensibler Trainerspalten |
| `create_inquiry(...)` | `SECURITY DEFINER`, nur `authenticated`, prüft Clientrolle, Trainerfreigabe, Angebot, Idempotenz und Rate-Limit |
| `transition_inquiry_status(...)` | `SECURITY DEFINER`, nur `authenticated`, prüft Trainerrolle, Eigentümer und Übergang |
| `assert_user_deletion_allowed(uuid)` | nur `service_role`, blockiert bei jeder personenbezogenen Inquiry-Abhängigkeit |
| `delete_user_data(uuid)` | nur `service_role`, wiederholt die Vorprüfung und löscht ausschließlich freigegebene MVP-Profildaten |

Alle privilegierten Funktionen verwenden vollständig qualifizierte Objektnamen und einen leeren `search_path`.

## Storage

| Bucket | Sichtbarkeit | Limit | Typen | Zugriff |
|---|---|---:|---|---|
| `avatars` | öffentlich | 5 MB | JPEG, PNG, WebP | Schreiben/Ersetzen/Löschen nur im eigenen UUID-Ordner |
| `verification-docs` | privat | 10 MB | PDF | Lesen/Schreiben/Löschen nur im eigenen UUID-Ordner; Adminzugriff nur serverseitig über signierte URL |

Upserts bei Avataren besitzen die erforderlichen `SELECT`-, `INSERT`- und `UPDATE`-Policies. Die Service Role kann beim Löschen eines Kontos den jeweiligen Ordner entfernen.

## Lösch- und Aufbewahrungskonzept

Es ist keine rechtliche Aufbewahrungsfrist kodiert. Für Kontaktanfragen fehlt derzeit eine freigegebene Entscheidung, ob sie gelöscht, anonymisiert oder befristet aufbewahrt werden müssen.

Darum gilt fail-closed:

1. `assert_user_deletion_allowed` blockiert Nutzer mit einer Anfrage oder einem Statusereignis.
2. Die API ruft diese Prüfung vor Storage-Löschungen auf.
3. `delete_user_data` wiederholt die Prüfung innerhalb der Datenbanktransaktion.
4. Nur Konten ohne Inquiry-Abhängigkeiten können vollständig automatisch gelöscht werden.

Nach fachlicher und rechtlicher Freigabe muss diese Regel durch eine eigene Migration ersetzt und mit konkreten Client-/Trainerfällen getestet werden. Es wird bewusst keine Frist erfunden.

## Reproduzierbare lokale Laufzeitvalidierung

Da auf dem Entwicklungsrechner weder Supabase CLI, Docker noch ein systemweites PostgreSQL vorhanden sind, nutzt das Repository für die Datenbank-Laufzeittests die gepinnte Dev-Abhängigkeit `@electric-sql/pglite@0.5.10`. PGlite führt echtes PostgreSQL in WebAssembly aus; die Datenbank wird für jeden Testlauf neu und ausschließlich im Arbeitsspeicher angelegt.

Die Fixture `supabase/tests/fixtures/supabase_platform_minimal.sql` bildet nur die von der Baseline vorausgesetzten Supabase-Plattformverträge nach:

- Rollen `anon`, `authenticated`, `service_role` und `supabase_admin`,
- `auth.users` und `auth.uid()`,
- `storage.buckets`, `storage.objects` und `storage.foldername()`.

Sie ist ausdrücklich keine Migration und wird niemals auf eine Supabase-Umgebung angewendet. Weder Legacy-Migrationen noch Remote-Verbindungen sind Teil des Testlaufs.

Reproduzierbare Befehle ab Repository-Wurzel:

```powershell
npm ci
npm run test:db
```

Alle statischen Anwendungs- und Datenbanktests zusammen:

```powershell
npm run test:all
```

`npm run test:db` führt in dieser Reihenfolge aus:

1. frische In-Memory-PostgreSQL-Instanz starten,
2. minimale Supabase-Plattform-Fixture installieren,
3. ausschließlich `supabase/baseline/20261017120000_lead_mvp_baseline.sql` anwenden,
4. `supabase/tests/lead_mvp_baseline_catalog.sql` tatsächlich ausführen,
5. Signup-, Rollen-, RLS-, RPC-, Storage- und Löschfälle mit echten PostgreSQL-Rollen testen,
6. die Instanz vollständig verwerfen.

### Laufzeit-Testmatrix

Die folgenden Prüfungen müssen auf einer frischen lokalen Supabase-Instanz ausgeführt werden:

| Akteur | Erlaubt | Verboten |
|---|---|---|
| `anon` | freigegebene Trainer und deren aktive Angebote lesen | pending/rejected Trainer, private Trainerspalten, Inquiries, Dokumente |
| Client A | eigenes Profil, eigene Inquiry lesen/erstellen | Profil/Inquiry von Client B, Statuswechsel |
| Client B | eigene Daten | Daten von Client A |
| Trainer A | eigenes Profil/Angebote, eigene Inquiries lesen und zulässig ändern | Selbstfreigabe, Trainer-B-Inquiries/-Dokumente |
| Trainer B | eigene Daten | Trainer-A-Daten außerhalb öffentlicher Whitelist |
| Admin | Trainer prüfen/freigeben, referenzierte Dokumente serverseitig öffnen | öffentliche Signup-Selbsterteilung der Adminrolle |
| Kontolöschung | Konto ohne Inquiry-Abhängigkeit | Konto mit Inquiry-Abhängigkeit bis zur Aufbewahrungsentscheidung |

### Grenzen des lokalen Tests

Der Test deckt PostgreSQL-Ausführung, Trigger, Grants, RLS, Funktionen und Policies ab. Er startet jedoch nicht die vollständigen Supabase-Dienste. Deshalb bleiben vor einer Aktivierung zusätzlich erforderlich:

- ein einmaliger Test mit Supabase CLI und Docker gegen ein frisches lokales Supabase-Stack,
- End-to-End-Aufrufe über GoTrue, PostgREST und die Storage-API,
- Prüfung von Dateigröße und MIME-Typ durch den echten Storage-Dienst,
- `supabase test db` und die Supabase Database Advisors.

Diese Punkte dürfen erst als bestanden gelten, wenn Docker und Supabase CLI verfügbar sind. Die aktive Migrationskette darf weiterhin nur nach separater Freigabe umgestellt werden.
