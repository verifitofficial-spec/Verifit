# VeriFit – Product Requirements Document (PRD)

Dieses Dokument beschreibt **was** VeriFit für seine Nutzer leisten soll und **warum**. Technik: `docs/ARCHITECTURE.md`. Aussehen und UI-Regeln: `docs/DESIGN_SYSTEM.md`. Arbeitsregeln für Agenten: `AGENTS.md`.

> **Aktiver Produktumfang seit 17.10.2026:** Das vorzeigbare Pilot-MVP ist ein
> Lead-Marktplatz. Aktiv sind Trainerregistrierung, manuelle Verifizierung,
> öffentliche Profile und Angebote, Quiz/Matching sowie unverbindliche
> Kontaktanfragen mit Bearbeitungsstatus. Termin-Slots, Buchungen, Checkout,
> Stripe Connect, Chat, Pläne und Tracking gehören nicht zu diesem MVP. Die
> entsprechenden Route Handler antworten bei direktem Aufruf mit HTTP 410.
> Spätere Abschnitte zu diesen Funktionen dokumentieren den langfristigen
> Zielzustand beziehungsweise Legacy-Code und sind kein Nachweis aktiver
> Pilotfunktionalität.
> Der aktuelle Beleg- und Freigabestand einschließlich Go/No-Go-Gates steht in
> `docs/lead-mvp-pilot-readiness.md`.

- Stand: 11.10.2026. Quellen: `docs/masterplan.md`, `docs/release-plan.md`, `docs/payment-flow.md`, Code-Snapshot, `README-ZUERST-LESEN.md`. Es gab keinen weiteren gespeicherten Gesprächskontext; Entscheidungen stammen nur aus diesen Quellen.
- Marker (**bestätigt**, **Export**, **Entscheidung**, **geplant**, **offen**): Definition in `AGENTS.md` §2. Geschäftsregeln werden hier nicht neu erfunden; fehlende Regeln stehen unter §9 als offen.

## 1. Vision und Wertversprechen

**Vision (Entscheidung):** Erste nahtlose Plattform im DACH-Raum, die ein Gesundheits- und Fitness-Dashboard für Endkunden mit einem **manuell verifizierten Experten-Marktplatz** verbindet. Bestehende Lösungen sind entweder Coaching-Software für Trainer (ohne Vermittlung) oder reine Verzeichnisse (ohne Planer/Tracking).

| Zielgruppe | Wertversprechen |
|---|---|
| Kunde | Nur manuell geprüfte Trainer (Lizenz und Berufshaftpflicht); Matching statt Suchen; Buchung, Zahlung, Pläne, Tracking und Chat an einem Ort; Kontrolle darüber, welche Gesundheitsdaten der Trainer sieht. |
| Trainer | Sichtbarkeit bei Kunden, die einen verifizierten Experten suchen; Buchungs- und Zahlungsabwicklung; Angebots-, Termin- und Planungswerkzeuge; Verifiziert-Siegel. |
| VeriFit | Provision je Buchung (Entscheidung: Standard 15 %, via Stripe Connect; geplant). |

**Rechtsrolle (Entscheidung):** VeriFit ist ausschließlich Vermittler. Der Vertrag über Training/Coaching entsteht zwischen Kunde und Trainer. VeriFit haftet nicht für Trainingsleistungen (AGB-Entwurf, anwaltlich zu prüfen).

## 2. Rollen

Rollen liegen in `profiles.role`: `client` (Kunde), `trainer`, `admin`. Dieselben Begriffe gelten in allen Dokumenten.

| Rolle | Ziel | Wichtigste Fähigkeiten (Soll) |
|---|---|---|
| Kunde | Passenden Trainer finden und unverbindlich kontaktieren | Quiz, Trainerprofile, Kontaktanfragen, Bearbeitungsstatus, Konto löschen |
| Trainer | Sichtbar werden und Leads bearbeiten | Registrierung, Verifizierungsunterlagen, Profil, Fachgebiete, Angebote, Kontaktanfragen bearbeiten, Konto löschen |
| Admin | Qualität der Plattform sichern | Trainer prüfen (Dokumente einsehen), freigeben/ablehnen |

### 2.1 Datenzugriff (Soll-Matrix, **Entscheidung** aus `docs/release-plan.md` §3)

| Datenobjekt | anon | Kunde | Trainer | Admin |
|---|---|---|---|---|
| Öffentliche Trainerdaten (nur `approved`, Whitelist: Name, Bio, Stadt, Trainingsform, Fachgebiete, Avatar, Qualifikationen, Stundensatz, Social-Links) | lesen | lesen | lesen | lesen |
| Trainer-Privatdaten (E-Mail, Lizenznummer, Versicherungsablauf, Dokumentpfade, Stripe-Felder) | – | – | eigene | lesen |
| Verifizierungsdokumente (privat) | – | – | eigene (Upload/Ansicht) | lesen (Signed URL) |
| Angebote | aktive, `approved` | gleich | eigene CRUD | lesen |
| Termin-Slots | freie, `approved` | gleich | eigene anlegen/löschen (nur frei); Statuswechsel nur serverseitig | – |
| Buchungen | – | eigene lesen | eigene lesen | alle lesen; **Schreiben nur serverseitig** |
| Kundenprofil | – | eigenes | begrenzt, nur bei `share_data` **und** aktiver Buchung | lesen |
| Tracking | – | eigenes CRUD | lesen nur bei `share_data` **und** aktiver Buchung | – |
| Pläne | – | eigene lesen | schreiben nur für Kunden mit aktiver Buchung | – |
| Nachrichten | – | nur mit Trainer mit gültiger Buchung | nur mit Kunde mit gültiger Buchung | – |

**Ist-Abweichungen** (Policies erlauben laut Export teils mehr) stehen in `docs/ARCHITECTURE.md` §12. Diese Matrix ist das Produktziel, kein Ist-Nachweis.

## 3. Zentrale Abläufe (User Journeys)

1. **Trainer-Onboarding:** `/trainer/register` (Name, E-Mail, Passwort, Kurzbio, AGB/Datenschutz) → Status `pending` → E-Mail bestätigen → Dashboard: Profil, Fachgebiete, Lizenznummer, Versicherungsablauf, zwei PDFs (Lizenz, Haftpflicht) → Admin prüft → `approved`/`rejected` + Mail → bei `approved` buchbar und im Matching sichtbar.
2. **Kunden-Onboarding:** `/client/register` (inkl. ausdrücklicher Einwilligung Art. 9 DSGVO und AGB/Datenschutz) → E-Mail bestätigen → Login → Dashboard.
3. **Finden:** `/quiz` (Erfahrung, Ziel, Trainingsform, betreute Einheiten pro Monat, Monatsbudget) → Trefferliste → `/trainer/[id]` (Profil, Angebote, freie Termine); Alternativ `/trainer/list` mit Filtern Stadt/Fachgebiet.
4. **Buchen:** Paket wählen → Termin wählen → Login (mit `?next=`-Rücksprung, Auswahl bleibt erhalten) → Anfrage senden → Trainer antwortet (Soll: innerhalb 24 h) → kostenlos: bestätigt; bezahlt: „Zahlung ausstehend“ mit 24 h Frist → Kunde zahlt über Stripe → bestätigt, Slot gebucht, Mails an beide.
5. **Betreuen:** Trainer erstellt Trainings-/Ernährungsplan für einen Kunden → Kunde sieht Pläne im Dashboard, trackt täglich Werte; Trainer sieht Daten nur bei Freigabe.
6. **Kommunizieren:** Chat Kunde ↔ Trainer (Realtime).
7. **Konto beenden:** Konto löschen; Buchungsbelege bleiben anonymisiert.

## 4. Funktionale Anforderungen

Spalte „Ist“: **bestätigt** = im Code-Snapshot vorhanden; Details nur wo relevant. Akzeptanzkriterien (AC) sind testbar formuliert und sind die Grundlage für Tests (`AGENTS.md` §5).

### 4.1 Registrierung und Auth

| ID | Anforderung | Ist | Akzeptanzkriterium |
|---|---|---|---|
| FR-AUTH-1 | Registrierung als Kunde oder Trainer mit E-Mail und Passwort (min. 8 Zeichen) | bestätigt | Ungültige Eingaben zeigen deutsche Feldfehler; doppelte E-Mail wird erkannt; ohne Session erscheint Hinweis zur E-Mail-Bestätigung |
| FR-AUTH-2 | Die Rolle ist **nicht** frei wählbar: nur `client` oder `trainer` (nie `admin`); Standard `client` | **offen** (SEC-1) | Ein direkter `signUp`-Aufruf mit `role: 'admin'` erzeugt kein Admin-Profil (Test gegen Staging) |
| FR-AUTH-3 | Login prüft nach Authentifizierung die fachliche Rolle und meldet bei Mismatch ab | bestätigt | Kunde im Trainer-Login → Meldung „Kunden-Konto“, keine Session |
| FR-AUTH-4 | Passwort zurücksetzen per E-Mail, neutrale Antwort | bestätigt | Antwort verrät nicht, ob die E-Mail existiert |
| FR-AUTH-5 | Registrierung legt `profiles` und `clients`/`trainers` atomar an (Trainer mit `pending`) | **offen**: Code erwartet Trigger-Lösung, Trigger nicht im Repo | Nach Registrierung existieren genau eine `profiles`- und eine Fachzeile; kein Zustand „Auth-Nutzer ohne Profil“ |
| FR-AUTH-6 | Missbrauchsschutz (Rate-Limit/CAPTCHA) auf Signup und Buchungsanfrage | **geplant** (kein Code) | Wiederholte Anfragen werden gedrosselt (Schwellen: **offen**) |

### 4.2 Trainer-Verifizierung (manuell)

| ID | Anforderung | Ist | Akzeptanzkriterium |
|---|---|---|---|
| FR-VER-1 | Neue Trainer erhalten Status `pending`, nie automatisch `approved`; Trainer können ihren Status nicht selbst ändern | **offen** (SEC-2/3) | Trainer-Update `status='approved'` per API wird abgelehnt; Insert mit `approved` wird abgelehnt |
| FR-VER-2 | Upload Lizenz- und Haftpflicht-PDF in privaten Bucket `verification-docs` (nur PDF, max. 10 MB) | bestätigt (Grenzen nur clientseitig; Bucket-Limits **offen**) | Nicht-PDF/zu große Datei wird abgelehnt (auch serverseitig am Bucket) |
| FR-VER-3 | Admin sieht Trainerliste, Angaben, Dokumente (Signed URL, 60 s) und setzt `approved`/`rejected` | bestätigt | Nur Admin erhält Signed URL; nur Pfade, die zu einem Trainer gehören; Statusänderung nur durch Admin-Route |
| FR-VER-4 | Trainer erhält E-Mail bei Statusänderung | bestätigt | Mail nur bei tatsächlicher Änderung; Fehler beim Mailversand macht Entscheidung nicht rückgängig |
| FR-VER-5 | Nur `approved` Trainer sind öffentlich sichtbar, buchbar und im Quiz auffindbar | bestätigt im Client-Code; Datenbankdurchsetzung **offen** | `pending`/`rejected` erscheinen nirgends öffentlich |
| FR-VER-6 | Ausweis-Upload (privat, nach Prüfung löschen) | **geplant** | – |
| FR-VER-7 | Ablaufüberwachung Lizenz/Versicherung: automatische Sperre, Warnmail 30 Tage vorher | **geplant** (Spalte `liability_insurance_expiry` existiert, keine Überwachung) | Abgelaufener Nachweis sperrt Buchbarkeit |
| FR-VER-8 | Wiederbewerbung nach `rejected` | **offen** | – |

### 4.3 Matching und Trainerprofil

| ID | Anforderung | Ist | Akzeptanzkriterium |
|---|---|---|---|
| FR-MATCH-1 | Quiz mit Erfahrung, Ziel, Trainingsform, betreuten Einheiten pro Monat und Monatsbudget; Ziele aus der gemeinsamen Fachgebiets-Taxonomie (`src/lib/constants.ts`) | lokal implementiert; neue Metadaten benötigen Migration `20261011170000…` | Ergebnisse verwenden ausschließlich explizite Trainer-/Angebotsdaten; fehlende Angaben gelten nicht als Match; Pakete ohne Laufzeit erhalten keinen scheinbar exakten Monatsbetrag |
| FR-MATCH-2 | Freie Termine werden angezeigt und priorisiert, **filtern aber nicht** | bestätigt (**Entscheidung** README; weicht von `masterplan` §2D ab, die einen Filter vorsah) | Trainer ohne freie Termine erscheinen mit Hinweis, nach Trainern mit Terminen |
| FR-MATCH-3 | Erfahrungs-Filter über Spalte `target_levels` (statt Textsuche in Bio) | lokal implementiert; Migration vorbereitet, nicht gegen Staging geprüft | Bestehende Profile ohne Angabe werden nicht automatisch als passend behandelt |
| FR-MATCH-4 | Standort/Remote- und Philosophie-Frage | **geplant** | – |
| FR-PROF-1 | Öffentliches Profil zeigt Kompetenz, Fachgebiete, Verifizierung, Angebote, freie Termine, Social-Links; Buchen nur eingeloggt | bestätigt (URL über `id`) | Ohne Login führt „Anfrage“ zu Login/Registrierung und danach zurück |
| FR-PROF-2 | Öffentliche Daten enthalten **keine** E-Mail, Lizenznummer, Versicherungsablauf, Dokumentpfade | **offen** (SEC-4) | Anonyme Abfrage liefert nur die Whitelist-Spalten |
| FR-PROF-3 | `slug`-URL `/trainer/<slug>` | **geplant** | – |
| FR-PROF-4 | Rezensionen (nur nach bestätigter Buchung, Admin-moderiert) | **geplant** (P2) | – |

### 4.4 Angebote, Buchung, Zahlung, Storno

| ID | Anforderung | Ist | Akzeptanzkriterium |
|---|---|---|---|
| FR-BOOK-1 | Trainer verwalten Angebote (`discovery` kostenlos / `paid`, Dauer, Preis); Löschen ist Soft-Delete | bestätigt | Buchungen behalten ihre Kopie der Angebotsdaten |
| FR-BOOK-2 | Trainer pflegen freie Slots (Stundenraster 08–20 Uhr, keine Vergangenheit); Slot mit Anfrage/Buchung ist nicht entfernbar | bestätigt | – |
| FR-BOOK-3 | Anfrage: Preis und Kundendaten stammen serverseitig aus der Datenbank, nie vom Browser; Slot `free→pending` atomar | bestätigt | Zwei gleichzeitige Anfragen auf denselben Slot: genau eine gelingt |
| FR-BOOK-4 | Trainer nimmt an/lehnt ab (RPC `respond_to_booking`); kostenlos → `confirmed`; bezahlt → `accepted` + `payment_due_at = +24 h`; Ablehnung → `declined`, Slot frei | bestätigt (Code); Funktionsdefinition **Export** | Nur der zugeordnete Trainer, nur aus `pending` |
| FR-BOOK-5 | Nur Trainer mit aktivem Stripe-Konto (`charges_enabled`) können bezahlte Buchungen annehmen | **geplant** (heute keine Prüfung) | – |
| FR-PAY-1 | Zahlung über Stripe Checkout, nur im Status `accepted`, nur bis `payment_due_at` (nicht bei <30 min Restfrist) | bestätigt | Abgelaufene/fremde Buchung ist nicht bezahlbar |
| FR-PAY-2 | Bestätigung nur nach serverseitig verifizierter Zahlung (Webhook **oder** Rückkehr-Fallback), idempotent; Mails nur beim echten Statuswechsel | bestätigt | Wiederholtes Event erzeugt weder zweite Mail noch zweite Buchung |
| FR-PAY-3 | Plattformprovision 15 % per Destination Charge mit `application_fee_amount` | **geplant** (heute Checkout **ohne** Provision und ohne Transfer an den Trainer) | Berechnungsbasis: **offen** (§9) |
| FR-PAY-4 | Verfall: keine Trainerantwort in 24 h → Anfrage verfällt; unbezahlt nach Frist → `expired`, Slot frei; Cron `/api/cron/expire-bookings` | **geplant** (DB-Funktion `expire_unpaid_bookings` laut Export vorhanden, kein Aufrufer im Repo; Stripe-Session-Ablauf behandelt der Webhook) | Abgelaufene Anfragen geben den Slot frei |
| FR-PAY-5 | Anti-Ghosting: Ranking-Abstieg/Verwarnung bei Nicht-Antwort | **geplant** | – |
| FR-CANCEL-1 | Kunde kann `pending`/`accepted`/`confirmed` stornieren (`/api/cancel-booking`, RPC `cancel_booking`) | bestätigt (UI und Aufruf); Route im Snapshot nicht einsehbar | – |
| FR-CANCEL-2 | Erstattungsregel: kostenlos bis 24 h vor Termin mit vollem Refund, danach kein Refund; Trainer-Storno immer voller Refund | **Entscheidung** (Default, §5); Umsetzung **offen**: UI verspricht Erstattung, die exportierte RPC blockiert bezahlte Stornos („direkt mit dem Trainer klären“) | Refund-Fall ist vollständig serverseitig getestet |

### 4.5 Kunden-Dashboard, Pläne, Tracking

| ID | Anforderung | Ist | Akzeptanzkriterium |
|---|---|---|---|
| FR-CDASH-1 | Buchungsliste mit Status, „Jetzt bezahlen“, Storno; automatische Aktualisierung (20 s); auffälliger Hinweis bei offener Zahlung | bestätigt | Annahme des Trainers erscheint ohne Neuladen |
| FR-CDASH-2 | Zugewiesenen Coach samt Qualifikationen anzeigen; Profilbild; Terminübersicht | **geplant** | – |
| FR-CDASH-3 | Körper-/Zieldaten (Größe, Alter, Geschlecht, Ziel, Aktivitätslevel) | bestätigt | – |
| FR-PLAN-1 | Trainer erstellt Krafttrainings- und Ernährungspläne (Templates, Kalender, Drag & Drop), „An Kunden senden“ speichert in `client_plans` | bestätigt (Tabelle laut Export im Staging **nicht vorhanden**) | Plan erscheint beim richtigen Kunden |
| FR-PLAN-2 | Kunde sieht Pläne nach **Datum** | teilweise: Anzeige nach Wochentag, mehrwöchige Pläne werden vermischt | Plan eines Datums erscheint nur an diesem Datum |
| FR-PLAN-3 | Templates und gesendete Pläne persistieren/wieder laden | **geplant** | – |
| FR-PLAN-4 | Kalorien-/Makro-Richtwert nach Mifflin-St. Jeor nur bei `share_data` **und** aktiver Buchung (RPC) | teilweise: Richtwert in Kundenübersicht (clientseitig begrenzt), Rechnung im Planer fehlt; ist Richtwert, keine medizinische Beratung | Kein Richtwert ohne Freigabe |
| FR-TRACK-1 | Tägliches Tracking: Gewicht, Kalorien, Wasser, Schlaf, Laune, Gesundheit, Motivation (1–10); ein Eintrag je Tag; Verlauf 7/30/90/365 Tage | bestätigt (Spalten `health`, `motivation` nur per Migration vorgesehen) | Mehrfaches Speichern am Tag aktualisiert den Tageswert |
| FR-TRACK-2 | Vorbefüllung nur mit Werten von heute | bestätigt | – |

### 4.6 Trainer-Dashboard und Kundenübersicht

| ID | Anforderung | Ist | Akzeptanzkriterium |
|---|---|---|---|
| FR-TDASH-1 | Dashboard: Profil, Fachgebiete/Trainingsform, Verifizierung, Stripe, Angebote, Kalender mit Anfragen, Planer, Chat, Konto löschen | bestätigt | – |
| FR-TDASH-2 | Felder `hourly_rate`, `qualifications`, Social-Links im Dashboard pflegbar | **geplant** (öffentliche Seite zeigt sie, Formularfelder fehlen) | – |
| FR-TDASH-3 | Kundenübersicht `/trainer/[id]/clients`: Daten nur bei `share_data` **und** aktiver Buchung | clientseitig bestätigt; Datenbank-Durchsetzung **offen** (SEC-5) | Anonymer/fremder Zugriff liefert keine Trackingdaten |

### 4.7 Chat

| ID | Anforderung | Ist | Akzeptanzkriterium |
|---|---|---|---|
| FR-CHAT-1 | Realtime-Chat Kunde ↔ Trainer | bestätigt | Nachrichten erscheinen ohne Neuladen |
| FR-CHAT-2 | Chat nur zwischen Kunde und Trainer mit gültiger Buchung; Kontakte aus `bookings` | **offen** (SEC-7: heute listet der Kunde alle Trainer, Insert ohne Beziehungsprüfung) | Nachricht ohne Buchungsbezug wird serverseitig abgelehnt |
| FR-CHAT-3 | Schreibindikator, Ungelesen-Marker, Dateianhänge | **geplant** (P2) | – |

### 4.8 Datenschutz und Konto

| ID | Anforderung | Ist | Akzeptanzkriterium |
|---|---|---|---|
| FR-PRIV-1 | Ausdrückliche Einwilligung (Art. 9) bei Kundenregistrierung erzwungen und gespeichert; AGB/Datenschutz bei Kunden und Trainern | teilweise: Zeitstempel in Auth-Metadaten; keine `consents`-Tabelle mit Version | Registrierung ohne Haken schlägt fehl; Zeitstempel + Textversion sind nachweisbar (**geplant**) |
| FR-PRIV-2 | Datenfreigabe `share_data` ist Opt-in (Standard `false` für neue Kunden), jederzeit widerrufbar, wirkt auf alle Daten (Körper-, Ziel-, Trackingdaten) | bestätigt (UI); DB-Durchsetzung **offen**; bestehende Kunden behalten ihren alten Wert (frühere Spaltendefault `true`) | Ohne Freigabe sieht der Trainer keine Daten |
| FR-PRIV-3 | Konto löschen: Daten, Dateien, Login werden gelöscht; Buchungsbelege bleiben anonymisiert; bezahlte künftige Termine blockieren die Löschung | bestätigt (Code + Migration `20261005…`); Lauffähigkeit gegen Staging **nicht geprüft** (Funktion löscht aus `client_plans`, Tabelle laut Export fehlt) | Nach Löschung sind keine personenbezogenen Daten außer anonymisierten Belegen auffindbar |
| FR-PRIV-4 | Datenexport (Art. 15) | **geplant** | – |
| FR-PRIV-5 | Widerruf der Gesundheits-Einwilligung | **offen** (nur Freigabe-Schalter und Löschen vorhanden) | – |

### 4.9 Admin-Übersicht

Admin-Übersicht zu Buchungen, Stripe-Zahlungen und Kulanz-/Schlichtungs-Logs: **geplant** (Phase 3). Verifizierung: §4.2.

## 5. Geschäftsregeln (Defaults aus `docs/release-plan.md` §6)

Gelten, bis der Gründer etwas anderes sagt. Nicht eigenmächtig ändern.

| Regel | Wert | Stand |
|---|---|---|
| Plattformprovision | 15 % (`PLATFORM_FEE_PERCENT`) | **Entscheidung**; **geplant** |
| Antwortfrist Trainer | 24 h | **Entscheidung**; Verfall **geplant** |
| Zahlungsfrist nach Annahme | 24 h | **bestätigt** (RPC, Export) |
| Storno Kunde | kostenlos bis 24 h vor Termin, voller Refund; danach kein Refund | **Entscheidung**; Umsetzung **offen** |
| Storno Trainer | immer voller Refund | **Entscheidung**; **offen** |
| Dokumente | max. 10 MB, PDF/JPG/PNG (heute Dokument-Upload nur PDF, Profilbild JPG/PNG/WebP bis 5 MB) | **Entscheidung** / **bestätigt** |
| Passwort | mindestens 8 Zeichen | **bestätigt** |
| Währung/Preise | EUR, brutto; Umsatzsteuer-Behandlung klärt der Gründer mit Steuerberater | **offen** |

## 6. Datenschutz-Anforderungen

- Gesundheits- und Trackingdaten (Art. 9 DSGVO) nur mit ausdrücklicher Einwilligung; Datentrennung strikt: Kunden sehen nur eigene Daten, Trainer nur Daten von Kunden mit Opt-in und aktiver Buchung (Soll, §2.1).
- Hosting Supabase EU/Frankfurt, Vercel, Stripe, Resend; Drittlandtransfers sind in der Datenschutzerklärung zu behandeln (**Anwalt**).
- Einwilligungen müssen mit Zeitstempel und Textversion nachweisbar sein (**geplant**).
- Löschung und Export: §4.8. Aufbewahrungsfristen: **offen** (§9).
- Rechtstexte (Impressum nach DDG, Datenschutz, AGB) liefert ein Anwalt; der Impressum-Text enthält Platzhalter und verweist auf das TMG. Vor Go-Live Build-Check, der `[` im Impressum meldet (**geplant**).
- Kein Tracking/Analytics ohne Auftrag; Cookie-Banner nur bei nicht-essenziellen Diensten.

## 7. Nichtfunktionale Anforderungen

- **Sicherheit:** Autorisierung gehört an die datenhaltende Stelle (Route Handler/RLS), nicht in die UI. Stand und Befunde: `docs/ARCHITECTURE.md` §12.
- **Sprache:** Alle UI-Texte Deutsch, Anrede „du“, einheitliche Fachbegriffe (`docs/DESIGN_SYSTEM.md` §8).
- **Barrierefreiheit und responsive Nutzung:** Zielniveau **offen** (§9); Mindestregeln in `docs/DESIGN_SYSTEM.md` §9.
- **Betrieb:** Vercel Pro und Supabase Pro vor erstem Live-Zahlungsfluss (Hobby erlaubt keine kommerzielle Nutzung; Backups, keine Auto-Pause) – **Entscheidung** (`masterplan`).

## 8. Releaseumfang

| Phase | Zeitraum (Entscheidung) | Inhalt / Ziel |
|---|---|---|
| Closed Beta | Okt–Nov 2026 | 10–20 Trainer, manuelle Prüfung/Akquise; Ziel 300–800 € Monatsumsatz |
| Public Launch | Dez 2026–Feb 2027 | 40–70 Trainer, Indexierung, Stripe Live |
| 2027 | | 100–150 Trainer, digitale Produkte, B2B/BGM |

**Beta-Gate (Vorschlag, braucht Bestätigung):** Closed Beta mit echten Nutzerdaten erst, wenn (1) alle P0-Sicherheitspunkte (`AGENTS.md` §12) in Staging verifiziert und behoben sind, (2) Schema per Migrationen reproduzierbar ist, (3) Rechtstexte anwaltlich geprüft sind, (4) Stripe-Testmodus-Ablauf inkl. Storno/Refund end-to-end getestet ist, (5) Impressum-Platzhalter entfernt sind.

Reihenfolge der Arbeit: `docs/release-plan.md` §5 (Phasen 2–7, je ein PR).

## 9. Offene Produktentscheidungen (nicht stillschweigend entscheiden)

1. **Storno/Refund:** Soll-Regeln (§5) vs. UI-Versprechen vs. exportierte RPC; Verantwortung für Refund-Ausführung (Stripe) und Teil-/Provisionsrückerstattung.
2. **Provision:** Berechnungsbasis (brutto/netto, Stripe-Gebühren, Rundung), Verhalten bei Refund, Umsatzsteuer.
3. **Berechtigungsmatrix** (§2.1) vollständig bestätigen, insbesondere Admin-Rechte auf Kundendaten.
4. **Datenfreigabe:** Granularität (heute alles-oder-nichts), Behandlung bestehender Kunden mit altem Default `true`, Widerruf der Einwilligung.
5. **Aufbewahrung/Löschung:** Dauer für anonymisierte Buchungsbelege, Nachrichten, Ausweis- und Verifizierungsdokumente.
6. **Verifizierung:** Wiederbewerbung nach Ablehnung; Bedeutung des Siegels (Prüfdatum? Ablaufdatum sichtbar?); Sperrlogik bei abgelaufenen Nachweisen.
7. **Quiz:** Filter vs. Priorisierung bei freien Terminen (`masterplan` vs. README-Entscheidung).
8. **Begriffe:** „Expert Hub“, „Client Hub“, „Kunden-Portal“ in der UI vereinheitlichen.
9. **Barrierefreiheit:** Zielniveau (z. B. WCAG 2.2 AA) festlegen.
10. **Closed-Beta-Gate** (§8) bestätigen.

## 10. Bewusst ausgeschlossen

Unaufgeforderte Features und Großumbauten; Tracking/Analytics; Cookie-Banner ohne nicht-essenzielle Dienste; automatisch erzeugte Rechtstexte; Produktionsänderungen ohne Freigabe; Rezensionen, Chat-Extras, Verified-Badge-Service und B2B vor der Closed Beta (P2). Steuerliche Beratung ist nicht Teil der Plattform.
