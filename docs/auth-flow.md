# Auth-Flow & Rollenmodell

## Grundprinzip

Supabase Auth (`supabase.auth.signInWithPassword` / `signUp`) verwaltet Login/Registrierung. Die **fachliche Rolle** (`client`/`trainer`/`admin`) liegt separat in `profiles.role` und wird bei **jedem** Login zusätzlich geprüft:

```
1. signInWithPassword()
2. SELECT role FROM profiles WHERE id = user.id
3. Wenn role !== erwartete Rolle → signOut() + Fehlermeldung
4. Wenn role passt → Redirect zum jeweiligen Dashboard
```

Dieses Muster ist identisch implementiert in:
- `src/app/client/login/page.tsx` (erwartet `role === 'client'`)
- `src/app/trainer/login/page.tsx` (erwartet `role === 'trainer'`, lädt danach zusätzlich die `trainers.id` per E-Mail-Lookup für den Redirect)
- `src/app/admin/login/page.tsx` (erwartet `role === 'admin'`)

**Bei neuen Login-/Registrierungs-Flows: dieses Muster konsistent weiterverwenden.**

## Registrierung

`signUp()` erhält die Rolle über `options.data.role` — vermutlich greift ein serverseitiger DB-Trigger darauf zu, um automatisch einen `profiles`-Eintrag zu erzeugen (Trigger selbst nicht im Repo). Direkt danach wird ein passender Eintrag in `trainers` bzw. `clients` per Insert angelegt (mit `id = user.id`).

## Bekannte Schwachstellen / offene Punkte

Diese Punkte sollten bei sicherheitsrelevanten Änderungen berücksichtigt und nicht stillschweigend als „bereits sicher" angenommen werden:

1. **Keine serverseitige Rollenprüfung.** `src/proxy.ts` (Next.js Middleware-Äquivalent) lässt `/admin`-Routen explizit durch, mit dem Kommentar: *„Authentifizierung und Rollenprüfung erfolgt direkt clientseitig in der Admin-Page über die Supabase-Session."* Das bedeutet: Ohne aktive RLS-Policies auf Datenbankebene wäre die `/admin`-Route rein clientseitig geschützt und potenziell umgehbar (z.B. durch direkte API-Calls gegen Supabase). RLS-Policies selbst sind nicht im Repo einsehbar — das ist eine Annahme, keine verifizierte Absicherung.
2. **Race Condition beim Signup:** Zwischen `signUp()` und dem Insert in `trainers`/`clients` gibt es keine Transaktion. Schlägt der zweite Insert fehl, existiert ein Auth-User ohne fachliches Profil.
3. **E-Mail-basierte Lookups statt ID-basierte:** Der Trainer-Login sucht die `trainers.id` über `eq('email', user.email)` statt direkt über die Auth-ID. Funktioniert nur, wenn E-Mails in `trainers` exakt mit der Auth-E-Mail übereinstimmen und eindeutig sind.
4. **Client-Dashboard „Heilungs-Logik":** `client/login/page.tsx` löscht bei fehlendem `clients`-Eintrag zuerst per E-Mail (`delete().eq('email', ...)`) und legt dann neu an — das kann bei parallelen Logins oder E-Mail-Kollisionen zu Datenverlust führen.
5. **`trainer/[id]/dashboard`** lädt Kundenliste über eine Tabelle `users` (`loadClients()`), die an keiner anderen Stelle im Code vorkommt — vermutlich ein Rest aus einer früheren Iteration oder ein Bug. Vor Erweiterungen dieses Bereichs klären, ob `users` oder `clients` die korrekte Quelle ist.

## Admin-Zugang

Login unter `/admin/login`, danach `/admin` (Verifizierungs-Dashboard: Trainer freigeben/ablehnen, PDF-Dokumente über Signed URLs einsehen). Gleiche Rollenprüfungs-Logik wie oben, zusätzlich `router.refresh()` nach erfolgreichem Login, um die Server-Session zu synchronisieren.
