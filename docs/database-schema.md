# Datenbankschema (Supabase / Postgres)

Abgeleitet aus den Queries im Code — es gibt keine zentrale Migrationsdatei im Repo, dieses Dokument ist der Referenzpunkt.

## `profiles`
Zentrale Rollentabelle, unabhängig von `trainers`/`clients`.
- `id` (= Supabase Auth User ID)
- `role`: `'client' | 'trainer' | 'admin'`

Wird bei jedem Login geprüft (siehe @docs/auth-flow.md). Befüllung erfolgt offenbar über einen DB-Trigger beim `signUp` (Kommentar im Code: *"Übergibt die Rolle an den Datenbank-Trigger für die profiles-Tabelle"*), der Trigger selbst ist nicht im Repo enthalten.

## `trainers`
- `id` (= Auth User ID beim Trainer-Signup)
- `name`, `email`, `bio`
- `status`: `'pending' | 'approved' | 'rejected'` (Admin-Freigabe)
- `city`, `service_mode` (z.B. „Vor Ort & Online“, „Hybrid“)
- `specialties`: komma-separierter String (kein Array/Join!) — z.B. `"Muskelaufbau, Reha, Athletiktraining"`. Filterung erfolgt clientseitig via `.includes()`
- `license_number`, `liability_insurance_expiry`
- `license_document_path`, `insurance_document_path` — Pfade im privaten Storage-Bucket `verification-docs`
- `package_category`, `package_duration`, `package_price`
- `availability_status`
- `hourly_rate`, `qualifications`, `avatar_url`, `instagram_url`, `tiktok_url` (im Profil-Detail verwendet, teils optional)

## `clients`
- `id` (= Auth User ID)
- `name`, `email`
- `height`, `age`, `gender`, `goal`, `activity_level` (für Mifflin-St.-Jeor-Berechnung)
- `weight` (wird bei jedem Tracking-Eintrag synchronisiert)
- `share_data`: boolean — Freigabe der Körperdaten für den Trainer

**Bekannte Inkonsistenz:** Der Login-Flow (`client/login/page.tsx`) legt fehlende `clients`-Einträge automatisch per Upsert-ähnlicher Logik an (erst per E-Mail löschen, dann mit korrekter Auth-ID neu einfügen). Im Trainer-Dashboard wird dagegen teils aus einer Tabelle `users` gelesen (`loadClients()` in `trainer/[id]/dashboard/page.tsx`), nicht aus `clients`. Diese Diskrepanz vor Erweiterungen prüfen/klären.

## `trainer_slots`
- `id`, `trainer_id`
- `slot_date` (Date-String), `slot_time` (Time-String, z.B. `"14:00:00"`)
- `title`, `price`
- `status`: `'free' | 'pending' | 'booked'`
- `client_email`, `client_name` (bei Buchung teils direkt in `title` eingebettet, teils als eigene Spalten — uneinheitlich, siehe `trainer/[id]/page.tsx` vs. `quiz/page.tsx`)

## `client_plans`
Generischer Container für Trainings- und Ernährungspläne (ein Table für beide Typen).
- `trainer_id`, `user_id` (= Client)
- `plan_type`: `'workout' | 'nutrition'`
- `title`
- `content`: JSON-String (via `JSON.stringify`) mit Struktur `{ duration_period, days: [...Templates...], schedule: { [dateStr]: templateName } }`
- `created_at`

Beim Lesen muss `content` mit `JSON.parse` deserialisiert werden (im aktuellen Code wird `client_plans` clientseitig nur geschrieben, nicht wieder ausgelesen/angezeigt — das Client-Dashboard liest stattdessen direkt aus `nutrition_plans`/`workout_plans`, siehe unten. Das deutet auf zwei parallele, nicht synchronisierte Datenmodelle hin).

## `nutrition_plans`
- `client_id`, `day_of_week` (deutscher Wochentagsname, z.B. `"Montag"`)
- `meal_title`, `description`
- `calories`, `protein`, `carbs`, `fat`

## `workout_plans`
- `client_id`, `day_of_week`
- `exercise_name`, `sets`, `reps`, `weight`

## `foods`
- `id`, `name`
- `kcal`, `protein`, `carbs`, `fat` — jeweils bezogen auf 100g

## `client_trackings`
- `client_id`, `created_at`
- `weight`, `water`, `calories`, `sleep`, `mood`
- Ein Eintrag pro Tag: beim Speichern wird geprüft, ob für den heutigen Tag (`toISOString().split('T')[0]`) bereits ein Eintrag existiert, dann Update statt Insert

## `messages`
- `sender_id`, `receiver_id`, `content`, `created_at`
- Realtime-Subscription auf `INSERT` gefiltert nach `receiver_id`

## Storage Buckets
- `verification-docs`: privater Bucket, Zugriff nur über `createSignedUrl()` mit 60 Sekunden Gültigkeit (siehe Trainer-Dashboard und Admin-Seite)
