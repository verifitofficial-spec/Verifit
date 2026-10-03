# Release Report – Phase release-polish

## Erledigt

- Supabase-Staging-Projekt identifiziert und read-only getestet.
- Migration `20261003153000_release_polish_profile_and_auth.sql` auf Staging ausgeführt.
- `trainers` um `avatar_url`, `hourly_rate`, `qualifications`, `slug`, `stripe_account_id` und `charges_enabled` erweitert.
- Öffentlicher `avatars`-Bucket mit Größen-/MIME-Limit und Ordner-Policies angelegt.
- Signup-Trigger auf erlaubte Rollen `client`/`trainer` begrenzt; Trainer-/Kundenzeile wird beim Signup atomar angelegt.
- Client-Heilungslogik ohne E-Mail-Löschung entfernt; Trainer-Login und Dashboard nutzen die Auth-ID statt E-Mail-Lookups.
- Profilbild-Upload im Trainer-Dashboard sowie Anzeige in Trainerliste, Quiz-Ergebnis und öffentlichem Trainerprofil ergänzt.
- Freie Termine im Kundenprofil als Datums-/Zeitkarten statt flacher Liste dargestellt.
- Stripe-Connect-Testmodus-Onboardingroute ergänzt; `account.updated` aktualisiert `charges_enabled`.

## Annahmen

- `bywuucdphvrbrnjtjkkb` ist das dokumentierte Supabase-Staging-Projekt.
- Stripe wird ausschließlich mit Test-Keys betrieben; die Vercel-Umgebung muss `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` und `NEXT_PUBLIC_APP_URL` setzen.
- Der bestehende Auth-Trigger heißt `on_auth_user_created`; die Migration ersetzt ihn idempotent.
- Name und Bio werden nach dem atomaren Signup-Trigger mit der aktiven Benutzersession ergänzt.

## Risiken / offen

- Vercel CLI war in der Sandbox nicht installiert und es waren keine Deployment-Umgebungsvariablen vorhanden; ein echter Vercel-Preview-Login-/Stripe-/Upload-Durchlauf ist daher noch nicht ausgeführt.
- Die bestehenden RLS-Policies außerhalb von Avatar und Signup sind weiterhin nicht vollständig gemäß Release-Plan gehärtet.
- `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` müssen in Vercel vorhanden sein; Service-Role bleibt ausschließlich serverseitig.
- Der öffentliche Trainer-Query nutzt weiterhin die bestehende Tabelle statt einer dedizierten Public-View; die Phase-2-Sicherheitsmigration sollte das als nächsten Schritt ersetzen.

## Checks

- `npx tsc --noEmit` ✅
- `npm run lint` ✅ (Bestandscode-Warnungen zu `any`/`img` bleiben)
- `npm run build` ✅
- `git diff --check` ✅
- Supabase `list_projects` ✅, Staging `ACTIVE_HEALTHY`
- Supabase read-only Trainerabfrage ✅; nach Migration sind Avatar-/Stripe-Spalten sichtbar.

## Manuelle Testschritte für Vercel Preview

1. Mit einem Testkunden registrieren; bei aktivierter E-Mail-Bestätigung den Link bestätigen und unter `/client/login` einloggen.
2. `/quiz` öffnen, Quiz vollständig durchführen und prüfen, dass genehmigte Trainer erscheinen.
3. Als Trainer unter `/trainer/register` registrieren, anmelden und im Dashboard ein JPG/PNG/WebP-Profilbild bis 5 MB hochladen.
4. Als Admin den Trainer genehmigen; danach `/trainer/list` und das Quiz erneut öffnen und das Profilbild prüfen.
5. Im Trainer-Dashboard im Kalender mehrere freie Slots anlegen.
6. Als Kunde das Trainerprofil öffnen, ein Angebot wählen und die freien Termine in den Datums-/Zeitkarten auswählen.
7. Buchung als Kunde anfragen; als Trainer unter Buchungsanfragen annehmen oder ablehnen.
8. Stripe-Testkonto verbinden; Stripe-Connect-Onboarding durchlaufen und danach `account.updated`-Webhook im Testmodus prüfen.
9. Bezahltes Angebot im Testmodus mit Stripe-Testkarte durchlaufen und prüfen, dass Webhook Buchung/Slot finalisiert.
