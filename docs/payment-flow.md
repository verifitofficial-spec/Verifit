# Zahlungs- & Buchungsablauf

> **Status:** Gegen den Supabase-Staging-Stand am 2026-10-03 abgeglichen.

## Verbindlicher Ablauf

### 1. Kunde fragt Paket und Slot an

1. Ein eingeloggter Nutzer mit Rolle `client` wählt auf `/trainer/[id]` ein aktives Angebot aus `trainer_offers` und einen freien Slot aus `trainer_slots`.
2. Der Browser sendet `POST /api/book-slot` mit `{ slotId, offerId }` und `Authorization: Bearer <access_token>`.
3. Der Server validiert den Token und `profiles.role`, liest Kunden-, Trainer-, Angebot- und Slotdaten ausschließlich aus der Datenbank und prüft:
   - Kundenprofil existiert,
   - Slot ist noch `free`,
   - Angebot ist aktiv und gehört zum Trainer des Slots,
   - Trainer ist `approved`.
4. Der Slot wird nur unter der Bedingung `free → pending` reserviert. Danach erstellt der Server eine `bookings`-Zeile mit Angebots-, Preis- und Termin-Snapshot (`status: pending`).
5. Trainer und Kunde erhalten eine E-Mail. Ein Mailfehler macht die bereits gespeicherte Buchung nicht rückgängig.

> Der Browser übermittelt weder Preis noch Kunden-E-Mail. Beide Werte stammen aus serverseitig geladenen Daten.

### 2. Trainer antwortet auf die Anfrage

1. Der Trainer antwortet im Dashboard über `POST /api/respond-booking` mit `{ bookingId, accept }` und Bearer-Token.
2. Der Server prüft Rolle `trainer` und, dass `bookings.trainer_id` mit der authentifizierten User-ID übereinstimmt.
3. Die Statusänderung erfolgt über die RPC `respond_to_booking` im Kontext des Trainer-Tokens.
4. Erwartete Statusübergänge:
   - Discovery-Angebot: `pending → confirmed`, Slot `pending → booked`.
   - Bezahltes Angebot: `pending → accepted`, `payment_due_at = now() + 24 h`, Slot bleibt `pending`.
   - Ablehnung: `pending → declined`, Slot `pending → free`.
5. Der Kunde erhält eine E-Mail; bei kostenpflichtigen Angeboten verweist sie auf das Kunden-Portal.

## 3. Kunde bezahlt ein angenommenes Angebot

1. Das Kunden-Portal lädt `bookings` über `client_id` und zeigt für eine eigene Buchung im Status `accepted` den Button **„Jetzt bezahlen“**.
2. `POST /api/checkout` nimmt ausschließlich `{ bookingId }` plus Bearer-Token an.
3. Der Server prüft Kundenrolle, Eigentümerschaft (`bookings.client_id`), Status `accepted`, positiven Preis und eine noch gültige `payment_due_at`.
4. Der Server verlangt bei kostenpflichtigen Angeboten `charges_enabled = true` und ein Stripe-Connect-Konto. Stripe Checkout erhält serverseitig Preis und Angebotsdaten aus dem Buchungs-Snapshot, eine 15-%-Plattformgebühr (`PLATFORM_FEE_PERCENT`) und eine Destination Charge zum Trainerkonto.
5. Die Stripe-Session endet spätestens zu `payment_due_at`; bei einer Restlaufzeit unter 30 Minuten wird kein neuer Checkout eröffnet.

## 4. Stripe-Webhook bestätigt Zahlung

1. `POST /api/webhook` liest den unveränderten Raw-Body und verlangt `stripe-signature` sowie `STRIPE_WEBHOOK_SECRET`.
2. Bei fehlender oder ungültiger Signatur wird **nichts verarbeitet** und HTTP 400 zurückgegeben.
3. Für `checkout.session.completed` und `checkout.session.async_payment_succeeded` wird nur bei `payment_status = paid` und gültiger `bookingId` fortgefahren.
4. Die Buchung wechselt nur von `accepted` zu `confirmed`, wenn `payment_due_at >= now()` ist. Die Session-ID und Payment-Intent-ID werden gespeichert.
5. Der zugehörige Slot wechselt von `pending` zu `booked`. Wiederholte Stripe-Events finalisieren den Slot idempotent, lösen aber keine zweite Bestätigungsmail aus.
6. Kunde und Trainer erhalten eine Zahlungsbestätigung. Ein Mailfehler ändert keinen Zahlungs- oder Slotstatus.

## 5. Storno und Refund

1. Kunde oder Trainer ruft `POST /api/cancel-booking` mit `{ bookingId }` und Bearer-Token auf.
2. Unbezahlte `pending`/`accepted`-Buchungen werden storniert und der Slot wird freigegeben.
3. Bei einer bezahlten Buchung erstellt der Server im Stripe-Testmodus einen idempotenten Full Refund. Die Buchung speichert `refund_id`, `refunded_at` und `cancelled_at`.
4. Kunden können bezahlte Termine gemäß Staging-Default bis 24 Stunden vor Beginn kostenlos stornieren; Trainerstorno erstattet unabhängig vom Zeitpunkt.

## Statusmaschine

| Objekt | Zulässige Übergänge im aktuellen Ablauf |
| --- | --- |
| `bookings.status` | `pending → accepted \| confirmed \| declined \| cancelled`; `accepted → confirmed \| expired \| cancelled`; `confirmed → cancelled` |
| `trainer_slots.status` | `free → pending`; `pending → free \| booked` |

Stornierungen laufen über die `cancel_booking`-RPC. Unbezahlte `accepted`-Buchungen werden über `expire_unpaid_bookings` freigegeben; die Phase-2-Migration registriert dafür, sofern verfügbar, einen `pg_cron`-Job im 15-Minuten-Intervall.

## Sicherheitsgrenzen

- Jede mutierende HTTP-Route prüft Bearer-Token und serverseitig `profiles.role`.
- `SUPABASE_SERVICE_ROLE_KEY` ist auf server-only Route-Handler-Helfer begrenzt.
- Admin-Aktionen (Trainerstatus und Signed URLs für Prüfungsdokumente) laufen nur über geschützte Route Handler. Der Dokument-Endpoint erstellt eine Signed URL nur für einen Pfad, der in `trainers.license_document_path` oder `trainers.insurance_document_path` referenziert ist.
- Die RPC `respond_to_booking` prüft in SQL `auth.uid() = trainer_id`, den Status `pending` und setzt bei kostenpflichtigen Angeboten `payment_due_at`.

## Staging-verifizierte Punkte

- RLS-Policies und Storage-Regeln sind in `docs/db/rls-policies.md` dokumentiert.
- `respond_to_booking`, `cancel_booking` und `expire_unpaid_bookings` existieren im Staging-Projekt.
- `client_plans` ist durch die Phase-2-Migration angelegt und nutzt `content` als JSON-String.
- Stripe Connect benötigt `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL` und die Testmodus-Konfiguration des Trainers.

## Umgebungsvariablen

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`

Keine dieser Variablen darf im Client-Bundle mit Ausnahme der vorgesehenen `NEXT_PUBLIC_*`-Variablen erscheinen.
