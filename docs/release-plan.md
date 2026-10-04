# VeriFit Release-Plan (Fortsetzung des Manus-Auftrags, Abschnitte 3–7)

Status: **Phase 1 (Buchung/Zahlung/Admin-Server-Routen) ist erledigt (PR #1).** Offen sind die folgenden Punkte. Verbindliche DB-Quelle: `docs/db/*`.

## 3. RLS-Leitprinzipien (Soll, pro Tabelle als Migration umsetzen)

Hilfsfunktion: `public.is_admin()` (SECURITY DEFINER, STABLE, `set search_path = ''`), prüft `profiles.role = 'admin'` für `auth.uid()`. RLS ist auf **jeder** Tabelle aktiv, auch Legacy-Tabellen.

| Tabelle | Soll |
|---|---|
| Auth-Trigger `handle_new_user` | Rolle aus `raw_user_meta_data` **nur** `client` oder `trainer` zulassen (Default `client`), **nie `admin`**. Legt `profiles` + `clients` bzw. `trainers` (Status `pending`) in einer Transaktion an. Frontend macht nur noch `signUp`. |
| `profiles` | Select eigene Zeile, Admin alles. Kein Insert/Update/Delete durch User. Rolle unveränderlich. |
| `clients` | Select/Update eigene Zeile. Trainer nur über RPC/View mit begrenzten Spalten und nur bei `share_data = true` **und** aktiver Buchung. Admin Select. |
| `trainers` | Öffentlich nur über View `trainers_public` (Whitelist: id, slug, name, bio, city, service_mode, specialties, avatar_url, qualifications, hourly_rate, Social-Links, verifiziert) und nur `approved`. Owner Select/Update eigene Zeile; Trigger verhindert Änderung von `status`, `verified`, `stripe_account_id`, `charges_enabled` durch Nicht-Admins. Insert nur mit `status = 'pending'`. E-Mail, Lizenznummer, Versicherungsablauf, Dokumentpfade nie öffentlich. |
| `trainer_offers` | Öffentlich Select (`is_active` und Trainer `approved`). Owner CRUD. |
| `trainer_slots` | Öffentlich Select nur `free` bei approved Trainern. Owner Insert/Delete nur `free`. **Kein** Client-Update. Statuswechsel nur Server/RPC. |
| `bookings` | Client sieht eigene, Trainer eigene, Admin alle. **Kein** direktes Insert/Update/Delete aus dem Browser. |
| `client_plans` | Trainer Insert nur mit `trainer_id = auth.uid()` und aktiver Buchung mit diesem Kunden. Select durch `trainer_id` oder `user_id`. |
| `client_trackings` | Kunde CRUD eigene. Trainer Select nur bei `share_data` + aktiver Buchung. |
| `messages` | Select, wenn `auth.uid()` Sender oder Empfänger. Insert nur mit `sender_id = auth.uid()` und aktiver Buchung zwischen beiden. Tabelle in Publication `supabase_realtime`. |
| `foods` | Select für Authentifizierte, Insert für approved Trainer (`created_by`), Update/Delete Owner/Admin. |
| Storage | `avatars` öffentlich lesbar, Schreiben nur im Ordner `<auth.uid()>/`. `verification-docs` und `identity-docs` privat: Schreiben im eigenen Ordner, Lesen Owner + Admin. Größen-/MIME-Limits am Bucket (PDF/JPG/PNG, 10 MB). |

**RLS-Tests:** `supabase/tests/rls` (SQL oder TS-Skript) mit anon, Client A, Client B, Trainer A, Trainer B, Admin. Erwartete Ergebnisse als Matrix im PR. Zusätzlich Supabase Security Advisor ohne Warnungen.

## 4. Offene Probleme (nach Priorität)

**P0 – Sicherheit (gegen `docs/db/*` prüfen, sonst fixen)**
- S1 Rollen-Eskalation über `signUp({ options: { data: { role } } })` (Trigger muss whitelisten).
- S2 Trainer können `status` selbst setzen (Dashboard-Update, Register-Insert).
- S3 `select('*')` auf `trainers` in `quiz/page.tsx` und `trainer/[id]/page.tsx` → öffentliche Spalten nur über View.
- S4 `loadClients()` (Trainer-Dashboard) und `Chat.tsx` listen **alle** Kunden bzw. Trainer, ignorieren `share_data`/Buchung. Kontakte aus `bookings` ableiten.
- S5 `client/[id]/dashboard` prüft nicht `session.user.id === clientId`. Trainer-Dashboard ignoriert `[id]`, lädt per E-Mail, hat keinen Rollen-/Statuscheck.
- S6 Login/Lookups per E-Mail (`trainer/login`, Dashboard) → per `id`. Heilungslogik `delete().eq('email')` in `client/login` entfernen.
- S7 `proxy.ts` tut nichts. Session liegt in localStorage. Migration auf `@supabase/ssr` (Cookies) und serverseitigen Rollencheck für `/admin`, `/client/*`, `/trainer/*/dashboard`.
- S8 Rate-Limit/CAPTCHA auf Signup und `/api/book-slot`. Webhook-Mail: `offer_title` escapen.
- S9 Auth-Härtung: Mindestpasswort 8, **Passwort-vergessen-Flow fehlt**, E-Mail-Bestätigung sauber behandeln, eigener SMTP (Resend), Redirect-URLs.

**P0 – Funktion**
- F-A `signUp` + clientseitiger Insert in `clients`/`trainers`: scheitert bei aktiver E-Mail-Bestätigung (keine Session → RLS), Race Condition → Trigger-Lösung (S1).
- F-B `client/[id]/dashboard` `loadPlans`: fragt nicht existierende Spalten (`client_email`, `client_id`, `type`) und rendert `day_of_week`/`meal_title`, obwohl `content` ein JSON-Blob mit `schedule[date]` ist → Kunde sieht keine Pläne. Per `user_id` laden, parsen, nach Datum anzeigen.
- F-C Öffentliche Trainerseite zeigt keine Pakete und nutzt Legacy `slot.title/price` (Phase-1-PR prüfen, falls nicht erledigt).
- F-D `quiz/page.tsx` exportiert `AVAILABLE_SPECIALTIES` aus einer `page.tsx` (ungültiger Export) → gemeinsame Konstante in `src/app/lib/constants/specialties.ts`. Taxonomie angleichen: Quiz-Ziele wie „Body-Transformation", „Mobilität", „Functional Fitness", „Gewichtsverlust" matchen die Trainer-Fachgebiete („Transformation", „Mobility & Stretching", „Functional Training", „Gewichtsmanagement") nicht. `isGoalAvailable` zeigt Ziele als verfügbar, `executeMatching` liefert dann 0 Treffer. Langfristig `specialties` als `text[]`.
- F-E Einwilligung Art. 9 in `client/register`: `noValidate` ignoriert `required`, Checkbox ist unkontrolliert und wird nicht gespeichert → erzwingen und speichern (`consents`-Tabelle: user_id, type, version, accepted_at). Gleiches für AGB/Datenschutz, auch bei Trainern.
- F-F Impressum enthält Platzhalter `[...]` und verweist auf TMG (jetzt DDG). Datenschutz/AGB unvollständig (Verantwortlicher, Rechtsgrundlagen, Speicherdauer, Drittlandtransfer USA, Widerruf, Haftungsausschluss bei Körperverletzung ggf. unwirksam) → Struktur bauen, Texte **vom Anwalt**. Build-Check, der Platzhalter `[` im Impressum meldet.
- F-G Webhook: sicherstellen, dass `trainer_slots.booked` gesetzt wird, und `checkout.session.expired`/`async_payment_failed` behandeln.

**P1 – Masterplan-Lücken (Closed-Beta-relevant)**
1. Profilbild-Upload (Trainer + Kunde), Ausweis-Upload (privat, nach Prüfung löschen), Admin-Viewer inline (Modal mit Signed URL), `verified`-Flag, Ablaufüberwachung per Cron (Sperre + Warnmail 30 Tage vorher), Admin-Mails bei Freigabe/Ablehnung.
2. Trainer-Dashboard: UI für `service_mode`, `hourly_rate`, `qualifications`, Social-Links, Avatar (State existiert, Formularfelder fehlen). `package_*` durch Offers ablösen (Quiz-Budget aus `trainer_offers`). Templates persistieren (`plan_templates`), gesendete Pläne wieder laden. `slug` für `/trainer/<slug>`. Lebensmittelsuche mit `startsWith`-Priorität. Mifflin-St.-Jeor-Anzeige nur bei Opt-in + Buchung (RPC).
3. Stripe Connect Express: Onboarding-Link, `stripe_account_id`, `charges_enabled` via `account.updated`, Destination Charge mit `application_fee_amount`, Buchung nur bei `charges_enabled`, Refund bei Storno.
4. Cron `/api/cron/expire-bookings` (Header `CRON_SECRET`): Verfall laut 2.2 Punkt 6, Anti-Ghosting-Zähler.
5. Kunden-Dashboard: Trainer-Ansicht, Profilbild, Tracking um Gesundheit/Motivation erweitern, Verlaufsgraphen, Prefill-Bug (Werte von gestern werden vorbefüllt), Konto löschen/Datenexport.
6. Quiz: Standort/Remote, Philosophie-Frage, Kapazitäts-Check (zukünftige freie Slots), Erfahrung-Filter über Spalte `target_levels` statt Textsuche in der Bio.

**P2 – später**
Rezensionen, Chat-Extras (Schreibindikator, Ungelesen, Anhänge), Verified-Badge-Service, B2B, Cookie-Banner (nur falls nicht-essenzielle Dienste).

## 5. Phasenplan (je ein PR, Definition of Done aus Abschnitt 0)

- **Phase 2 – DB-Härtung & Auth:** Migrationen (Trigger, `is_admin`, Policies, Views, RPC-Härtung), RLS-Tests, `@supabase/ssr`, Rollen-/ID-Checks (S1–S9, F-A), Passwort-Reset, Einwilligungen (F-E).
- **Phase 3 – Zahlung komplett:** Connect Express, Webhooks (F-G), Cron-Verfall, Storno-/Refund-Regeln, Admin-Übersicht Buchungen/Zahlungen.
- **Phase 4 – Öffentliche Seite, Quiz, Trainer-Dashboard:** F-C, F-D, P1 Nr. 2 und 6, `slug`, Server-Component mit `generateMetadata` + JSON-LD.
- **Phase 5 – Uploads & Verifizierung:** P1 Nr. 1.
- **Phase 6 – Kunden-Dashboard, Pläne, Chat:** F-B, P1 Nr. 5, Chat-Kontakte aus `bookings`, Unique-Channel, Legacy-Tabellen entfernen.
- **Phase 7 – SEO/Legal/UX/Docs:** F-F, dynamische Sitemap, `robots` (Dashboards disallow + noindex), OG/Twitter, `error.tsx`/`global-error.tsx`, ungenutzte `Footer.tsx` einbinden, CLAUDE.md/docs aktualisieren (Skeleton-Regel widerspricht vorhandenen `loading.tsx`, `send-email`-Route existiert nicht mehr), `SWIMMING_POOL_HOURS` → `SLOT_HOURS`, Dashboard in Komponenten splitten (verhaltensgleich), `.env.example`, Node 22 in `engines`.

## 6. Defaults (gelten, bis der Gründer etwas anderes sagt; im PR dokumentieren)
- Plattformprovision 15 % (`PLATFORM_FEE_PERCENT`), Trainer-Antwortfrist 24 h, Zahlungsfrist 24 h nach Annahme.
- Storno: kostenlos bis 24 h vor Termin (voller Refund), danach kein Refund. Trainer-Storno: immer voller Refund.
- Dateien: max. 10 MB (Dokumente), PDF/JPG/PNG. Passwort min. 8 Zeichen.
- Währung EUR, Preise brutto, USt.-Behandlung klärt der Gründer mit Steuerberater.

## 7. Lieferung
- `docs/RELEASE-REPORT.md` am Ende: erledigt/offen, Env-Variablen-Liste, manuelle Testprotokolle, Go-Live-Checkliste (Stripe Live-Keys + Webhook, Vercel Pro, Supabase Pro/Backups, Site-URL/Redirects, SMTP, DNS, Impressum ausgefüllt).
- **Verboten:** Produktion anfassen, Secrets loggen, Force-Push, Tabellen ohne Datenmigration droppen, Design-System ändern, Tracker/Analytics einbauen, Service-Role im Client.
