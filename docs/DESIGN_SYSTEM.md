# VeriFit – Design System

Dieses Dokument beschreibt **wie** VeriFit aussieht und sich verhält. Produktverhalten: `docs/PRD.md`. Technik: `docs/ARCHITECTURE.md`. Arbeitsregeln: `AGENTS.md`.

- Stand der Bestandsaufnahme: 11.10.2026. Grundlage war ein Code-Snapshot; es wurden damals kein vollständiges Browser-Audit und keine umfassende visuelle Prüfung durchgeführt. Kontrastwerte sind rechnerische Näherungen.
- **Wichtig:** Abschnitt 2 dokumentiert den damaligen Ist-Bestand und kann durch inzwischen umgesetzte Codex-Änderungen teilweise überholt sein. Vor jeder weiteren Implementierung den aktuellen Code und Git-Diff prüfen; Ist-Befunde nicht ungeprüft als aktuellen Zustand behandeln.
- Marker: **Ist** = im Code belegt (mit Stand/Beleggrenze), **Empfehlung** = Gestaltungsregel dieses Zielsystems, **Entscheidung nötig** = braucht weiterhin eine gesonderte Gründerentscheidung. Weitere Marker: `AGENTS.md` §2.
- **Freigegebene Gestaltungsrichtung:** Die UI soll gezielt von einem austauschbaren, generischen SaaS-/KI-Look zu einem hochwertigen, eigenständigen, modernen und professionellen VeriFit-Auftritt weiterentwickelt werden. Die folgenden Zielregeln sind der Auftrag für das Redesign. Das ist keine Freigabe, Backend, Geschäftslogik oder Datenmodell zu verändern.

## Implementierter Theme-Stand (12.10.2026)

Das semantische Theme-Fundament ist im aktuellen Code umgesetzt. Die ältere Bestandsaufnahme in Abschnitt 2 bleibt als Entstehungskontext erhalten; Aussagen wie „nur dunkles Theme“ beschreiben dort den Snapshot vom 11.10.2026 und nicht mehr den aktuellen Implementierungsstand.

### Theme-Verhalten

- VeriFit unterstützt `light` und `dark` als zwei Farbvarianten derselben Komponentenstruktur.
- Beim ersten Besuch gilt die Systemeinstellung über `prefers-color-scheme`. Eine aktive Auswahl wird unter `verifit-theme` in `localStorage` gespeichert und bei späteren Besuchen sowie Seitenwechseln wiederverwendet.
- Ein kurzes Inline-Skript im Root-Layout setzt `data-theme` vor dem ersten Paint. `ThemeProvider` synchronisiert React, das DOM, Systemänderungen ohne gespeicherte Auswahl und Änderungen in anderen Tabs.
- Der Umschalter besitzt ein zustandsabhängiges zugängliches Label („Dunkles Design aktivieren“ bzw. „Helles Design aktivieren“) und ist in öffentlicher Navigation, Auth-Hülle, App-Shell, Admin, Quiz, Trainerprofil und Footer erreichbar.
- Das Theme bleibt eine reine Darstellungspräferenz. Es ändert keine Rolle, Authentifizierung, Datenabfrage oder Geschäftsregel.

### Semantische Tokens

Die Quelle der Wahrheit ist `src/app/globals.css`. Komponenten verwenden die über Tailwind v4 bereitgestellten semantischen Klassen; rohe Slate-/White-Farbklassen sind in der Anwendungsoberfläche nicht mehr die Grundlage.

| Rolle | CSS-Variable | Tailwind-Klasse (Beispiele) | Verwendung |
|---|---|---|---|
| Seitenfläche | `--background` | `bg-canvas` | Seiten, ruhige Unterflächen |
| Primärtext | `--foreground` | `text-ink` | Überschriften, Hauptinhalte |
| Sekundär-/Hinweistext | `--ink-soft`, `--ink-muted` | `text-ink-soft`, `text-ink-muted` | Fließtext, Metadaten |
| Flächenhierarchie | `--surface`, `--surface-raised`, `--surface-soft`, `--surface-hover` | `bg-surface`, `bg-surface-raised`, `bg-surface-soft` | Karten, Eingaben, Hover |
| Linien | `--line`, `--line-strong` | `border-line`, `border-line-strong` | Trennung, Bedienelemente |
| Marke/Aktion | `--accent`, `--accent-strong`, `--accent-soft` | `bg-accent`, `text-accent`, `bg-accent-soft` | Primäraktionen, verifiziert/bestätigt |
| Primärbutton-Text | `--primary-foreground` | `text-primary-foreground` | kontrastierender Text auf `bg-accent` |
| Status | `--danger-*`, `--warning-*`, `--info-*` | `text-danger`, `bg-warning-soft`, `border-info-line` | Fehler, Warnung, Information |
| Dialog-Overlay | `--overlay` | `bg-overlay` | Modale Hintergrundfläche |
| Diagramme | `--chart-*` | Verwendung im SVG über `var(...)` | Datenlinien, Achsen, Raster, Punkte |

Neue oder angefasste Komponenten verwenden diese Rollen statt einer themeabhängigen Farbnummer. Statusfarben bleiben zusätzlich immer als Text verständlich. Emerald ist in der Light-Palette bewusst dunkler als im Dark Mode, damit kleiner Text und Fokuszustände ausreichend kontrastieren.

### Komponenten- und Qualitätsregeln

- Primäraktionen: `bg-accent hover:bg-accent-strong text-primary-foreground`.
- Sekundäraktionen: `bg-surface` oder `bg-surface-soft`, `border-line(-strong)`, Text `text-ink(-soft)`.
- Eingaben: mindestens `border-line-strong`; der globale `focus-visible`-Ring verwendet `--accent`.
- Karten erhalten eine Oberfläche nur bei funktionaler Gruppierung. Abschnittstrennung darf weiterhin ausschließlich über `border-line` und Abstand erfolgen.
- Native Eingaben folgen über `color-scheme` dem aktiven Theme. Reduzierte Bewegung wird global berücksichtigt.
- Diagramme behalten eine Kennzahl pro Grafik. `null`-Messwerte werden herausgefiltert, nicht als `0` gezeichnet. Einheiten, feste Skalen für 1–10-Werte sowie Empty States bleiben erhalten; Achsen, Raster und Punktfüllung sind themeabhängig.

## 1. Designrichtung: „Geprüft, nicht dekoriert“

### Markencharakter

VeriFit soll wie ein hochwertiges Produkt für professionelles Training und fundierte Entscheidungen wirken: **präzise, souverän, modern, menschlich und vertrauenswürdig**. Es soll nicht wie ein austauschbares KI-generiertes SaaS-Template aussehen und weder Fitness-Klischees noch sterile Behörden- oder Klinikästhetik kopieren.

Die kreative Leitlinie ist **Editorial Performance**: eine klare redaktionelle Hierarchie, mutige aber kontrollierte Typografie, bewusst gesetzte Akzente, präzise Ausrichtung von Daten und ein Layout-Rhythmus, der je nach Seitentyp variiert. Die Gestaltung soll sichtbar entworfen wirken – nicht nur aus Standardkarten, Badges und einem Hero mit großem Claim bestehen.

### Gestaltungsprinzipien

1. **Vertrauen durch Konkretheit.** Zeige, was tatsächlich geprüft wurde und welche Informationen vorliegen. Keine unbelegten Superlative, erfundenen Bewertungen oder Vertrauenssiegel ohne Nachweis.
2. **Eigenständige visuelle Hierarchie.** Überschriften, Inhalte, Kennzahlen und Aktionen erhalten klare, unterscheidbare Gewichtung. Nicht jede Überschrift ist extrafett, nicht jede Information uppercase und nicht jeder Abschnitt eine Karte.
3. **Editorialer Rhythmus statt Template-Raster.** Auf öffentlichen Seiten sind unterschiedlich breite Spalten, klare Text-/Inhaltsbeziehungen und gezielt eingesetzte asymmetrische Kompositionen erlaubt, wenn sie die Orientierung verbessern. Keine zufällige Asymmetrie und kein obligatorisches Bento-Raster.
4. **Daten vor Dekoration.** Preise, Termine, Status, Fachgebiete und Messwerte sind gut lesbar, sauber ausgerichtet und vergleichbar. Bei Zahlen `tabular-nums` verwenden, wo es hilft.
5. **Funktionale Ruhe in sensiblen Bereichen.** Gesundheitsdaten, Zahlung, Kontoänderungen und Löschen bekommen sachliche Sprache, klare Folgen und eine ruhige Oberfläche – ohne dekorative Effekte.
6. **Slate-/Emerald-Basis bewusst einsetzen.** Die bestehende dunkle Slate-Grundlage und Emerald bleiben zunächst die Markenbasis. Emerald steht für primäre Aktionen und bestätigte/verifizierte Zustände; er ist kein Dauerhighlighter. Farben werden über semantische Rollen konsistent eingesetzt.
7. **Weniger, bessere Oberflächen.** Flächen trennen tatsächlich unterschiedliche Inhalte oder Aufgaben. Maximal zwei sichtbare Containerebenen; weitere Hierarchie entsteht durch Typografie, Linien, Abstände und Gruppierung.
8. **Menschlich und spezifisch, nicht dekorativ „premium“.** Qualität entsteht durch sorgfältige Proportionen, präzise Texte, konsistente Details und gute Bedienbarkeit – nicht durch Goldakzente, Glows, künstliche Luxus-Sprache oder übertriebene Rundungen.
9. **Zweck vor Neuheit.** Kein Effekt, Layoutmuster oder Animation nur, um ungewöhnlich auszusehen. Jede gestalterische Entscheidung muss der Orientierung, dem Verständnis, dem Vertrauen oder der Bedienung dienen.

### Visuelle Signatur

- **Typografie:** klare Größensprünge zwischen Seitenüberschrift, Abschnitt, Inhalt und Metadaten. Große Headlines dürfen auf öffentlichen Seiten selbstbewusst sein; Fließtext bleibt komfortabel lesbar. `font-black`, Vollversalien und starkes Letter-Spacing sind sparsam einzusetzen.
- **Komposition:** Öffentliche Seiten bekommen einen bewussten Seitenaufbau mit klarer Einstiegsaussage, konkretem Nutzen und einer eindeutigen Hauptaktion. Nicht jede Seite benötigt einen Hero. Funktionsseiten beginnen mit der Aufgabe, nicht mit Marketing.
- **Flächen:** dunkle, ruhige Basis; sparsame angehobene Flächen; sichtbare Abgrenzung durch Kontrast und Linien statt durch wiederholte große Schatten. Blur und Glow sind nicht das Erkennungsmerkmal der Marke.
- **Akzente:** Emerald sparsam und semantisch. Statusfarben sind fachlich begründet. Keine dekorativen Verläufe, wechselnden Akzentfarben oder zufälligen Farbflächen.
- **Icons:** `lucide-react` oder vorhandene passende Icons, einheitliche Strichstärke und optische Größe. Keine Emoji als Ersatz für konsistente UI-Icons.
- **Bilder:** ausschließlich vorhandene echte Assets oder später ausdrücklich freigegebenes, authentisches Bildmaterial. Keine erfundenen Personen, Stockfotos als Platzhalter oder KI-generierten Produkt-/Trainerbelege.
- **Bewegung:** knappes funktionales Feedback, keine Scroll-Inszenierung, Parallax, animierten Hintergründe oder Spezialcursor.

### Gestaltung je Produkttyp

- **Startseite:** markanter, klarer Einstieg; konkrete Erklärung des tatsächlichen VeriFit-Nutzens; sichtbare nächste Schritte für Kunden und Trainer; Vertrauensinformationen dort, wo sie verständlich belegt werden können. Keine austauschbaren Claims, Countdown-Elemente, Fake-Statistiken oder erfundenen UI-Darstellungen.
- **Trainerliste und Quiz-Ergebnisse:** Trainer gut vergleichbar machen. Fachgebiete, verfügbare Daten, Preis und passende Aktion schnell erfassbar. Gestaltung darf variieren, aber Vergleichbarkeit und Filterbedienung bleiben klar.
- **Trainerprofil:** die Person und ihr tatsächliches Angebot stehen im Mittelpunkt. Identität, Fachgebiete, vorhandene Qualifikationen/Verifizierungsinformationen und Angebot erhalten eine klare Reihenfolge. Buchungsoptionen sind leicht auffindbar, aber nicht aggressiv inszeniert.
- **Kunden-Dashboard:** nächste Aufgabe, nächste Termine und wichtige Daten stehen vor allgemeinen Kennzahlen oder Dekoration.
- **Trainer-Dashboard:** Verwaltungsarbeit effizient unterstützen; Anfragen, Kunden, Termine und Pläne strukturiert darstellen. Keine Marketing-Heros in Arbeitsansichten.
- **Admin:** sachliche Tabellen, eindeutige Status und klar abgegrenzte sensible Aktionen.

Dieses Zielsystem autorisiert eine deutlichere visuelle Überarbeitung der bestehenden UI. Es autorisiert **keine** Änderung an Geschäftsregeln, Datenzugriffen oder Backend-Verhalten.

## 2. Ist-Zustand (belegt)

### 2.1 Grundlagen (historischer Snapshot vom 11.10.2026)

- Zum damaligen Snapshot bestand ein dunkles Theme ohne Umschalter. Dieser Befund ist durch den oben dokumentierten Implementierungsstand vom 12.10.2026 überholt.
- Schrift: Geist Sans und Geist Mono über `next/font` (Standard von `create-next-app`, keine bewusste Markenentscheidung dokumentiert). Geist Mono wird in den Snapshot-Dateien nicht verwendet. `<html lang="de">` ist gesetzt. Kein `color-scheme: dark` (native Datums-/Zeitfelder und Auswahllisten können hell erscheinen).
- Tailwind v4 (`@tailwindcss/postcss`), kein `tailwind.config`, Standard-Breakpoints (`sm`, `md`, `lg`). Icons: `lucide-react` (Trainer-Dashboard, Admin, Navigation).
- Seitenaufbau: `<main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">` mit Header, Section, Footer. Globale `AppShell` (Seitenleiste ab `md`, untere Leiste mobil) für angemeldete Kunden/Trainer; ausgeblendet auf Auth-Seiten und `/admin`.

### 2.2 Farben und Flächen (Ist)

| Verwendung | Klassen im Bestand |
|---|---|
| Seite | `bg-slate-950`, Text `text-white` / `text-slate-100` |
| Karte/Fläche | `bg-slate-900` + `border-slate-800`; Trainer-Dashboard: `bg-slate-900/60 backdrop-blur-md border-slate-800/80 shadow-xl` |
| Verschachtelte Fläche | `bg-slate-950/60`, `bg-slate-900/50`, `bg-slate-950/80` |
| Akzent / Primäraktion | `emerald-500`/`-400`; Primärbutton `bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold` |
| Sekundärbutton | `bg-slate-800 hover:bg-slate-700 border border-slate-700` |
| Fehler | `bg-red-500/10 border-red-500/20 text-red-400` |
| Erfolg | `bg-emerald-500/10 border-emerald-500/25 text-emerald-400` |
| Hinweis/Warnung | `amber-500/10`, `text-amber-300/400` |

**Inkonsistenzen (Ist):** Buchungsstatus „ausstehend“ erscheint im Trainerbereich gelb (`yellow-500/400`, `BookingRequests.tsx`), im Kundenbereich amber (`client/[id]/dashboard/page.tsx`); „bestätigt“ grün (`green-500/400`) vs. emerald; „bezahlte Angebote“ in `indigo` (`OfferModal.tsx`, `OffersSection.tsx`, öffentliche Trainerseite) – der einzige blau-violette Farbton im Bestand, ohne Zuordnung zu einer Bedeutung. Fehlerboxen existieren als Seiten-Eigenbau, `FeedbackBox`, `FormFieldError` und `StripeReturnSync` in leicht unterschiedlichen Varianten.

### 2.3 Form, Layout, Komponenten (Ist)

- Radien `rounded-xl/2xl/3xl` überall; Client-Dashboard: acht gleich gebaute `rounded-3xl p-8 shadow-2xl`-Karten untereinander (`cardCls`), Trainer-Dashboard: elf `SectionCard` (`rounded-2xl`, `backdrop-blur`, `shadow-xl`) mit `space-y-10`.
- **Karten in Karten in Karten:** z. B. `WorkoutPlanner` → `SectionCard` → `bg-slate-950/60 rounded-2xl` → `bg-slate-900/50 rounded-xl` → `bg-slate-950/50 rounded-lg`; `NutritionTemplateEditor` → `MealCard` → `MealItemRow` analog.
- Wiederverwendbar (Ist): `src/components/trainer-dashboard/ui.tsx` (`inputClass`, `smallInputClass`, `labelClass`, `primaryButtonClass`, `navButtonClass`, `SectionCard`, `SectionHeader`, `FeedbackBox`, `ModalShell`), `FormError.tsx` (`FormFieldError`), `Skeleton.tsx` + `loading.tsx`, `AppShell`, `TrendChart` (eigenes SVG, `role="img"` + `aria-label`), `SpecialtyPicker`, `DeleteAccountCard`, `CalendarParts`, `Chat`, `StripeReturnSync`. `Footer.tsx` existiert, wird aber nicht verwendet; Footer sind pro Seite kopiert (mit/ohne Rechtslinks).
- Duplizierte Stile statt Wiederverwendung: Login-/Registrierseiten definieren `inputClass`/`labelClass` lokal; Client-Dashboard `inputCls`/`cardCls` lokal.
- Doppelte Navigation: Auf Dashboards zeigen `AppShell` (Logo, Abmelden) und die Seitenheader (Logo, Abmelden) Gleiches.
- Seitenleiste „Buchungen“ und „Tracking“ sind Ankerlinks auf dasselbe Dashboard (kein Aktivzustand).

### 2.4 Typografie (Ist)

- Wortmarke `VERIFIT.` (`font-black tracking-wider text-emerald-400`, Punkt weiß). Überschriften `font-extrabold`/`font-black`; Labels durchgehend `text-xs uppercase tracking-wider font-semibold text-slate-400`.
- Sehr kleine Schrift für Inhalte: `text-[9px]`, `text-[10px]`, `text-[11px]` (Kalender-Zellen, Tabellenköpfe, Badges, Hinweise).
- Zahlen ohne bewusste Ziffernausrichtung (keine `tabular-nums`).

### 2.5 Texte (Ist)

- Anrede „du“; deutsche Fehlertexte zentral in `src/lib/authErrors.ts`.
- Marketing-Töne mit geringem Informationsgehalt: Startseite „Geprüfte Qualität & Exzellenz“, „Finde den perfekten Personal Trainer.“, „Kein Chaos, keine falschen Versprechungen.“, „handverlesene“; Quiz „Radikale Transparenz“. Konkrete, belegte Aussagen („manuell geprüft“, „Lizenz und Berufshaftpflicht“) stehen kaum im Vordergrund.
- Englische Begriffe in der deutschen UI: „Expert Hub“, „Client Hub“ (`trainer/list`), „Kunden-Portal“ – drei Namen für Bereiche; Kalender-/Planer-Fachbegriffe („Template“, „Push/Pull/Leg Day“) sind Domänenvokabular.
- Emoji als Icons: `🥗 Ernährungsplan`, `🏋️ Krafttrainings-Plan` (Client-Dashboard), `📄 Dokument ansehen` (`DocumentUploadCard`). Textsymbole `✓`/`↗` in Status- und Linktexten.

### 2.6 Bewegung und Interaktion (Ist)

- Keine dekorativen Animationen gefunden. Vorhanden: `animate-pulse` (Skeletons), `animate-spin` (Ladering), `transition` auf Hover/Fokus, `scale-105` für den gewählten Kalendertag, Glow-Schatten `shadow-lg shadow-emerald-500/20` auf Primär-CTAs.
- `prefers-reduced-motion` wird nicht berücksichtigt (`motion-reduce:` nicht im Bestand).
- Interaktive Zustände: Hover und Disabled (`disabled:opacity-60`) fast durchgängig; **sichtbare Tastaturfokus-Zustände fehlen** (Eingabefelder `focus:outline-none` mit Randfarbwechsel, Buttons ohne `focus-visible`).

### 2.7 Barrierefreiheit (Ist, Befunde)

- `<label>` ohne `htmlFor`/`id` in Login-, Registrier-, Passwort-, Admin-Formularen (Beschriftung nicht programmatisch verknüpft); in der Registrierung `noValidate` mit eigener Validierung (gut), Fehler ohne `aria-describedby`.
- Dialoge (`ModalShell`, Buchungsdialog) ohne `role="dialog"`, `aria-modal`, Fokusführung und Escape-Schließen.
- Meldungen (`FeedbackBox`, Fehlerboxen) ohne `role="alert"`/`aria-live`.
- **Drag & Drop als einziger Weg**, Templates auf Kalendertage zu legen (`PlannerCalendar` hat nur `onDrop`): nicht per Tastatur oder Touch bedienbar.
- Positiv: `lang="de"`, `aria-label` an Schließen-Buttons, `role="img"` am Diagramm, Status wird meist zusätzlich als Text ausgegeben.

**Kontrast (berechnet, Näherung, Tailwind-v4-Palette):**

| Kombination | Verhältnis | Bewertung für Fließtext (4,5:1) |
|---|---|---|
| `slate-300` auf `slate-900` | 12,0 : 1 | ok |
| `slate-400` auf `slate-950` / `slate-900` | 7,7 / 6,8 : 1 | ok |
| `slate-500` auf `slate-950` / `slate-900` | 4,2 / 3,7 : 1 | knapp bzw. nicht ok |
| `slate-600` auf `slate-950` (Footer-/Copyrighttext) | 2,7 : 1 | **nicht ok** |
| `emerald-400` auf `slate-950` / `slate-900` | 10,4 / 9,2 : 1 | ok |
| `slate-950` auf `emerald-500` / `-600` (Primärbutton, Hover) | 8,2 / 5,5 : 1 | ok |
| `white` auf `emerald-600` | 3,7 : 1 | nicht ok für kleinen Text |
| `red-400` auf `slate-950` | 7,0 : 1 | ok |
| Rahmen `slate-800` auf `slate-950` (Eingabefelder) | 1,4 : 1 | unter 3:1 für Bedienelement-Grenzen |

### 2.8 Generische KI-Muster: tatsächlicher Befund

| Muster | Befund im Bestand |
|---|---|
| Lila-blaue Verläufe | **Nicht gefunden** (kein `bg-gradient`). `indigo` nur als Badge/Auswahlfarbe (s. o.). |
| Bento-Raster | **Nicht gefunden.** Stattdessen gleichförmige Kartenstapel und 2-Spalten-Raster identischer Karten (`TrendChart` ×7, Angebote, Quiz-Treffer). |
| Überall gleiche Rundung/Schatten/Padding | **Gefunden:** `rounded-2xl/3xl p-6–8 shadow` für fast alle Inhaltsblöcke, auch verschachtelt (§2.3). |
| Generische Hero-/Marketingtexte | **Teilweise:** Startseite und Quiz-Eyebrow (§2.5). |
| Eyebrow-Pille (`rounded-full`, getönt, `uppercase tracking-wider`) | **Gefunden** auf Startseite, 404, Quiz, Fehlerseite – als wiederkehrendes Muster ohne Informationsgehalt. |
| Standardtypografie | **Gefunden:** Geist als Projektvorgabe, nicht als dokumentierte Entscheidung; Geist Mono ungenutzt. |
| Emoji-Icons | **Gefunden** (§2.5). |
| Glasmorphismus/Glow | **Teilweise:** `backdrop-blur` auf einfarbigem Dunkelgrund (Trainer-Header, `SectionCard`, mobile Navigation), Glow-Schatten auf CTAs. |
| Einseitig farbige Kartenränder | Nicht gefunden. |
| Dekorative Animationen / Scroll-Animationen | Nicht gefunden. |
| Stockfotos/KI-Illustrationen | Nicht gefunden (Avatare nur Nutzer-Uploads oder Initial-Buchstabe). |
| Aufgeblähter Whitespace | Nicht belegt; Client-Dashboard mit `p-8` und `space-y-8` allerdings sehr luftig (visuell zu prüfen). |

**Zu bewahren (konsistent und tragfähig):** dunkle Slate-Basis mit Emerald-Akzent, der Primärbutton, deutsche Fehler-/Erfolgsboxen, `FormFieldError`, Skeletons passend zur Seitenstruktur (`loading.tsx`), `TrendChart` (zweckgebunden, zugänglich benannt), Statustexte neben Farben, `?next=`-Rücksprung, die gemeinsame Fachgebiets-Taxonomie.

## 3. Semantische Farbrollen und Tokens

Diese Rollen sind als CSS-Variablen und Tailwind-`@theme`-Tokens implementiert. Neue und angefasste UI baut darauf auf. Die Bestandsaufnahme §2.1 beschreibt den früheren Snapshot; für konkrete Werte gilt immer `src/app/globals.css`.

| Rolle | Bedeutung | frühere Referenzklasse |
|---|---|---|
| Fläche Seite / angehoben | Hintergrund / Gruppe | `slate-950` / `slate-900` |
| Linie | Trennung, Rand | `slate-800` (Eingabefelder: stärker, §6) |
| Text primär / sekundär | Inhalt / Beschriftung | `white`, `slate-100` / `slate-300`, `slate-400` |
| Text gedämpft | nur nicht-wesentliche Hinweise ≥ 12 px | `slate-500` nur auf `slate-950`; nie `slate-600` für Text |
| Akzent | Hauptaktion, **verifiziert/bestätigt/bezahlt** | `emerald-500/400` |
| Info | „Wartet auf Zahlung“, „angenommen“ | `blue-400` auf `blue-500/10` |
| Warnung | „Anfrage ausstehend“, ablaufende Frist, Prüfung offen | `amber-400` (statt `yellow`) |
| Gefahr | Fehler, Ablehnung, Löschen | `red-400` |
| Neutral/inaktiv | storniert, abgelaufen | `slate-400` auf `slate-800` |

Regeln: Eine Farbe trägt in der gesamten App **eine** Bedeutung. Status wird immer zusätzlich als Text (und bei Bedarf Icon) ausgegeben. **Kein** Violett/Indigo als Standardfarbe. Verläufe nur mit nachvollziehbarem Zweck (z. B. Fläche eines Diagramms), nie als Hero- oder Textdekoration.

## 4. Typografie und Leserythmus

- Nutze vorerst die vorhandene Geist Sans. Ein hochwertiger Auftritt entsteht zunächst durch Typohierarchie, Zeilenlänge, Größen, Zeilenhöhe und Gewichtung – nicht durch einen spontanen Schriftwechsel. Eine andere Schrift bleibt eine gesonderte Entscheidung und muss zugleich Ladeverhalten, Umlaute, Ziffern und Markencharakter berücksichtigen.
- Rollen: klare, sichtbare Größensprünge bei Seitenüberschrift, Abschnitt, Fließtext und Metadaten. Überschriften meist `font-semibold`/`font-bold`; `font-black` vor allem der Wortmarke und wenigen bewusst gewählten Akzenten vorbehalten. Fließtext `text-sm`/`text-base`, Zeilenlänge etwa 55–75 Zeichen, Zeilenhöhe ≥ 1,5. Labels stehen über Formularfeldern. `uppercase tracking-wider` nur für kurze, inhaltlich sinnvolle Kategorie-Labels – nicht als Standarddekoration.
- **Zahlen** (Preise, Zeiten, Messwerte, Statistik): `tabular-nums` einsetzen, damit Spalten bündig sind; Einheit klar abgesetzt (z. B. „78,5 kg“). Dezimalkomma und `€` nachgestellt (Bestandsmuster `formatPrice`).
- Mindestgrößen: informative Texte ≥ 12 px (`text-xs`). `text-[9px]`/`[10px]`/`[11px]` nur für nicht-wesentliche Metadaten; Kalender-Zellen und Tabellenköpfe darauf nicht stützen.
- Gewicht sparsam: `font-black` nur für die Wortmarke; Überschriften nicht pauschal `extrabold`.
- Geist Mono nur laden, wenn es verwendet wird (Entscheidung nötig, sonst Ladeaufwand für Ungenutztes).

## 5. Layout, Seitenkomposition und Darstellungsmittel

| Inhalt | Darstellung | Begründung |
|---|---|---|
| Vergleichbare Datensätze (Buchungen, Anfragen, Kundenliste, Admin-Trainerliste) | **Liste/Tabelle** mit ausgerichteten Spalten, Status als Text-Badge | Scannen und Vergleichen; mobil als gestapelte Zeilen |
| Einzelner Entitätsüberblick (Trainerprofil, Trefferkarte im Quiz) | **Karte oder Abschnitt** mit klarer Hierarchie: Name+Verifizierung → Fachgebiete → Preis/Termine → Aktion | Trainer sind Auswahlobjekte, hier ist eine Karte berechtigt |
| Eingaben (Profil, Körperdaten, Tracking) | **Formular** in einem Abschnitt, Label oberhalb, Gruppen mit Überschrift und Linie | Keine Karte pro Feldgruppe |
| Zusammengehörige Einstellungen | Abschnitt mit Überschrift und Trennlinie | Seitenstruktur statt Boxen |
| Zeitverläufe | `TrendChart` mit Wertebereich und Zusammenfassung (letzter Wert, Ø, Delta) | Bestandskomponente |
| Gefährliche Aktionen (Konto löschen, Storno) | **Eigener, abgesetzter Bereich** mit Folgentext und Bestätigung | Ruhig, eindeutig, nicht verspielt |
| Rechtstexte | Fließtextseite, schmale Spalte | Lesbarkeit |

Regeln: Maximal **zwei** sichtbare Containerebenen (Seite → Abschnitt/Karte). Tiefere Gliederung per Überschrift, Linie, Spalten oder Abstand, nicht per weiterer Karte. Nicht jede Seite braucht einen Hero; Funktionsseiten (Dashboards, Admin) beginnen mit der Aufgabe. Öffentliche Seiten müssen bewusst komponiert sein und dürfen nicht alle derselben Vorlage folgen. Variation ist erwünscht, sofern sie aus Inhalt und Nutzeraufgabe entsteht. Vermeide sowohl starre Einheitsraster als auch willkürliche Asymmetrie.

**Prüffrage gegen generischen KI-Look:** Wenn Logo und Texte entfernt würden, sähe der Aufbau dann noch wie ein beliebiges SaaS-Template aus? Wenn ja, verbessere Hierarchie, Proportionen und Inhaltskomposition, statt weitere Dekoration hinzuzufügen.

## 6. Bausteine und Zustände (Regeln)

**Buttons:** Primär (`primaryButtonClass`-Muster), Sekundär, Gefahr (`bg-red-500 text-white` für endgültige Löschung, wie `DeleteAccountCard`). Pro Ansicht genau eine Primäraktion. Jeder Button hat Hover-, **sichtbaren Fokus**-, Disabled- und Lade-Zustand (Text „Speichere…“, Bestandsmuster). Neue Buttons verwenden die Bestandsklassen, keine neuen Varianten.

**Formulare:** `<label htmlFor>` + `id`; Fehler am Feld (`FormFieldError`, `aria-describedby`), Zusammenfassung oben bei Serverfehlern; Pflichtfelder markiert; `autoComplete` setzen (im Bestand teils vorhanden). Eingabefeld-Rand mit ausreichendem Kontrast (Empfehlung: mindestens `slate-600`, Entscheidung nötig, da Optik).

**Dialoge:** `role="dialog"`, `aria-modal`, `aria-labelledby`, Fokus hinein/zurück, Escape. Bestandskomponente `ModalShell` entsprechend erweitern (Empfehlung) und für den Buchungsdialog wiederverwenden.

**Meldungen:** Fehler/Erfolg/Hinweis mit den Rollen aus §3; dynamisch erscheinende Meldungen `role="alert"` (Fehler) bzw. `aria-live="polite"`. Erfolg nur anzeigen, wenn die Aktion serverseitig erfolgreich war.

**Navigation:** Eine Navigationsebene pro Bereich. `AppShell` ist die Navigation für angemeldete Kunden/Trainer; Seitenheader auf Dashboards sollten nicht dieselben Elemente wiederholen (Empfehlung). Aktiver Zustand und `aria-current="page"` für die aktuelle Seite. Mobile untere Leiste: höchstens fünf Einträge.

**Leere Zustände:** Satz + nächster Schritt (z. B. „Noch keine Anfragen oder Termine.“ → Hinweis, was Trainer tun müssen). **Ladezustände:** Skeleton passend zur Seitenstruktur oder deutscher Text („Lade Dashboard…“); kein Spinner ohne Text. **Fehlerzustände:** verständlicher deutscher Text ohne interne Details, mit „Erneut versuchen“, wo sinnvoll.

**Status-Badges (Buchung), einheitliche Wörter und Farben:**

| Status | Text für Kunden | Text für Trainer | Rolle |
|---|---|---|---|
| `pending` | Anfrage ausstehend | Neue Anfrage | Warnung |
| `accepted` (bezahlt) | Zahlung ausstehend | Wartet auf Zahlung | Info |
| `confirmed` | Verbindlich bestätigt | Bestätigt / Bezahlt | Akzent |
| `declined` | Abgelehnt | – | Gefahr |
| `cancelled` | Storniert | – | Neutral |
| `expired` | Zahlungsfrist abgelaufen | – | Neutral |

## 7. Responsive Nutzung

- Ist: Standard-Breakpoints; `AppShell`-Seitenleiste ab `md`, mobile untere Leiste mit Seitenabstand `pb-20`; Raster `grid-cols-1 md:grid-cols-2/3`. Kalender nutzen `grid-cols-7` mit sehr kleiner Schrift; Chat feste Höhe `h-[500px]`. Mobiles Verhalten wurde **nicht getestet**.
- Regeln: mobile First für Formulare und Buchungsfluss (Touch-Ziele ≥ 44 px, Eingabefelder mit passenden `type`/`inputmode`); Tabellen werden mobil zu gestapelten Zeilen; Kalender mobil mit größeren Zellen oder Listenansicht; getestete Breiten mindestens 360, 768, 1280 px. Keine neuen globalen Breakpoints ohne Bedarf.

## 8. Sprache und Terminologie

- Deutsch, Anrede „du“, aktive, konkrete Sätze. Fehlertexte nennen Ursache und nächsten Schritt, ohne Interna.
- **Konkret statt Claim.** Statt „Exzellenz“, „perfekt“, „handverlesen“, „radikal“: sagen, was passiert („Jeder Trainer wird von uns manuell geprüft: Trainerlizenz und Berufshaftpflicht.“). Nur Aussagen verwenden, die der Produktstand belegt: Ausweisprüfung, Prüfdatum und Ablaufüberwachung existieren **noch nicht** und dürfen nicht beworben werden. Keine erfundenen Zahlen, Bewertungen oder Testimonials.
- Einheitliche Begriffe: **Kunde**, **Trainer**, **Buchungsanfrage/Buchung**, **Angebot/Paket**, **Termin**, **Freigabe** (Daten), **Verifiziert**. Bereichsnamen („Expert Hub“, „Client Hub“, „Kunden-Portal“) vereinheitlichen (Entscheidung nötig). Englische Begriffe nur, wenn Domänenvokabular (z. B. „Template“ prüfen: „Vorlage“).
- Rechtstexte: nicht von Agenten formuliert (`AGENTS.md` §7).

## 9. Barrierefreiheit (Mindestregeln, Ziel offen)

Zielniveau (z. B. WCAG 2.2 AA) ist **offen** (`docs/PRD.md` §9). Bis dahin gilt:

- Text-Kontrast ≥ 4,5 : 1 (§2.7-Tabelle), Bedienelement-Grenzen und Fokusindikator ≥ 3 : 1.
- Jedes interaktive Element per Tastatur erreichbar mit sichtbarem Fokus (`focus-visible:ring-2` o. ä., nicht nur `outline-none` + Randfarbe).
- Formularlabels verknüpft; Fehlertexte per `aria-describedby`; Dialoge und Live-Meldungen wie §6.
- Keine Funktion nur per Drag & Drop: für Planer-Zuweisung eine Alternative (Datum wählen + „Zuweisen“) ergänzen.
- Icon-only-Buttons mit `aria-label`; Bilder mit sinnvollem `alt`; Diagramme mit Textalternative (Bestand: `aria-label`).
- Bewegung: `motion-reduce:` für `animate-pulse`/`animate-spin`/Transformationen.

## 10. Bewegung und Interaktion

Erlaubt: Zustandsübergänge (`transition-colors`, ≤ 150 ms), Skeleton-Puls und Ladeanzeige als Funktionsfeedback, Hover-/Fokus-/Aktiv-Feedback, Rückmeldung beim Ziehen im Planer. Nicht erlaubt: pauschale Fade-in-/Scroll-Animationen, animierte Hintergründe, Parallax, Spezialcursor, Glow-Effekte ohne Bedeutung. Jede Animation muss einen Zustand erklären oder Aufmerksamkeit gezielt lenken und mit `prefers-reduced-motion` abschaltbar sein.

## 11. Prüfkriterien für neue Seiten und Komponenten

Bevor ein UI-PR fertig ist, beantworte jede Frage mit Ja (sonst begründen):

1. Verwendet die Seite vorhandene Komponenten/Klassen (`ui.tsx`, `FormError`, `Skeleton`) statt neuer Stilvarianten?
2. Hat jede Fläche einen funktionalen Grund, und gibt es höchstens zwei Containerebenen (§5)?
3. Unterscheiden sich Rundung, Schatten und Abstand nach Funktion (Seitenabschnitt ≠ Eingabefeld ≠ Badge), statt überall gleich?
4. Trägt jede Farbe eine feste Bedeutung (§3), ohne neue Violett-/Verlaufsdekoration?
5. Sind Überschriften und Texte konkret und belegbar (§8), ohne leere Claims und ohne Eyebrow-Pille ohne Inhalt?
6. Sind Icons `lucide-react` (keine Emojis), Zahlen `tabular-nums`, informative Texte ≥ 12 px?
7. Gibt es Lade-, Leer-, Fehler- und Erfolgszustand sowie Hover/Fokus/Disabled?
8. Tastatur, Fokus, Labels, `aria-live`, Kontrast erfüllt (§9)?
9. Mobil (360 px) und Desktop geprüft, Ergebnis berichtet (nicht behauptet)?
10. Keine unnötigen Effekte (Blur, Glow, Animation) und `motion-reduce` bedacht?
11. **Gegenprobe:** Wirkt die Lösung nicht nur wegen eines KI-Klischees „anders“ (Überkorrektur: Parallax, zufällige Asymmetrie, viele Schriften/Farben, komplexe Komponenten)?

## 12. Entscheidungen, die weiterhin Zustimmung brauchen

Der Auftrag, VeriFit hochwertiger, moderner und eigenständiger zu gestalten, ist erteilt. Die in §§1, 3–11 beschriebenen UI-Verbesserungen sind damit innerhalb der bestehenden Produktlogik freigegeben und müssen nicht für jede einzelne Seite erneut genehmigt werden.

Weiterhin gesonderte Zustimmung benötigen:

- vollständiger Markenwechsel, Austausch der Slate-/Emerald-Grundidentität oder Einführung eines Light-Themes;
- Wechsel der Schriftfamilie oder zusätzliche Schriftdateien, insbesondere wenn dadurch Build-/Netzwerkverhalten verändert wird;
- neue Abhängigkeiten, neue Bildquellen oder kostenpflichtige Assets;
- Änderung der fachlichen Bedeutung von Statusfarben oder Statusbezeichnungen;
- grundlegende Produkt-/Navigationsentscheidungen, die Nutzerwege oder Funktionsumfang verändern;
- jede Änderung an Geschäftsregeln, Buchungs-/Zahlungslogik, Authentifizierung, Rollen, Datenzugriffen, Datenmodell oder externen Diensten.

**Ohne weitere Rückfrage innerhalb dieses Redesign-Auftrags zulässig:** semantische UI-Tokens schrittweise einführen; wiederkehrende UI-Stile vereinheitlichen; visuelle Hierarchie und Seitenkomposition verbessern; unnötige Kartenverschachtelung reduzieren; vorhandene Emojis durch `lucide-react` ersetzen; bedeutungslose Eyebrow-Pillen und dekorative Glow-/Blur-Effekte entfernen; die öffentliche Startseite, Trainerliste, Trefferansicht und Trainerprofile eigenständiger gestalten; vorhandene Barrierefreiheitsprobleme beheben. Dabei müssen belegte Inhalte, bestehende Funktionen und die Qualitätsanforderungen dieses Dokuments erhalten bleiben.

## 13. Empfohlene Umsetzungsreihenfolge

Die grundlegenden Fokus-, Formular- und Dialogverbesserungen wurden laut aktuellem Arbeitsbericht teilweise bereits umgesetzt. Vor einer Wiederholung den Code prüfen.

1. **Zielsystem im gemeinsamen UI verankern:** vorhandene semantische Tokens bzw. Stilbausteine prüfen und schrittweise vervollständigen; Statusfarben, Typografie, Linien, Flächen und Fokus konsistent halten.
2. **Öffentliche Markengestaltung:** Startseite, Trainerliste, Quiz-Ergebnisse und Trainerprofile mit einer klaren „Editorial Performance“-Hierarchie gestalten. Das ist der nächste sichtbare Schwerpunkt – nicht nur weitere kleine Detailkorrekturen.
3. **Arbeitsbereiche konsolidieren:** Kunden-/Trainer-Dashboards, Planer, Kalender und Chat nach Informationshierarchie und Arbeitsaufgaben strukturieren; Verschachtelung und doppelte Navigation weiter reduzieren, ohne Funktionen zu entfernen.
4. **Gemeinsame Komponenten abschließen:** Footer, Buttons, Formulare, Status, Skeletons, Feedback und Dialoge konsistent nutzen, soweit dies ohne riskante Refaktorierung möglich ist.
5. **Gesamte UI prüfen:** die relevanten Seiten bei 360, 768 und 1280 px visuell prüfen; Tastaturfokus, Labels, Kontrast und `prefers-reduced-motion` testen; Ergebnisse nur dann als geprüft melden, wenn die Prüfung tatsächlich durchgeführt wurde.

Arbeite in kleinen, überprüfbaren Änderungsblöcken. Der ästhetische Anspruch darf deutlich sein; technische und geschäftliche Änderungen bleiben ausdrücklich außerhalb dieses Designauftrags.
