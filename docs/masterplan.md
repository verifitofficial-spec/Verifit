# VeriFit Masterplan (Stand: Oktober 2026)

## 1. Vision & USP
- **Name/Domain:** VeriFit, verifit.online. Namens-/Markenrecherche (DPMA/EUIPO) ohne Blocker (andere Nizza-Klassen).
- **Vision:** Erste nahtlose Plattform im DACH-Raum, die ein Gesundheits- und Fitness-Dashboard für Endkunden mit einem **manuell verifizierten Experten-Marktplatz** verbindet.
- **USP:** Bestehende Lösungen sind entweder Coaching-Software für Trainer (ohne Vermittlung) oder reine Verzeichnisse (ohne Planer/Tracking). VeriFit kombiniert Matching-Quiz + All-in-One Health Hub (Pläne, Tracking, Schlaf, Laune, Motivation) + strikte DSGVO-Datentrennung.
- **Rechtsrolle:** VeriFit ist ausschließlich Vermittler. Der Vertrag über Training/Coaching entsteht zwischen Kunde und Trainer.

## 2. Kernbereiche

### A. Admin (Kontrollzentrale)
- Keine automatische Freischaltung. Trainer registrieren sich mit Status `pending`, der Admin prüft manuell.
- Pflicht-Uploads: Profilbild (Bucket mit öffentlichem Lesen, geschütztem Schreiben), amtlicher Ausweis (privat, nur für Abgleich, nach Prüfung löschen), Berufshaftpflicht + Trainerlizenz als PDF (privat, im Admin-Dashboard über integrierten Viewer per Signed URL).
- Admin setzt Status `approved`/`rejected` (serverseitig, Rollenprüfung), Trainer erhält Mail.
- Fristüberwachung: Ablauf von Lizenz/Versicherung sperrt Trainer automatisch; Warnmail 30 Tage vorher.
- Überwachung von Buchungen, Stripe-Zahlungen, Kulanz-/Schlichtungs-Logs.

### B. Kunden-Dashboard (Health Hub)
- Alle Daten live aus Supabase, keine Mockdaten.
- Stammdaten + Profilbild; Übersicht des zugewiesenen Coaches inkl. Qualifikationen; Zugriff auf Pläne, Angebote, Termine.
- Opt-in `share_data`: Kunde steuert, ob der Coach seine Körper-/Trackingdaten sieht.
- Tägliches Tracking (`client_trackings`): Gewicht, Wasser, Schlaf, Kalorien, Laune, Gesundheit, Motivation, mit Verlaufsgraphen.
- Buchungen mit Status, „Jetzt bezahlen", Stornierung (serverseitig).
- Konto löschen und Datenexport (DSGVO Art. 15/17).

### C. Trainer-Dashboard & öffentliche Trainerseite
- Alles persistent in Supabase (Profil, Pakete, Slots, Plan-Templates, Pläne).
- Öffentliche Seite `verifit.online/trainer/<slug>`: Profilbild, Bio, Siegel, Pakete (dynamisch aus `trainer_offers`), freie Slots, Rezensionen (nur nach bestätigter Buchung, Admin-moderiert). Buchen nur eingeloggt.
- Ernährungsplaner: Mahlzeiten, Lebensmittelsuche (Präfix-Priorität), automatische Kalorien-/Makroberechnung nach Mifflin-St. Jeor (nur bei `share_data` + aktiver Buchung).
- Krafttrainingsplaner: Templates, Sets/Reps/Gewicht, Zeitraum, „An Kunden senden".
- Kalender & Anti-Ghosting: keine Antwort binnen 24 h → Anfrage verfällt, Ranking-Abstieg/Verwarnung.

### D. Matching-Quiz
- Echte Filter: Standort/Remote, Fachgebiet (gemeinsame Taxonomie mit Trainer-Dashboard), Trainingsphilosophie, Budget (aus `trainer_offers`).
- Kapazitäts-Check: nur Trainer mit tatsächlich freien zukünftigen Slots.
- Ergebnis: Steckbriefe → Klick auf vollständiges Profil mit Buchungsoptionen.

### E. Chat
- Supabase Realtime, Tabelle `messages` mit RLS. Chat nur zwischen Kunde und Trainer mit gültiger Buchung.
- Später: Schreibindikator, Ungelesen-Marker, Dateianhänge (privater Bucket, Signed URLs).

## 3. Technik, Security, Recht

- **Stack:** Next.js (App Router, TS, Tailwind), Supabase (Frankfurt/EU), Vercel, Stripe, Resend.
- **Vercel:** Hobby erlaubt keine kommerzielle Nutzung → vor dem ersten Live-Zahlungsfluss Upgrade auf **Pro**. Supabase vor Launch auf **Pro** (Backups, keine Auto-Pause, Gesundheitsdaten).
- **Security:** RLS auf jeder Tabelle; Kunden sehen nur eigene Daten, Trainer nur Daten von Kunden mit Opt-in + aktiver Buchung. Alle API-Routen prüfen das Supabase-Token serverseitig. Eingaben validiert (zod) und escaped. Rate-Limiting/CAPTCHA auf Signup und Buchung.
- **Stripe Connect (Express):** Destination Charges mit `application_fee_amount`. Webhook `/api/webhook` (Signatur Pflicht): `checkout.session.completed`, `account.updated`. Slot/Buchung erst nach Webhook final.
- **Recht:** Impressum (DDG), Datenschutzerklärung (Supabase EU, Stripe, Vercel, Resend, Art. 9 Gesundheitsdaten, Drittlandtransfers), AGB mit Vermittlerklausel, Widerrufs-/Stornoregeln, protokollierte Einwilligungen (Zeitstempel + Version). Cookie-Banner nur nötig, sobald nicht-essenzielle Dienste (Analytics etc.) eingesetzt werden. **Alle Texte vom Anwalt/Generator prüfen lassen.**
- **UX/SEO:** Custom 404, `loading.tsx`/Skeletons, `error.tsx`/`global-error.tsx`, dynamische `sitemap.ts` (Trainer-Slugs), `robots.ts` (Dashboards disallow/noindex), OpenGraph/Twitter, JSON-LD.

## 4. Rollen
- Gründer: Architektur, Backend-Migration, Security, Go-Live.
- Reha-Kumpel (ab Oktober): Trainer-Akquise/Onboarding Closed Beta.
- Twin (nach Launch): Support, Admin-Verifizierungen, Community.
- Discord „VeriFit Expert Hub" für Trainer.

## 5. Monetarisierung
1. Provision je Buchung via Stripe Connect (Kern).
2. Digitale Produkte der Trainer (Masterclasses/Abos) mit Plattformanteil.
3. B2B/Corporate-Fitness (BGM).
4. „Verified Badge as a Service".

## 6. Roadmap
- **Phase 1 (Tech-Build/Security):** siehe `docs/release-plan.md`.
- **Phase 2 (Okt–Nov 2026, Closed Beta):** 10–20 Trainer, 300–800 € Monatsumsatz, manuelle Prüfung.
- **Phase 3 (Dez 2026–Feb 2027, Public Launch):** 40–70 Trainer, 2.000–4.500 €/Monat, Indexierung, Stripe Live.
- **Phase 4 (2027):** 100–150 Trainer, 8.000–14.000 €/Monat, Support-Übergabe, digitale Produkte, B2B.
- **Phase 5 (2029–2030):** 500–1.000+ Trainer, 35.000–75.000 €+/Monat, DACH-Expansion, Enterprise-BGM.
