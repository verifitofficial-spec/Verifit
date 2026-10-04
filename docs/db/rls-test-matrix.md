# RLS-Testmatrix – Phase 2

Die Policies wurden auf dem Supabase-Staging-Projekt geprüft. Die folgenden Tests sind für die Vercel-Preview mit vier Testkonten auszuführen; ein Supabase-Service-Role-Query kann RLS nicht sinnvoll simulieren und wird daher nicht als Rollen-Test gezählt.

| Rolle | Aktion | Erwartetes Ergebnis |
| --- | --- | --- |
| anon | genehmigte Trainer und freie Slots lesen | erfolgreich |
| anon | `trainers` einfügen oder `messages` senden | abgelehnt |
| anon | `verification-docs` lesen/hochladen | abgelehnt |
| client | eigenes `clients`-Profil lesen/ändern | erfolgreich |
| client | eigene Buchungen lesen und `cancel_booking` für eigene pending/accepted-Buchung aufrufen | erfolgreich; Slot wird freigegeben |
| client | fremde Buchung lesen/ändern oder `trainer_slots` ändern | abgelehnt |
| client | `client_plans` des eigenen `user_id` lesen | erfolgreich |
| client | fremden Plan lesen/ändern oder fremden Chatkontakt ohne Buchung/Verlauf öffnen | abgelehnt bzw. nicht gelistet |
| trainer | eigene freien Slots anlegen/löschen und eigenes Profil bearbeiten | erfolgreich |
| trainer | eigenen Status auf `approved`, eigene Stripe-ID oder `charges_enabled` setzen | abgelehnt durch Trigger |
| trainer | zugehörige Kunden/Buchungen/Pläne lesen | erfolgreich |
| trainer | fremde Kunden, fremde Pläne oder fremde Slots ändern | abgelehnt |
| trainer | `respond_to_booking` für eigene pending-Buchung | erfolgreich; Statuswechsel gemäß Preis |
| admin | Trainerstatus, Prüfungsdokumente und alle Teilnehmerdaten verwalten | erfolgreich |
| admin | fremde geschützte Ressource über Admin-Route lesen | erfolgreich, wenn Route die Rollenprüfung passiert |

### Release-Polish-Ergänzungen (04.10.2026)

| Rolle | Aktion | Erwartetes Ergebnis |
|---|---|---|
| anon | `appointments`, `client_trackings`, Legacy-Pläne oder Nachrichten lesen/schreiben | abgelehnt |
| client | eigenes Tracking lesen/anlegen/ändern/löschen | erfolgreich |
| client | Tracking eines anderen Kunden ändern | abgelehnt |
| trainer | Tracking eines Kunden mit `share_data = true` und aktiver Buchung lesen | erfolgreich |
| trainer | Tracking ohne Opt-in oder ohne aktive Buchung lesen | abgelehnt |
| client/trainer | Nachricht ohne gemeinsame aktive Buchung senden | abgelehnt |
| client/trainer | Nachricht mit gemeinsamer pending/accepted/confirmed Buchung senden | erfolgreich |
| trainer | kostenpflichtige Buchung annehmen | Buchung `accepted`, Slot bleibt `pending` |

## Beweispunkte

Nach jedem Test die HTTP-/Supabase-Fehlermeldung und den Datenbankstand prüfen. Für den negativen Trainer-Test muss sichergestellt sein, dass `trainers.status`, `stripe_account_id` und `charges_enabled` unverändert bleiben. Für den Expire-Test eine Testbuchung mit vergangener `payment_due_at` verwenden und den `pg_cron`-Job oder `public.expire_unpaid_bookings()` prüfen.
