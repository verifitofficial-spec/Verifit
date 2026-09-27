# Zahlungs- & Buchungsablauf

Es existieren **zwei parallele Buchungswege** im Projekt — bei neuen Features immer klären, welcher gemeint ist.

## Weg 1: Kostenpflichtige Buchung via Stripe Checkout

Verwendet in `src/app/quiz/page.tsx` (`handleBookSlot`).

```
1. POST /api/checkout { slotId, title, price, trainerName }
   → src/app/api/checkout/route.ts
   → erstellt Stripe Checkout Session mit metadata.slotId
   → Preis wird in Cent umgerechnet (Math.round(price * 100))
   → success_url / cancel_url zeigen auf NEXT_PUBLIC_APP_URL mit ?success=true / ?canceled=true
2. Redirect zu session.url (Stripe-gehostete Checkout-Seite)
3. Nach Zahlung: Stripe sendet Webhook-Event checkout.session.completed
   → src/app/api/webhook/route.ts
   → verifiziert Signatur mit STRIPE_WEBHOOK_SECRET (stripe.webhooks.constructEvent)
   → Fallback: falls Signaturprüfung fehlschlägt, wird der Body trotzdem als JSON geparst
     und bei passendem Event-Typ identisch verarbeitet (siehe Hinweis unten)
   → setzt trainer_slots.status = 'booked' (per slotId aus den Metadaten)
   → verschickt Bestätigungsmail via Resend an customer_details.email
```

**Sicherheitshinweis:** Der Fallback-Zweig im Webhook (bei fehlgeschlagener Signaturverifikation) verarbeitet das Event trotzdem inhaltlich identisch zum verifizierten Zweig — er gibt nur zusätzlich `{ error }` mit Status 400 zurück, bricht die Verarbeitung aber nicht ab. Das untergräbt den Zweck der Signaturprüfung (Schutz vor gefälschten Webhook-Calls). Bei Änderungen an diesem Endpoint: Fallback-Zweig kritisch prüfen, ggf. sollte er die Verarbeitung komplett verweigern statt nur einen Fehler zurückzugeben.

## Weg 2: Unbezahlte Buchungsanfrage (Discovery Calls / Anfrage-Modell)

Verwendet in `src/app/trainer/[id]/page.tsx` und `src/app/trainer/list/page.tsx`.

```
1. Klick auf „Buchen" → trainer_slots.status wird direkt auf 'pending' gesetzt
   (kein Stripe-Call, keine Zahlung)
2. Bei trainer/[id]/page.tsx zusätzlich:
   POST /api/send-email { trainerEmail, clientName, clientEmail, slotDate, slotTime, title }
   → src/app/send-email/route.ts
   → verschickt zwei Mails: eine an den Trainer (Benachrichtigung), eine an den
     Kunden (Bestätigung des Eingangs)
3. Trainer bestätigt/lehnt die Anfrage manuell im Dashboard
   (Status-Übergang pending → confirmed erfolgt aktuell nur clientseitig im
   Trainer-Dashboard über lokalen State, siehe Hinweis unten)
```

**Hinweis:** Im Trainer-Dashboard (`trainer/[id]/dashboard/page.tsx`) sind `appointments` und `offers` aktuell **rein clientseitiger State** (`useState`, keine Supabase-Persistenz) — Buchungsanfragen aus `trainer_slots` mit Status `pending`/`booked` werden dort geladen (`loadSlots`), aber die Kalender-„Angebote" (`OfferTemplate`) und manuell erstellten `Appointment`-Objekte gehen beim Reload verloren. Vor Erweiterung dieses Bereichs prüfen, ob eine Persistenzschicht ergänzt werden soll.

## Statuswerte von `trainer_slots.status`

| Status | Bedeutung | Gesetzt durch |
|---|---|---|
| `free` | Slot verfügbar | Trainer beim Anlegen |
| `pending` | Anfrage gestellt, wartet auf Bestätigung | Kunde (unbezahlter Weg) |
| `booked` | Fest gebucht und bezahlt | Stripe-Webhook nach erfolgreicher Zahlung |

Es gibt **keinen** Status für „vom Trainer bestätigt, aber unbezahlt" in der Datenbank — das Client-Dashboard zeigt zwar UI-Badges für `confirmed`, dieser Wert wird aber aktuell nirgends in `trainer_slots.status` geschrieben (nur `free`/`pending`/`booked` kommen in Inserts/Updates vor). Vor Nutzung dieses Status prüfen, ob er tatsächlich vorgesehen ist oder ein UI-Rest ist.

## Umgebungsvariablen (Zahlungen/E-Mail)

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (Fallback: `onboarding@resend.dev`)
