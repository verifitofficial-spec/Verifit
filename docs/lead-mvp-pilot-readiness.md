# Lead-MVP: Pilotbereitschaft und Staging-Abnahme

Stand: 17.10.2026

## Ergebnis in einem Satz

Der Lead-MVP ist lokal als begrenzter Marktplatz mit Registrierung, manueller
Trainerprüfung, öffentlichen Profilen und Angeboten, Quiz/Matching und
unverbindlichen Kontaktanfragen vorbereitet. Er ist **noch nicht für echte
Pilotdaten freigegeben**, weil die Baseline weder in einer vollständigen
Supabase-Umgebung noch im ausdrücklich ausgewählten Staging ausgerollt und dort
mit der Rollenmatrix geprüft wurde. Rechtstexte und betriebliche Einstellungen
sind ebenfalls offene Go/No-Go-Gates.

## Verbindlicher Pilotumfang

Aktiv:

- Kunde: Registrierung/Login, Quiz, Trainerliste, öffentliches Trainerprofil,
  unverbindliche Anfrage, eigener Anfragestatus, Kontolöschung innerhalb der
  dokumentierten Aufbewahrungsgrenze.
- Trainer: Registrierung/Login, Profil, Fachgebiete und Angebotsverwaltung,
  Verifizierungsunterlagen, eingehende Anfragen und zulässige Statuswechsel,
  Kontolöschung innerhalb der dokumentierten Aufbewahrungsgrenze.
- Admin: Trainer und Nachweise prüfen sowie `pending`, `approved` oder
  `rejected` setzen.

Nicht aktiv:

- Slots, Buchungen, Checkout, Zahlungen, Stripe Connect und Storno,
- Kundenverwaltung, Gesundheitsdaten, Tracking und Pläne,
- Chat und Realtime-Nachrichten.

Die Navigation bietet diese Funktionen nicht an. Noch existierende direkte
Legacy-API-Pfade antworten mit HTTP 410 und führen vorher keinen Datenbank-,
Mail- oder Stripe-Zugriff aus. Historische Seiten für Checkout-Erfolg und
Trainer-Kundenverwaltung zeigen nur noch einen Hinweis auf die MVP-Grenze.

## Belegstand

| Prüfgegenstand | Status | Beleg und Grenze |
|---|---|---|
| Matching-Logik | **lokal bestätigt** | Unit-Tests prüfen Taxonomie, Erfahrungsstufen, Trainingsform, Budget und fehlende Metadaten. |
| Öffentlicher Flow | **lokal bestätigt** | Quiz, Liste, Profil, Angebote und Anfrageeinstieg wurden im Desktop- und mobilen Browser geprüft. Öffentliche Browserabfragen verwenden `trainers_public`; der Übergangs-Fallback nutzt nur den Anon-Key, `status = approved` und eine feste Feldliste. |
| Anfragekern | **lokal bestätigt** | Unit-/Boundary-Tests und PGlite-Laufzeittests prüfen Validierung, Idempotenz, Rate-Limits, Statusübergänge, Grants und RLS. |
| Rollen und Signup | **lokal bestätigt** | Die Baseline-Tests prüfen `anon`, Client A/B, Trainer A/B und Admin einschließlich verbotener Querzugriffe und manipulierter Signup-Rollen. |
| Legacy-Grenze | **lokal bestätigt** | Boundary-Tests prüfen Dashboards, Navigation, historische Seiten und sieben direkte Legacy-APIs. |
| Fehlerzustände | **lokal bestätigt** | Öffentliche Seiten und Trainer-Dashboard unterscheiden Laden, leer und Fehler; Wiederholen ist möglich. |
| Konfigurierte entfernte Umgebung | **teilweise bestätigt** | Eine read-only Abfrage am 17.10.2026 ergab für `trainers_public` PostgREST `PGRST205` (nicht im Schema-Cache), während `trainer_offers` lesbar war. Es wurde nichts verändert. Der Projektzweck und die Gleichheit mit dem vorgesehenen Staging sind damit nicht belegt. |
| Vollständiger Supabase-Stack | **nicht geprüft** | GoTrue, PostgREST, Storage, E-Mail, Dashboard-Einstellungen, echte JWTs und Schema-Cache sind in PGlite nicht enthalten. |
| Staging-Rollenmatrix | **nicht geprüft** | Keine Migration wurde remote ausgeführt; keine Testkonten oder Testdaten wurden remote angelegt. |
| Produktion | **nicht geprüft und nicht im Umfang** | Keine Verbindung, Änderung oder Freigabe. |

Reproduzierbare lokale Prüfung ab Repository-Wurzel:

```powershell
npm run test:all
npx tsc --noEmit
npm run lint
npm run build
```

## Was PGlite beweist – und was nicht

`npm run test:db` startet eine frische PostgreSQL-Datenbank im Arbeitsspeicher,
installiert die minimale Fixture und wendet ausschließlich
`supabase/baseline/20261017120000_lead_mvp_baseline.sql` an. Damit werden
SQL-Syntax, Tabellen, Constraints, Trigger, Funktionen, Grants, RLS, RPCs und
die getesteten Rollenwechsel tatsächlich ausgeführt.

Nicht abgedeckt sind insbesondere:

- Auth-E-Mail-Flows, JWT-Ausstellung und Redirect-/Site-URL-Konfiguration,
- PostgREST-Schema-Cache und Data-API-Exposition,
- Storage-API, Bucket-Limits, MIME-Prüfung und Signed URLs,
- Realtime, Resend-Zustellung sowie Vercel-Umgebungsvariablen,
- Supabase Advisors, Backups, Logs und der tatsächliche Remote-Datenbestand.

Ein grüner PGlite-Test ist deshalb notwendig, aber keine Staging- oder
Produktionsfreigabe.

## Freigabepflichtiger Staging-Ablauf

Dieser Abschnitt ist eine Vorbereitung, keine Erlaubnis zur Ausführung.

1. Der Gründer benennt ausdrücklich das isolierte Staging-Projekt und bestätigt,
   dass keine Produktion oder produktiven Personendaten betroffen sind.
2. Vor jedem Schreibzugriff werden Projektkennung, Ausgangsschema, Migrationen,
   Trigger, Grants, RLS, Buckets und vorhandene Daten read-only inventarisiert.
   Secret-Werte werden weder gelesen noch protokolliert.
3. Es wird entschieden, ob eine **leere** Umgebung mit der Baseline aufgebaut
   oder ein bestehendes Legacy-Schema per eigener, geprüfter Forward-Migration
   überführt wird. Die Baseline ist absichtlich nicht Teil der aktuellen
   Legacy-Migrationskette und darf nicht über unbekannten Bestand gelegt werden.
4. Vor der Anwendung werden Backup/Wiederherstellung, Verantwortliche und
   Abbruchkriterien festgelegt. Erst danach darf ein separat freigegebener
   Migrationslauf erfolgen.
5. Nach dem Lauf werden Katalog, Grants, RLS, Funktionen, Trigger, View,
   Storage-Policies und Schema-Cache kontrolliert. Abweichungen werden mit einer
   Forward-Fix-Migration behoben; keine ad-hoc Dashboard-Änderung.
6. Danach wird die folgende Rollenmatrix mit ausschließlich künstlichen
   Testdaten ausgeführt und protokolliert.

## Staging-Testmatrix

| Akteur | Muss funktionieren | Muss scheitern |
|---|---|---|
| `anon` | Nur freigegebene Trainer über `trainers_public` und deren aktive Angebote lesen | Private Trainerfelder, pending/rejected Trainer, Inquiries, Dokumente und Mutationen |
| Client A | Eigenes Profil; eigene Inquiry erstellen und lesen; idempotenter Retry | Profil/Inquiry von Client B; Statuswechsel; Trainerdaten ändern |
| Client B | Eigene Daten und eigene Inquiry | Daten von Client A |
| Trainer A | Eigenes Profil und eigene Angebote; an ihn gerichtete Inquiries lesen; zulässige Statuswechsel | Selbstfreigabe; geschützte Felder; Daten, Angebote, Inquiries oder Dokumente von Trainer B |
| Trainer B | Eigene Daten und an ihn gerichtete Inquiries | Private Daten von Trainer A |
| Admin | Trainerliste; referenzierte Nachweise als kurzlebige Signed URL; Statusänderung über Admin-Route | Adminrolle über Signup-Metadaten; beliebige oder nicht referenzierte Storage-Pfade |
| Kontolöschung | Konto ohne Inquiry-Abhängigkeiten vollständig löschen | Konto mit Inquiry/Statusereignis bis zur fachlich-rechtlichen Aufbewahrungsentscheidung |
| Legacy-Pfade | Verständlicher Hinweis in historischen Seiten | Alle sieben Legacy-APIs antworten 410; keine Stripe-, Mail- oder Legacy-DB-Nebenwirkung |

Zusätzliche End-to-End-Prüfungen:

- Kunden- und Trainerregistrierung erzeugen genau ein Profil und genau den
  passenden Fachdatensatz; `admin` und unbekannte Rollen werden nie vergeben.
- E-Mail-Bestätigung, Login, Passwort-Reset und sichere `next`-Rücksprünge
  funktionieren mit den Staging-Redirect-URLs.
- Trainer lädt zulässige Test-PDFs in den eigenen Ordner; falscher Typ, zu große
  Datei und fremder Pfad werden serverseitig abgelehnt.
- Admin-Entscheidung wird gespeichert und eine Testmail zugestellt; Mailfehler
  verändert den bereits gespeicherten Status nicht.
- Quiz, Liste und Profil zeigen nur `approved` Trainer und keine privaten Felder;
  Inquiry-Erstellung und Statuswechsel funktionieren im Browser vollständig.
- Anfrage-Limits (fünf pro Stunde, zwanzig pro 24 Stunden je Kunde) werden
  kontrolliert geprüft. Signup-/IP-/CAPTCHA-Schutz wird separat entschieden.

## Go/No-Go für einen kontrollierten Pilotbetrieb

**Go** erst, wenn alle folgenden Punkte mit Datum und Prüfer dokumentiert sind:

- Staging-Ausgangszustand und Migrationsstrategie sind freigegeben; die
  vollständige Rollenmatrix und die Supabase-End-to-End-Prüfungen sind grün.
- Auth-, Storage-, Resend-, Redirect- und Vercel-Konfiguration sind mit
  Testkonten geprüft; Service-Role und andere Secrets erscheinen nicht im
  Browser, Build oder Log.
- Backup/Wiederherstellung, Fehlerbeobachtung, Supportkontakt und manueller
  Verifizierungsprozess sind für den Pilot festgelegt.
- Impressum enthält keine Platzhalter; AGB und Datenschutz sind anwaltlich für
  den tatsächlichen Lead-MVP geprüft. Es werden keine Rechtstexte aus dem Code
  als freigegeben unterstellt.
- Aufbewahrung und Löschung von Inquiries, Statusereignissen und
  Verifizierungsdokumenten sind fachlich und rechtlich entschieden.
- Der fehlende Signup-/IP-Missbrauchsschutz ist entweder umgesetzt und getestet
  oder als bewusstes, schriftlich akzeptiertes Restrisiko für den geschlossenen,
  kontrollierten Teilnehmerkreis behandelt.
- Legacy-Funktionen bleiben deaktiviert; insbesondere gibt es keinen echten
  Geldfluss, keine Buchungszusage und keine Verarbeitung von Gesundheitsdaten.

Bis dahin ist der Status **No-Go für echte Pilotdaten**, aber **bereit für die
separat freizugebende Staging-Abnahme**.

## Verwandte Dokumente

- `docs/inquiry-flow.md` – Anfrage-API, Statusmaschine und Missbrauchsschutz
- `docs/db/lead-mvp-baseline.md` – Baseline, lokale Laufzeittests und Grenzen
- `docs/db/security-validation-status.md` – Stand der Trainer-/Angebotshärtung
- `docs/db/trainers-offers-security-rollout.md` – Diagnose und Rollout-Grenzen
- `docs/PRD.md` – Produktziel; spätere Legacy-/Zielabschnitte sind nicht aktiv
- `docs/ARCHITECTURE.md` – technische Schichten und historische Befunde
