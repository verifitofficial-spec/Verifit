# Eigenständiger Inquiry-Flow

## Zweck

`inquiries` bildet unverbindliche Kontaktanfragen zwischen Kunden und freigegebenen Trainern ab. Der Flow reserviert keinen Termin, erstellt keine Buchung und löst keine Zahlung aus.

## Statusmaschine

- `new → viewed | declined | closed`
- `viewed → contacted | declined | closed`
- `contacted → closed`
- `declined → closed`
- `closed` ist terminal

Nur der empfangende Trainer darf einen Status ändern. Das erneute Setzen desselben Status ist als idempotenter Retry erlaubt und erzeugt kein zusätzliches Statusereignis. Jede tatsächliche Änderung wird in `inquiry_status_events` mit Zeitpunkt, Rolle und Nutzer-ID protokolliert.

## Idempotenz und Missbrauchsschutz

Der Browser erzeugt pro Anfrageentwurf eine UUID. Die Datenbank erzwingt `unique (client_id, idempotency_key)` dauerhaft für die Lebenszeit des Datensatzes. Ein identischer Retry liefert die bestehende Anfrage zurück und sendet keine zweite E-Mail. Wird dieselbe UUID mit anderem Trainer, Angebot oder Nachrichtentext wiederverwendet, wird der Request abgelehnt.

Die RPC serialisiert Erstellungen je Kundenkonto über ein transaktionsgebundenes Advisory Lock. Pro Kunde gelten datenbankweit maximal fünf neue Anfragen pro Stunde und zwanzig pro 24 Stunden. Das Limit funktioniert damit auch über mehrere App-Instanzen. Ein zusätzliches IP-/CAPTCHA-Limit existiert weiterhin nicht und bleibt vor einem öffentlichen Launch zu prüfen.

## Berechtigungen

- Authentifizierte Kunden erstellen Anfragen ausschließlich über `create_inquiry`.
- Kunden lesen nur Zeilen mit ihrer `client_id`.
- Trainer lesen nur Zeilen mit ihrer `trainer_id`.
- Admins lesen über das vorhandene `public.is_admin()`-Rollenmodell.
- Tabellen haben keine direkten INSERT-, UPDATE- oder DELETE-Rechte für `authenticated`.
- `create_inquiry` und `transition_inquiry_status` sind `SECURITY DEFINER`, besitzen einen leeren `search_path`, verwenden vollständig qualifizierte Objekte und prüfen Rolle, Eigentum, Trainerstatus, Angebot und Statusübergang erneut in der Datenbank.

## API

- `POST /api/inquiries`: Anfrage erstellen; nur Kunden.
- `GET /api/inquiries`: eigene Kundenanfragen beziehungsweise an den Trainer gerichtete Anfragen auflisten.
- `GET /api/inquiries?inquiryId=<uuid>`: einen eigenen Datensatz abrufen.
- `PATCH /api/inquiries`: Status ändern; nur der zuständige Trainer.

Die API gibt Kunden keine Kontaktdaten anderer Kunden zurück. Trainer erhalten Name und E-Mail ausschließlich für Anfragen, deren Empfänger sie sind.

## Staging-Voraussetzungen

Die Migration `20261017003000_inquiry_core.sql` wurde nicht remote ausgeführt. Vor dem Staging-Test müssen die vorausgesetzten Tabellen `profiles`, `clients`, `trainers`, `trainer_offers` sowie `public.is_admin()` gegen das tatsächliche Staging-Schema geprüft werden. Anschließend ist die vollständige Rollenmatrix mit Anon, Client A/B, Trainer A/B und Admin zu testen.

## Öffentliche Profildaten während des Übergangs

Quiz, Trainerliste und Trainerprofil lesen regulär aus `trainers_public`. Fehlt
diese View in einer noch nicht migrierten Umgebung nachweislich mit `42P01` oder
`PGRST205`, verwenden sie `/api/public/matching-data`. Der Endpunkt nutzt keinen
Service-Role-Key, sondern den Anon-Schlüssel, filtert zwingend auf
`status = approved` und liefert nur eine explizite öffentliche Feldliste sowie
aktive Angebote. Berechtigungs-, Netzwerk- und andere Datenbankfehler lösen
keinen Fallback aus.

## Abgrenzung zu Legacy-Funktionen

Die direkten Endpunkte für Slot-Buchung, Buchungsantwort, Checkout,
Checkout-Bestätigung, Stripe-Connect-Onboarding, Stripe-Statusabgleich und
Stripe-Webhooks antworten im Lead-MVP einheitlich mit HTTP 410, bevor Auth-,
Datenbank-, E-Mail- oder Stripe-Code ausgeführt wird. Chat-Komponenten und
sonstige spätere Produktmodule sind nicht in die aktiven Dashboards oder die
Bereichsnavigation eingebunden. Die historischen Seiten
`/checkout/success` und `/trainer/[id]/clients` führen keine Legacy-Logik mehr
aus, sondern erklären die MVP-Grenze. Pilot-Gates und Staging-Testmatrix stehen
in `docs/lead-mvp-pilot-readiness.md`.
