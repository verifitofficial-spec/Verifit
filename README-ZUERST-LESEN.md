# VeriFit – Final-Release-Update

Alle Dateien liegen im ZIP unter exakt den Pfaden deines Projekts. Entpacke den Ordnerinhalt in dein Projekt und überschreibe vorhandene Dateien.

## Reihenfolge

1. **SQL-Migration** `supabase/migrations/20261005120000_final_release_tracking_and_account_deletion.sql` im Supabase SQL Editor (Staging) ausführen.
2. **Dateien kopieren** (ZIP in den Projektordner entpacken).
3. **Trainer-Dashboard patchen**: `PATCH-trainer-dashboard.md` (5 kleine Ersetzungen).
4. `npm run lint` und `npm run build` ausführen. Ich konnte das hier nicht ausführen (kein Zugriff auf dein Projekt und `node_modules`); bitte Fehler, falls vorhanden, schicken.
5. **Supabase**: Authentication → URL Configuration → bei „Redirect URLs" ergänzen: `https://DEINE-DOMAIN/**` (inkl. Preview-URL). Sonst landen E-Mail-Bestätigung und Passwort-Reset auf der Startseite statt auf Login bzw. Reset-Seite.
6. **Vercel**: `NEXT_PUBLIC_APP_URL` auf die echte URL setzen (ohne Slash am Ende).

## Was geändert wurde

| Wunsch | Umsetzung |
|---|---|
| Seitenleiste mit Dashboard, Quiz usw. | `AppShell` (global in `layout.tsx`), erscheint für angemeldete Kunden und Trainer. Menüpunkte in `AppShell.tsx` → `getNavItems` ergänzen. Auf Mobilgeräten Leiste unten. |
| Quiz für angemeldete Nutzer | Über die Seitenleiste erreichbar; Quiz-Button führt angemeldete Nutzer zum Dashboard statt zur Startseite. |
| Buchen ohne Login → danach zurück auf dieselbe Seite | `?next=`-Parameter durch Login/Registrierung, Terminauswahl wird gemerkt und nach dem Login wiederhergestellt. E-Mail-Bestätigungslink führt ebenfalls zurück. |
| Gleiche Kategorien bei Trainer und Quiz | `src/lib/constants.ts` ist die einzige Quelle. Das Trainer-Dashboard zeigt die Quiz-Kategorien. Alte Bezeichnungen (z. B. „Rehabilitation", „Transformation") werden automatisch zugeordnet. |
| Stripe-Testkonto | Fehler werden jetzt angezeigt (Stripe-Meldung), Konto-Status wird direkt bei Stripe abgeglichen (kein Webhook nötig), alte Konten werden erkannt. |
| Bezahlmöglichkeit für Kunden | Auffälliger Hinweis „Zahlung erforderlich" oben im Dashboard, automatische Aktualisierung alle 20 s, Erfolgsseite bestätigt die Zahlung selbst (Fallback zum Webhook). |
| Tracking-Graphen | Liniendiagramme je Kennzahl (7/30/90 Tage, 1 Jahr), neu: Gesundheit und Motivation. Vorbefüllung nur noch mit Werten von heute. |
| Alles teilen, nicht nur Körperdaten | Eigene Karte „Datenfreigabe" (speichert sofort). Trainer sehen alles unter **Meine Kunden** inkl. Diagrammen. Standard ist jetzt „nicht geteilt" (Opt-in). |
| Konto löschen | Kunde und Trainer: Daten, Dateien und Login werden gelöscht, Buchungsbelege bleiben anonymisiert. |
| Fehlermeldungen Login/Registrierung | Deutsche Texte, Info-Meldungen grün statt rot, Einwilligungen werden erzwungen und gespeichert, doppelte E-Mail wird erkannt, Passwort-vergessen-Flow neu, Passwort mind. 8 Zeichen. |

## Stripe-Test: Voraussetzungen

- Stripe Dashboard im **Testmodus** → **Connect** aktivieren und das Plattformprofil ausfüllen (inkl. Bestätigung zur Haftung bei Verlusten). Fehlt das, antwortet Stripe beim Anlegen des Kontos mit einer Fehlermeldung – die wird dir nun direkt im Trainer-Dashboard angezeigt.
- `STRIPE_SECRET_KEY` (Test, `sk_test_...`) in Vercel setzen.
- Webhook (Endpunkt `/api/webhook`) für `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed` auf „Dein Konto". Er ist nicht mehr zwingend für die Bestätigung, aber empfohlen (Mails, Absicherung).
- Test-Onboarding: Im Stripe-Formular den „Testdaten verwenden"-Link bzw. die Stripe-Testdaten nutzen. Nach der Rückkehr wird der Status automatisch aktualisiert.

## Bewusst offen / bitte prüfen

- **Trainer-Dashboard** wurde gepatcht statt komplett ausgeliefert (1.500 Zeilen, Fehlerrisiko).
- **Impressum** enthält noch Platzhalter und verweist teils auf das TMG; AGB/Datenschutz sind Entwürfe. Bitte Texte vom Anwalt prüfen lassen.
- **Datenbank-Absicherung Kundendaten**: Trainer dürfen per RLS eine Kundenzeile mit Buchung lesen, unabhängig von `share_data`. Die neue Trainer-Seite zeigt Körper- und Trackingdaten nur bei Freigabe (Tracking ist zusätzlich per RLS geschützt). Für harte Absicherung der Körperdaten wäre eine RPC/View nötig (Folgeaufgabe).
- **Konto-Löschung**: Das Stripe-Connect-Konto des Trainers bleibt bei Stripe bestehen. Bezahlte, bevorstehende Termine blockieren die Löschung, bis sie storniert sind.
- **Migration**: Sie entfernt Fremdschlüssel von `bookings.client_id/trainer_id`, damit anonymisierte Belege bestehen bleiben. Zuerst auf Staging testen.
- **Quiz**: Freie Termine werden angezeigt und priorisiert, filtern aber nicht (sonst wäre das Quiz in der Closed Beta oft leer).
- Das Kundenchat-Kontaktladen und `loadClients` im Trainer-Dashboard zeigen weiterhin Kunden mit Buchung (RLS-begrenzt).
- Datenexport (Art. 15 DSGVO) ist noch nicht gebaut.
- `CLAUDE.md` enthält veraltete Hinweise (Skeleton-Regel, `send-email`-Route).
- Roadmap-Phasen aus dem Masterplan (Closed Beta, Public Launch) sind Business-Meilensteine; umgesetzt habe ich die technischen Punkte aus deiner Liste und dem Release-Plan.
