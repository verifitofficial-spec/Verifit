# RLS-Policies – Supabase Staging

Der Stand wurde am 2026-10-03 per Supabase-Konnektor direkt aus `pg_policies` geprüft und anschließend mit der Phase-2-Migration gehärtet.

| Bereich | Erlaubt |
| --- | --- |
| `trainers` | Öffentlichkeit liest nur genehmigte Trainer; eigener Trainer darf Profilfelder ändern; Status, Stripe-ID, `charges_enabled`, ID und E-Mail werden per Trigger geschützt; Admin darf verwalten. |
| `profiles` | Benutzer liest nur eigenes Profil; Admin darf verwalten; Rollenänderung durch Nicht-Admin wird per Trigger abgelehnt. |
| `clients` | Kunde liest/ändert eigenes Profil; Trainer liest nur Kunden mit eigener Buchung; Admin darf verwalten. |
| `trainer_slots` | Öffentlichkeit liest freie Slots; Trainer legt eigene freie Slots an und löscht eigene freie Slots; Kunden ändern keine Slots. |
| `bookings` | Nur zugehöriger Kunde, Trainer oder Admin liest; Änderungen erfolgen über Route Handler/RPC. |
| `messages` | Nur Absender/Empfänger lesen; Versand nur mit eigener Absender-ID und bestehender Buchung oder bestehendem Nachrichtenverlauf. |
| `client_plans` | Kunde und zugehöriger Trainer lesen; Trainer schreibt/ändert/löscht nur eigene Pläne für Kunden mit eigener Buchung. |
| `storage/verification-docs` | Privat; eigener Trainerordner und Admin lesen/löschen, eigener Trainerordner darf hochladen. |
| `storage/avatars` | Öffentliches Lesen; authentifizierter Trainer darf nur den eigenen Ordner schreiben/ändern/löschen. |

## Negative Tests

Die SQL-/RLS-Testmatrix für die Preview ist in `docs/RELEASE-REPORT.md` beschrieben. Besonders wichtig: Ein Trainer-Token darf `trainers.status`, `stripe_account_id` oder `charges_enabled` nicht auf einen anderen Wert setzen; ein Client-Token darf weder Slots noch fremde Buchungen oder fremde Pläne ändern.

## Historische Abweichungen

Vor der Migration existierten permissive Legacy-Policies, unter anderem öffentliche Insert-Policies für `trainers`, `clients`, `messages` und öffentliche Lese-/Upload-Policies für `verification-docs`. Diese wurden auf Staging entfernt. Die Auth-Trigger-Funktion verwendet weiterhin `security definer` mit leerem `search_path` und akzeptiert nur die Rollen `client` und `trainer` aus Signup-Metadaten.

## Release-Polish (04.10.2026)

- `client_trackings`: Owner darf CRUD; Trainer darf nur bei `share_data = true` und aktiver Buchung lesen.
- `appointments`, `nutrition_plans`, `workout_plans`: restriktive Teilnehmer-Policies ergänzt, damit aktiviertes RLS nicht mehr ohne Policies zu unklaren Blockaden führt.
- `messages`: tautologische Legacy-Bedingung entfernt; Insert erfordert nun eine gemeinsame aktive Buchung.
- `handle_new_user` und Trigger-Helfer sind nicht als direkte PostgREST-RPC ausführbar. `is_admin` bleibt für RLS-Ausdrücke ausführbar und gibt für anonyme Nutzer stets `false` zurück.
