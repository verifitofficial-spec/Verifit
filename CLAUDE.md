# VeriFit — Projektanweisungen

VeriFit ist eine Vermittlungsplattform für verifizierte Personal Trainer (DACH-Region). Next.js App Router, Supabase-Backend, Stripe-Zahlungen, Resend-E-Mails. Alle UI-Texte sind auf Deutsch.

## Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`), kein separates `tailwind.config` nötig
- **Backend:** Supabase (Postgres, Auth, Storage, Realtime) — Client in `src/app/lib/supabase.ts`
- **Zahlungen:** Stripe Checkout Sessions (`src/app/api/checkout/route.ts`) + Webhook (`src/app/api/webhook/route.ts`)
- **E-Mail:** Resend (`src/app/lib/resend.ts`), Transaktions-Mails in `src/app/send-email/route.ts`
- **Icons:** lucide-react

## Design-System

- Hintergrund `bg-slate-950`, Akzent `emerald-500`/`emerald-400`, Karten `bg-slate-900` mit `border-slate-800`
- Runde Ecken durchgehend: `rounded-xl`/`rounded-2xl`/`rounded-3xl`
- Buttons: primär `bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold`, sekundär `bg-slate-800 hover:bg-slate-700 border border-slate-700`
- Layout-Grundgerüst jeder Seite: `<main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">` mit Header, Section, Footer (Copyright-Footer immer identisch)
- Alle Fehlermeldungen/Erfolgsmeldungen als farbige Boxen: rot (`bg-red-500/10 border-red-500/20 text-red-400`) bzw. grün/emerald für Erfolg

## Rollenmodell

Drei Rollen: `client`, `trainer`, `admin` — gespeichert in `profiles.role` (zentrale Rollentabelle, separat von den fachlichen Tabellen `trainers`/`clients`). Jeder Login-Flow prüft nach `signInWithPassword` zusätzlich die Rolle in `profiles` und loggt bei Mismatch sofort wieder aus (`supabase.auth.signOut()`).

**Wichtig:** Die aktuelle Rollen- und Zugriffsprüfung läuft überwiegend clientseitig (kein Enforcement in `proxy.ts`/Middleware). Für Details und bekannte Schwachstellen: @docs/auth-flow.md

## Datenbank

Kern-Tabellen: `profiles`, `trainers`, `clients`, `trainer_slots`, `client_plans`, `foods`, `messages`, `client_trackings`, `nutrition_plans`, `workout_plans`. Für vollständiges Schema, Beziehungen und Konventionen (z.B. `client_plans.content` als JSON-Blob): @docs/database-schema.md

## Zahlungen & Buchungsablauf

Checkout läuft über Stripe Checkout Sessions mit `slotId` in den Metadaten; der Webhook markiert den Slot nach `checkout.session.completed` als `booked` und verschickt eine Bestätigungsmail. Es gibt daneben einen unbezahlten Anfrage-Flow (`status: 'pending'`) für Discovery Calls. Details, Statuswerte und Edge Cases: @docs/payment-flow.md

## Konventionen für neue Features

- Neue Client-Komponenten mit `'use client'` und eigenem `useState`/`useEffect`-Datenladen (kein globaler State-Manager im Projekt)
- Supabase-Queries direkt in der Komponente, kein Repository-Pattern — bei neuen Features an bestehendem Muster orientieren (siehe `src/app/trainer/list/page.tsx` als Referenz für Lade-/Fehler-/Leerzustände)
- Ladezustand immer als deutscher Text (z.B. „Lade verifizierte Trainer...“), keine Skeleton-Loader
- `any`-Typen sind im Bestandscode verbreitet (v.a. bei Supabase-Query-Ergebnissen) — bei neuem Code nach Möglichkeit konkrete Interfaces verwenden, aber bestehende Patterns nicht ohne Auftrag umfassend refactoren
