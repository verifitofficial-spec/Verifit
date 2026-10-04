# Release Report – Phase 3 Payment Lifecycle

## Erledigt

- Vercel-Buildfehler in `/admin` behoben: `NEXT_PUBLIC_SUPABASE_URL` wird jetzt bereinigt und validiert; leere oder fehlerhaft quotierte Werte brechen den Prerender-Build nicht mehr.
- `.env.example` mit den benötigten Staging-/Testvariablen ergänzt. Die Vercel-Variable muss trotzdem auf die echte Supabase-URL gesetzt werden; der Fallback ist nur ein Build-Schutz und kein funktionsfähiger Datenbankzugang.
- Kostenpflichtige Buchungsanfragen werden nur akzeptiert, wenn der genehmigte Trainer ein aktives Stripe-Connect-Konto mit `charges_enabled` hat.
- Checkout nutzt Destination Charges zum Trainerkonto und berechnet standardmäßig 15 % Plattformgebühr (`PLATFORM_FEE_PERCENT`).
- `account.updated` aktualisiert weiterhin `charges_enabled`.
- Webhook behandelt `checkout.session.expired` und `checkout.session.async_payment_failed`; akzeptierte Buchungen werden abgelaufen und ihr Slot freigegeben.
- Serverroute `POST /api/cancel-booking` ergänzt: Teilnehmerprüfung, 24-Stunden-Regel für Kunden, Trainerstorno und idempotenter Stripe-Full-Refund im Testmodus.
- Admin-Control-Center zeigt die letzten 100 Buchungen, Status, Betrag, Stripe-Session und Refund-Markierung.
- Staging-Migration `20261003220000_phase3_payment_lifecycle.sql` mit `cancelled_at`, `refund_id` und `refunded_at` angewendet.

## Annahmen

- Stripe bleibt ausschließlich im Testmodus.
- Plattformgebühr ist gemäß Release-Plan standardmäßig 15 % und kann über `PLATFORM_FEE_PERCENT` angepasst werden.
- Kundenstorno ist bis 24 Stunden vor Beginn kostenfrei; Trainerstorno löst einen vollständigen Refund aus.
- Vercel-Umgebungsvariablen werden nicht durch den Code erfunden oder überschrieben. Der Build-Fallback verhindert nur einen kompletten Prerender-Abbruch.

## Risiken / offen

- Der aktuelle Vercel-Konnektor ist in dieser Sitzung deaktiviert; deshalb wurde kein Vercel-Environment-Secret verändert und kein externer Deployment-Button bestätigt.
- Für eine funktionierende Preview muss `NEXT_PUBLIC_SUPABASE_URL` in Vercel als echte URL ohne Platzhalter/zusätzliche Anführungszeichen gesetzt werden. Gleiches gilt für `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Stripe-Test-Connect, Webhook-Signatur, Refund und Resend-Mail müssen mit realen Testkonten in der Preview durchgespielt werden.

## Checks

- `npx tsc --noEmit`: ✅
- `npm run lint`: ✅ (bestehende Warnungen zu `any`/`img`, 0 Errors)
- `npm run build`: ✅
- `git diff --check`: ✅
- Supabase Phase-3-Migration: erfolgreich auf Staging angewendet

## Manuelle Testschritte

1. In Vercel die beiden `NEXT_PUBLIC_SUPABASE_*`-Variablen für Preview prüfen und eine neue Deployment-Version starten.
2. Kunde und Trainer registrieren; E-Mail-Bestätigung und Login testen.
3. Trainer unter Stripe-Testmodus verbinden und `charges_enabled` über `account.updated` prüfen.
4. Kostenloses Angebot buchen; Trainer nimmt an; Status muss `confirmed` werden.
5. Bezahltes Angebot buchen; ohne Connect-Aktivierung muss die Anfrage abgelehnt werden.
6. Mit aktivem Connect-Konto Checkout mit Stripe-Testkarte durchführen; Webhook muss Buchung bestätigen und Slot auf `booked` setzen.
7. Eine bezahlte Testbuchung über das Kundenportal stornieren; Stripe-Testrefund, `refund_id`, `refunded_at` und freie Slotanzeige prüfen.
8. Eine `accepted`-Buchung ablaufen lassen; `pg_cron` bzw. `expire_unpaid_bookings` muss Status `expired` und Slot `free` setzen.
9. Im Admin-Control-Center Buchungsstatus und Refund-Markierung prüfen.

## Release-Polish: Auth, RLS und Dashboard (04.10.2026)

### Ursachen und Fixes

- **Client-Registrierung:** Nach `signUp()` wurde zusätzlich ein Browser-Update auf `clients` ausgeführt. Bei aktivierter E-Mail-Bestätigung existiert noch keine Session; der Write wurde deshalb durch RLS blockiert. Der DB-Trigger ist jetzt die einzige Quelle für `profiles` und `clients`/`trainers`; die UI macht keinen zweiten Insert/Update mehr.
- **Auth-Trigger:** Die Rolle wird weiterhin ausschließlich auf `client`/`trainer` begrenzt; `admin` kann nicht über Signup erzeugt werden. Trigger-Helfer und `handle_new_user` sind nicht als PostgREST-RPC ausführbar.
- **RLS:** `client_trackings` hatte eine globale `ALL`-Policy. Sie wurde durch Owner-CRUD sowie Trainer-Read nur bei Opt-in und aktiver Buchung ersetzt. Die Legacy-Tabellen `appointments`, `nutrition_plans` und `workout_plans` hatten RLS ohne Policies; sie haben jetzt eng begrenzte Teilnehmer-Policies. Eine tautologische Nachrichten-Policy wurde entfernt.
- **Schemaabweichung:** Der Code synchronisiert `clients.weight`, die Staging-Tabelle enthielt die Spalte nicht. Migration `20261004160000_release_polish_auth_rls_and_dashboard` ergänzt sie additiv.
- **Trainerprofil:** Leere Felder werden nicht mehr mit `service_mode`/`availability_status` vorausgefüllt. Werte kommen ausschließlich aus dem geladenen Trainerdatensatz.
- **Terminstatus:** `respond_to_booking` setzte bei kostenpflichtiger Annahme fälschlich den Slot auf `booked`, obwohl der Slot bis zum Stripe-Webhook `pending` bleiben muss. Die RPC ist korrigiert; der Webhook bleibt der einzige Übergang zu `booked`.

### Staging

- Migration `20261004160000_release_polish_auth_rls_and_dashboard` erfolgreich auf Supabase-Staging `bywuucdphvrbrnjtjkkb` angewendet.
- Live-Prüfung bestätigt `clients.weight` und die neuen Policies für Tracking, Nachrichten und Legacy-Tabellen.
- Security Advisor zeigt die drei zuvor policy-losen Tabellen nicht mehr. Übrig bleiben die bekannten Hinweise zu SECURITY-DEFINER-Funktionen und deaktiviertem Leaked-Password-Schutz; die Funktionen werden für RLS/Trigger benötigt, direkte RPC-Rechte sind soweit möglich entzogen.

### Checks

- `npx tsc --noEmit`: ✅
- `npm run lint`: ✅ (bestehende 41 Warnungen, 0 Errors)
- `npm run build`: ✅
- `git diff --check`: ✅

### Manuelle Testschritte für Preview/Staging

1. Neue Client-E-Mail mit gültigem Passwort registrieren; bei aktivierter Bestätigung darf kein „Profil konnte nicht gespeichert werden“-Fehler erscheinen. Nach Bestätigung einloggen und `/client/<eigene-id>/dashboard` öffnen.
2. Neue Trainer-E-Mail registrieren; nach Login prüfen, dass Name/Bio aus Signup stammen, leere optionale Profilfelder leer bleiben und Profil speichern funktioniert.
3. Als Client Tracking speichern, Seite neu laden und erneut speichern; als anderer Client darf weder Lesen noch Schreiben möglich sein.
4. Als Trainer mit `share_data = true` und aktiver Buchung Tracking lesen; Opt-out oder fehlende aktive Buchung muss leer/abgelehnt sein.
5. Als Trainer einen freien Slot anlegen, löschen und neu anlegen. Eine kostenpflichtige Buchung annehmen: Status `accepted`, Slot `pending`; erst nach Test-Webhook `confirmed`/`booked`.
6. Als Client und Trainer Chat ohne gemeinsame Buchung testen (abgelehnt), danach mit gemeinsamer Buchung (erfolgreich).
