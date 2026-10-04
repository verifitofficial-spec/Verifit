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
