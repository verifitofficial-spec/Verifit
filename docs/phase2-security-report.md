# Phase 2 – Security- und Authentifizierungsbericht

## Gegen die Staging-Exporte geprüfte Punkte

Die Exporte vom 03.10.2026 zeigen, dass Phase 1 zwar die serverseitigen Booking-Endpunkte schützt, die zugrunde liegenden Browserrechte aber noch nicht ausreichend eingeschränkt waren. Besonders relevant waren der Signup-Trigger, die öffentlichen Trainerdaten und die permissiven Policies.

| Punkt | Befund im Export | Phase-2-Maßnahme |
| --- | --- | --- |
| S1 Rollen-Eskalation | `handle_new_user` übernahm `raw_user_meta_data.role` unverändert; dadurch war `admin` möglich. | Trigger whitelisted ausschließlich `client`/`trainer`, Default `client`; Domainprofil wird im Trigger angelegt. |
| S2 Trainerstatus | Trainer-Update war über E-Mail und eine Status-Schutz-Policy abgesichert, aber die Policy war permissiv und nicht zentral. | ID-basierter Zugriff, geschützte Status-Trigger-Funktion und Admin-only Status-Route bleiben verbindlich. |
| S3 öffentliche Spalten | `trainers` war mit `SELECT true` und `select('*')` öffentlich. | `trainers_public` als explizite Whitelist; öffentliche Seite, Liste und Quiz verwenden ausschließlich die View. |
| S4 Kontakte | `clients`/`trainers` wurden im Chat global geladen. | Kontakte werden aus eigenen bestätigten `bookings` abgeleitet; Nachrichtenschreiben erfordert bestätigte Buchung. |
| S5/S6 Dashboard/Lookups | Dashboard-Zugriff und Trainer-Lookups nutzten teilweise E-Mail. | Cookie-Proxy, User-ID-Prüfung und ID-basierte Trainerabfragen; unsichere E-Mail-Heilungslogik entfernt. |
| S7 Session | `proxy.ts` ließ geschützte Routen vollständig durch; Session lag nur im lokalen Storage. | `@supabase/ssr` Browser-/Serverclient und Next.js-16-`proxy.ts` mit `getUser()` und Rollencheck. |
| S9 Passwort | Mindestlänge 6, kein Reset-Flow. | Mindestlänge 8 sowie `/forgot-password` und `/reset-password`. |

## Datenbankmigration

`supabase/migrations/20261003144500_phase2_security_and_auth.sql` aktiviert die restriktiven Policies, erstellt `trainers_public`, schützt den Auth-Trigger, legt `consents` an, begrenzt Storage-Zugriff und ersetzt `respond_to_booking` so, dass ein bezahlter Slot erst nach Stripe-Bestätigung `booked` wird. Die Migration enthält einen Rollback-Hinweis und verändert keine bestehenden Daten durch `DROP COLUMN`.

Das Test-Harness `supabase/tests/rls/phase2.sql` enthält die erwartete Matrix für anon, Client A, Trainer B und Admin. Es ist mit Staging-Fixtures auszuführen; echte IDs oder Secrets gehören nicht in das Repository.

## Bekannte Schema-Abweichungen

Der DB-Export enthält keine Spalten `avatar_url`, `qualifications` und `hourly_rate`, obwohl ältere Codepfade sie erwarteten. Phase 2 verwendet diese Spalten daher nicht mehr in der öffentlichen View. Die fehlende Tabelle `client_plans` sowie weitere Dashboard-Modellabweichungen bleiben für Phase 6 dokumentiert.

Der Export enthält außerdem einen offenen Storage-Hinweis: Bucket-Liste und Größen-/MIME-Limits sind nicht vollständig exportiert. Die Migration schränkt die vorhandenen `verification-docs`-Policies ein; Bucket-Erstellung und Limits müssen vor Phase 5 gegen das Staging-Projekt verifiziert werden.

## Offene Staging-Abnahmen

Die Migration wurde im Sandbox-Workspace statisch geprüft, aber nicht gegen Supabase ausgeführt, weil keine Supabase-Projektverbindung beziehungsweise kein SQL-Ausführungszugang in dieser Session verfügbar ist. Vor dem Merge muss der Test-Harness gegen Staging laufen, der Security Advisor ohne neue Warnung bleiben und die Vercel-Preview mit Testkonten für Signup, Login, geschützte Dashboards, Buchung und Chat durchgespielt werden.
