# VeriFit – Projektanweisungen für KI-Agenten (Codex, Claude Code, etc.)

Lies diese Datei vollständig, bevor du Code änderst. Antworte dem Gründer auf **Deutsch**. Alle UI-Texte der App sind Deutsch. Code, Variablen und Kommentare dürfen Englisch oder Deutsch sein, folge dem Bestand.

## 1. Ziel & Vision

VeriFit (verifit.online) ist eine Vermittlungsplattform für **manuell verifizierte Personal Trainer und Ernährungsberater** in der DACH-Region. USP: Matching-Quiz + All-in-One Health Hub für Kunden (Pläne, Tracking, Chat) + strikt manuell geprüfte Experten + DSGVO-Datentrennung.

**Rechtsrolle:** VeriFit ist ausschließlich Vermittler. Der Vertrag über Training/Coaching entsteht zwischen Kunde und Trainer.
**Monetarisierung:** Provision je Buchung via Stripe Connect (Standard 15 %).
**Phasen:** Closed Beta (Okt–Nov 2026, 10–20 Trainer) → Public Launch (Dez 2026–Feb 2027) → Skalierung 2027. Details: `docs/masterplan.md`.

## 2. Wie die App funktioniert

Drei Rollen, gespeichert in `profiles.role`: `client`, `trainer`, `admin`.

1. **Trainer** registriert sich (`/trainer/register`) → Status `pending` → lädt Lizenz-PDF + Haftpflicht-PDF hoch (privater Bucket `verification-docs`) → **Admin** prüft manuell unter `/admin` (Signed URLs) → `approved`/`rejected`, Trainer bekommt Mail.
2. **Trainer-Dashboard** (`/trainer/[id]/dashboard`): Profil, Fachgebiete, Verifizierung, Stripe-Connect-Onboarding, Angebote (`trainer_offers`: `discovery` kostenlos / `paid`), Terminkalender (`trainer_slots`), Buchungsanfragen, Krafttrainings- und Ernährungsplaner, Chat, Konto löschen. Kundenübersicht unter `/trainer/[id]/clients`.
3. **Kunde** macht das Matching-Quiz (`/quiz`: Erfahrung, Ziel, Trainingsform, Budget) → Trainerprofil `/trainer/[id]` → Paket + freien Slot wählen → Buchungsanfrage (Login erforderlich, `?next=`-Rücksprung).
4. **Buchungsablauf** (Details: `docs/payment-flow.md`):
   `POST /api/book-slot` (Slot free→pending, Booking pending) → Trainer antwortet via `POST /api/respond-booking` (RPC `respond_to_booking`): Discovery → `confirmed`; bezahlt → `accepted` + 24 h Zahlungsfrist; Ablehnung → `declined` → Kunde zahlt via `POST /api/checkout` (Stripe Checkout) → Webhook `/api/webhook` + Fallback `/api/checkout/confirm` → `finalizePaidBooking` (`confirmed`, Slot `booked`, Mails via Resend). Storno via `/api/cancel-booking` (RPC `cancel_booking`).
5. **Kunden-Dashboard** (`/client/[id]/dashboard`): Buchungen, Zahlung, Datenfreigabe (`share_data`, Opt-in), Körperdaten, Pläne (aus `client_plans.content` JSON, `schedule[datum] → templateName`), tägliches Tracking mit Diagrammen (`client_trackings`), Chat, Konto löschen.
6. **Chat:** Supabase Realtime auf `messages`.

## 3. Tech-Stack

- Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4 (`@tailwindcss/postcss`, keine `tailwind.config`)
- Supabase (Postgres, Auth, Storage, Realtime), Stripe (Checkout + Connect Express), Resend (Mails), zod (Validierung), lucide-react (Icons)
- Hosting: Vercel, Supabase Region Frankfurt/EU
- Befehle: `npm run dev`, `npm run lint`, `npm run build` (vor jedem Abschluss lint + build ausführen und Ergebnis melden)

## 4. Projektstruktur

```
src/app/                    Seiten (App Router) + api/ Route Handler
src/app/api/                book-slot, respond-booking, checkout(+confirm), webhook, cancel-booking,
                            delete-account, stripe/(connect-link|sync-account), admin/(trainer-status|verification-document)
src/app/lib/supabase.ts     Browser-Client (anon key)
src/app/lib/supabaseServer.ts  server-only: Admin-Client (service role), Token-/Rollenprüfung
src/app/lib/validation/     zod-Schemas (auth, booking, admin)
src/app/lib/bookingPayments.ts / resend.ts
src/components/             Gemeinsame Komponenten (AppShell, Chat, TrendChart, SpecialtyPicker, DeleteAccountCard, ...)
src/components/trainer-dashboard/   UI-Sektionen des Trainer-Dashboards
src/hooks/trainer-dashboard/        Daten-Hooks (useTrainerAccount, useTrainerSchedule, Planner, ...)
src/lib/                    constants.ts (Fachgebiete, EINZIGE Quelle für Quiz + Trainer), trackingMetrics, useAuthProfile, nextParam, authErrors
src/lib/trainer-dashboard/  types, constants, utils
supabase/migrations/        SQL-Migrationen (Ziel: vollständige Schema-Quelle)
docs/                       Architektur- und Statusdokumente (siehe Abschnitt 8)
```

## 5. Design-System (nicht ändern ohne Auftrag)

- Hintergrund `bg-slate-950`, Akzent `emerald-500/400`, Karten `bg-slate-900` + `border-slate-800`, Ecken `rounded-xl/2xl/3xl`
- Primärbutton: `bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold`; Sekundär: `bg-slate-800 hover:bg-slate-700 border border-slate-700`
- Seitenaufbau: `<main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">` mit Header, Section, Footer
- Meldungen als farbige Boxen: Fehler `bg-red-500/10 border-red-500/20 text-red-400`, Erfolg emerald
- Ladezustände als deutscher Text oder vorhandene Skeletons (`src/components/Skeleton.tsx`, `loading.tsx`)

## 6. Konventionen

- Client-Komponenten mit `'use client'`, Datenladen per `useState`/`useEffect` bzw. Hooks, kein globaler State-Manager
- **Mutierende Aktionen mit Geld, Status oder fremden Daten laufen über Route Handler** (Bearer-Token → `getRequestAuthentication` → Rollen-/Eigentümerprüfung → zod-Validierung), nicht direkt aus dem Browser
- Neuer Code: konkrete Interfaces statt `any`. Bestehende Patterns nicht ohne Auftrag großflächig umbauen
- Fehlermeldungen für Nutzer auf Deutsch, keine internen Details/Secrets in Logs oder Responses
- Nutzer-/DB-Inhalte in HTML-Mails immer escapen (`escapeHtml`)
- Neue DB-Änderungen **immer als Migration** in `supabase/migrations/` (idempotent, mit Kommentar), nie nur im Dashboard

## 7. Harte Regeln (Verbote)

- Keine Produktion anfassen, nur Staging. Keine Secrets lesen/loggen/committen (`.env*` ist gitignored)
- `SUPABASE_SERVICE_ROLE_KEY` nie im Client-Code, nur in `src/app/lib/supabaseServer.ts`-Kontext (`server-only`)
- Kein Force-Push, keine Tabellen droppen ohne Datenmigration
- Kein Tracking/Analytics einbauen, Design-System nicht ändern
- Rechtstexte (Impressum, AGB, Datenschutz) nicht „erfinden": nur Struktur bauen, Texte prüft ein Anwalt
- Den Block `<!-- BEGIN:nextjs-agent-rules -->` am Ende dieser Datei nicht entfernen. Er wird von `next dev` neu erzeugt.

## 8. Quellen der Wahrheit (Lesereihenfolge)

1. **Code im Repo** gewinnt immer gegen Dokumente.
2. `docs/masterplan.md` – Vision, Kernbereiche, Roadmap
3. `docs/release-plan.md` – RLS-Sollzustand, priorisierte offene Punkte (P0/P1/P2), Phasenplan, Defaults
4. `docs/payment-flow.md` – Buchungs-/Zahlungsablauf
5. `docs/auth-flow.md`, `docs/database-schema.md`, `docs/db/*` – **teilweise veraltet** (siehe Abschnitt 9). Vor Verlass gegen Code und aktuelle Migrationen prüfen und Abweichungen melden.
6. `README-ZUERST-LESEN.md` – Änderungsprotokoll des letzten Final-Release-Updates

### Ergänzende Produkt- und Technikreferenzen

Lies die folgenden Dokumente passend zur Aufgabe. Sie vertiefen Informationen, die in dieser `AGENTS.md` bereits zusammengefasst sind; sie ersetzen weder die Projektregeln noch die spezialisierten Detaildokumente.

- `docs/PRD.md` – Produktziel, Rollen, Nutzerabläufe, fachliche Regeln und prüfbare Akzeptanzkriterien.
- `docs/DESIGN_SYSTEM.md` – visuelle Grundregeln, UI-Zustände, Komponenten- und Accessibility-Konventionen.
- `docs/ARCHITECTURE.md` – technische Schichten, Zuständigkeiten, Datenflüsse, Integrationen und Sicherheitsgrenzen.

Verwende `docs/masterplan.md` weiterhin für die übergeordnete Vision und Roadmap und `docs/release-plan.md` für Release-Reihenfolge und Prioritäten. Verwende `docs/payment-flow.md`, `docs/auth-flow.md` und die Datenbankdokumentation für ihre jeweiligen Detailthemen.

Die drei ergänzenden Dokumente wurden aus dem bisher dokumentierten Projektstand abgeleitet. Sie können daher unvollständig oder teilweise nicht mehr aktuell sein. Behaupte nicht, dass ein beschriebener Zielzustand bereits implementiert ist. Prüfe Implementierungsfragen gegen den aktuellen Code und versionierte Migrationen; prüfe den Zustand einer entfernten Umgebung nur mit autorisiertem Zugriff. Wenn Quellen einander widersprechen oder Angaben fehlen, nenne die Abweichung bzw. Unsicherheit ausdrücklich, statt stillschweigend eine Variante zu wählen.

## 9. Aktueller Stand (Oktober 2026, laut Code-Stand)

**Wichtiger Hinweis zur Verlässlichkeit:** Die folgenden offenen Punkte sind ein Arbeitsinventar und priorisierte Prüfaufträge, kein Beweis für den aktuellen Zustand der Staging- oder Produktionsumgebung. Sicherheitsbefunde sind anhand des aktuellen Repository-Codes, der versionierten Migrationen und – sofern autorisiert – separat anhand der tatsächlichen Staging-Konfiguration zu verifizieren. Insbesondere Aussagen aus möglicherweise veralteten Exporten oder Dokumenten dürfen nicht ungeprüft als bestätigte Schwachstellen übernommen werden.

**Erledigt:** Buchungs-/Zahlungs-/Admin-Server-Routen, Stripe-Connect-Onboarding + Statusabgleich, Passwort-vergessen-Flow, Einwilligungen bei Registrierung, Konto löschen, Tracking inkl. Gesundheit/Motivation + Diagramme, Seitenleiste (`AppShell`), gemeinsame Fachgebiete (`src/lib/constants.ts`), Trainer-Dashboard in Komponenten/Hooks aufgeteilt, `?next=`-Rücksprung beim Buchen, Custom 404/error/global-error, robots.ts, sitemap.ts.

**Offen, nach Priorität:**

P0 – Sicherheit (zuerst gegen die tatsächliche Staging-DB prüfen):
- **Prüfen:** `handle_new_user` könnte `role` ungefiltert aus `raw_user_meta_data` übernehmen. Verifiziere Funktion, Trigger und tatsächliche Rollenvergabe im aktuellen Code/Migrationsstand. Falls bestätigt: Rollen serverseitig whitelisten (`client`/`trainer`), Standard `client`; prüfen, wie zugehörige `clients`/`trainers`-Datensätze konsistent angelegt werden.
- **Prüfen:** mögliche RLS-/Schema-Probleme laut `docs/db/rls-policies.md` (Export möglicherweise veraltet; gegen aktuelle Migrationen und autorisiert gegen Staging prüfen): öffentliche Lesbarkeit sensibler Spalten in `trainers`; zu offene `client_trackings`-Policies; `trainers`-Insert-/Update-Policies; Buchungsbezug bei `messages`; Legacy-Spalten `client_name`/`client_email` in `trainer_slots`; Storage-Zugriff auf `trainer-documents`. Die genannten Punkte sind bis zur Verifikation Verdachtsmomente, keine bestätigten Live-DB-Befunde.
- **Prüfen:** `src/proxy.ts`, Session-Speicherung und serverseitige Autorisierung für `/admin`, `/client/*` und `/trainer/*/dashboard`. Nicht allein aus dem Vorhandensein oder Fehlen einer Proxy-Datei auf die tatsächliche Schutzwirkung schließen; alle geschützten Datenzugriffe und Aktionen nachvollziehen.
- **Prüfen:** Bedarf und vorhandenen Schutz durch Rate-Limits/CAPTCHA bei Signup und `/api/book-slot`.
- **Prüfen:** ob `Chat.tsx` Kontakte unzulässig breit auflistet oder nur berechtigte Kontakte aus relevanten Buchungen lädt.

P0 – Funktion/Schema:
- Es gibt nur **eine** Migration im Repo. Das echte Schema (u. a. `client_plans`, `bookings`, `trainer_offers`, `avatar_url`, `stripe_account_id`, `charges_enabled`, `hourly_rate`, `qualifications`) muss als Migrationen reproduzierbar werden. `docs/db/tables.md` und `docs/db/triggers.md` sind veraltet bzw. falsch (triggers.md enthält die Funktionsliste).
- Rechtstexte: Impressum enthält Platzhalter und verweist auf TMG, AGB/Datenschutz unvollständig (Anwalt).

P1 (Closed-Beta-relevant): Stripe Connect Destination Charges mit `application_fee_amount` (aktuell Checkout ohne Provision/Transfer), Cron `/api/cron/expire-bookings` + Anti-Ghosting, Ablaufüberwachung Lizenz/Versicherung, Ausweis-Upload, `slug` für Trainer-URLs, Quiz-Verbesserungen (Standort, Kapazität, `target_levels`), Datenexport (DSGVO Art. 15), Plan-Templates persistieren, Verlaufsgraphen für Trainer.
P2: Rezensionen, Chat-Extras, Verified-Badge-Service, B2B, Cookie-Banner nur falls nicht-essenzielle Dienste.

Phasen (ein PR je Phase): 2 DB-Härtung & Auth → 3 Zahlung komplett → 4 Öffentliche Seite/Quiz/Trainer-Dashboard → 5 Uploads & Verifizierung → 6 Kunden-Dashboard/Pläne/Chat → 7 SEO/Legal/UX/Docs. Details: `docs/release-plan.md`.

Bekannte veraltete Hinweise: `CLAUDE.md` (Skeleton-Regel, `send-email`-Route existiert nicht mehr), `docs/auth-flow.md` (Heilungslogik im Client-Login ist entfernt, Trainer-Login nutzt ID statt E-Mail), `docs/payment-flow.md` (Storno existiert inzwischen).

## 10. Arbeitsweise

1. Erst lesen, dann einen kurzen Plan nennen (betroffene Dateien, Risiken), dann umsetzen. Bei Unklarheit oder Entscheidungen mit Geld-/Sicherheits-/Rechtsfolgen: nachfragen statt raten.
2. Kleine, thematisch saubere Änderungen auf eigenem Branch (`codex/<thema>`), ein Thema pro PR.
3. Nach jeder Änderung `npm run lint` und `npm run build`. Ergebnis ehrlich berichten, auch wenn etwas nicht ausgeführt werden konnte.
4. Bei DB-Änderungen: Migration schreiben, Auswirkungen auf RLS und bestehende Queries im Code nennen, Test-Matrix (anon, Client A/B, Trainer A/B, Admin) beschreiben.
5. Am Ende jeder Aufgabe: was geändert wurde, was getestet wurde, was offen bleibt, welche Docs angepasst werden müssen.

### 10.1 Read-only-Aufträge und Freigaben

- Wenn der Auftrag als Audit, Bestandsaufnahme, Review oder Read-only bezeichnet ist oder ausdrücklich „nichts ändern“ verlangt, gilt: ausschließlich lesen und analysieren. Keine Dateien bearbeiten, erstellen oder löschen; keine Migrationen ausführen; keine Datenbank-, Storage-, Auth- oder Konfigurationsdaten verändern; nichts deployen und keine Commits, Pushes oder sonstigen Schreibaktionen ausführen.
- In solchen Aufträgen darfst du Befunde und konkrete Änderungsvorschläge liefern, aber erst nach ausdrücklicher Freigabe implementieren.
- Eine allgemeine Anweisung in dieser Datei ist keine Freigabe für eine konkrete sicherheitsrelevante Änderung. Bei Änderungen mit Auswirkungen auf Geld, Rollen, Berechtigungen, personenbezogene Daten oder produktive Abläufe zuerst Umfang und Risiken benennen und bei verbleibender Unklarheit nachfragen.
- Prüfe vor Arbeitsbeginn `git status` und den vorhandenen Diff. Überschreibe, verwerfe oder committe keine bereits vorhandenen Änderungen, die nicht eindeutig zu deinem Auftrag gehören.
- Lies keine Secret-Werte aus und gib sie nicht aus. Wenn eine Prüfung ohne Secret-Werte nicht möglich ist, beschreibe die fehlende Voraussetzung, statt Zugangsdaten offenzulegen.

### 10.2 Belege und Sicherheitsbefunde

- Trenne klar zwischen (a) Befunden im aktuellen Repository-Code, (b) dem in versionierten Migrationen und Konfigurationsdateien beschriebenen Sollzustand und (c) dem tatsächlich geprüften Zustand einer entfernten Umgebung oder Datenbank.
- Migrationen und lokale Konfigurationen beweisen nicht, dass Staging oder Produktion denselben Zustand haben.
- Kennzeichne jeden relevanten Sicherheitsbefund als **bestätigt**, **teilweise bestätigt**, **nicht bestätigt** oder **nicht prüfbar** und nenne konkrete Datei-/Zeilenbelege. Wenn ein Zeilenbeleg nicht verfügbar ist, nenne den exakten Pfad und die relevante Funktion/Policy.
- Behaupte nicht, dass ein Angriff möglich ist, bevor die dafür nötigen Bedingungen anhand des Codes oder der autorisiert geprüften Umgebung belegt sind. Beschreibe stattdessen das plausible Szenario und welche Prüfung noch fehlt.
- Bei Berechtigungsänderungen prüfe sowohl erlaubte als auch verbotene Zugriffe. Berücksichtige, soweit relevant, `anon`, zwei voneinander unabhängige Kunden (Client A/B), zwei Trainer (Trainer A/B) und Admin.
- Führe nur Tests aus, die in der vorhandenen Umgebung sicher und autorisiert sind. Berichte ausgeführte Befehle und tatsächliche Ergebnisse; kennzeichne nicht ausgeführte Tests ausdrücklich.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
