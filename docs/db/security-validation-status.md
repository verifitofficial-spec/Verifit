# Status der Sicherheitsvalidierung für Trainer und Angebote

Stand: 12. Oktober 2026

> **Ergänzung vom 17.10.2026:** Eine ausschließlich lesende Diagnose über die
> lokale App-Konfiguration bestätigte für `trainers_public` HTTP 404 / `PGRST205`
> („nicht im Schema-Cache“), während `trainer_offers` lesbar war. Es wurden keine
> Remote-Daten verändert und keine Migration ausgeführt. Dieser Befund belegt nur
> den von der lokalen Konfiguration erreichten Zustand, nicht Produktion. Bis zum
> kontrollierten Staging-Rollout nutzt die App den in `docs/inquiry-flow.md`
> beschriebenen feldgewhitelisteten Server-Fallback.

## Zweck und Geltungsbereich

Dieses Dokument hält den Validierungsstand der lokalen Migration
`supabase/migrations/20261011193000_trainers_offers_least_privilege.sql` fest. Es
ist keine Produktionsfreigabe und ersetzt nicht den ausführlichen Ablauf in
`docs/db/trainers-offers-security-rollout.md`.

Der aktuelle Scope umfasst ausschließlich die öffentliche Traineransicht, direkte
Tabellen- und Spaltenrechte auf `public.trainers` und `public.trainer_offers`, die
zugehörigen RLS-Policies sowie die für diese Grenze benötigten Funktionen und
Trigger-Vorbedingungen.

## Bereits abgeschlossen

- Die Migration und der Rollout-Plan wurden lokal statisch geprüft und gezielt
  überarbeitet.
- Die Vorbedingungen akzeptieren nur die dokumentierte vollständige Ausgangs-
  oder Ziel-Policy-Matrix. Namen, Rollen, Befehle, Permissivität sowie `USING` und
  `WITH CHECK` werden geprüft.
- Für `trainers_public_read_approved` ist die bestätigte Rollenmenge exakt
  `{anon,authenticated}` hinterlegt.
- Die View-Definition, ihr Owner, ihre Sicherheitsoptionen und ihre öffentliche
  Spaltenliste werden vor beziehungsweise nach der Änderung geprüft.
- Die Nachbedingungen prüfen die vollständige vorgesehene Tabellen- und
  Spaltenrecht-Matrix der Browserrollen. Die Migration bleibt von `BEGIN` bis
  `COMMIT` transaktional und verändert keine Nutzdaten.
- Die PostgreSQL-17-Syntax der dynamischen Spalten-`REVOKE`s wurde gegen die
  PostgreSQL-Dokumentation und den PostgreSQL-17-Quellcode geprüft. Dies war eine
  statische Prüfung, kein Datenbanktest.
- Zuletzt erfolgreich ausgeführt: `npm test` (15/15), `npx tsc --noEmit`,
  `npm run build` und `git diff --check`. `npm run lint` meldete keine Fehler und
  zwei bereits bekannte `<img>`-Warnungen.

Es wurde **keine Migration ausgeführt**, keine Verbindung zu Supabase oder einer
anderen Datenbank hergestellt und nichts committed, gepusht oder deployed.

## Verfügbarkeit einer isolierten Testumgebung

Im aktuellen Repository und auf dem verfügbaren lokalen Werkzeugpfad wurde keine
geeignete PostgreSQL-17-/Supabase-Testumgebung gefunden:

- keine lokale `psql`- oder `pg_isready`-Installation,
- keine Docker-Installation im Werkzeugpfad,
- keine Supabase-CLI im Werkzeugpfad,
- keine `supabase/config.toml`- oder Compose-Konfiguration im Repository.

Es wurde nichts installiert, kein Dienst gestartet und keine Konfiguration
verändert. Realistische spätere Optionen sind:

1. eine dedizierte, produktionsähnliche Supabase-Staging- oder Branch-Umgebung,
2. eine vom Betreiber vorbereitete lokale Supabase-CLI-/Docker-Umgebung mit
   PostgreSQL 17 und den benötigten Supabase-Rollen/Schemas,
3. eine kurzlebige isolierte PostgreSQL-17-Testinstanz, sofern Auth-Schema,
   Supabase-Rollen, Funktionen, Trigger und Ausgangs-ACLs reproduzierbar aufgebaut
   werden.

Keine dieser Optionen darf durch einen Test gegen Produktion ersetzt werden.

## Vor einer Datenbankfreigabe noch offen

1. Den tatsächlichen Ausgangszustand der vorgesehenen Staging-Umgebung erneut
   read-only erfassen: PostgreSQL-Version, Objektarten, Owner, Rollenvererbungen,
   vollständige Tabellen-/Spalten-ACLs, Grant Options, Policies und deren
   Ausdrücke, Trigger und sicherheitskritische Funktionen.
2. Die ursprünglichen Policy- und Berechtigungsbefunde mit den harten
   Migrationsvorbedingungen abgleichen. Jede Abweichung muss vor der Ausführung
   erklärt werden; die Migration darf nicht passend zur Produktion „gelockert“
   werden.
3. Zuerst die Abhängigkeit
   `20261011170000_quiz_matching_offer_metadata.sql`, danach die
   Least-Privilege-Migration ausschließlich in der isolierten Testumgebung und
   jeweils vollständig ausführen.
4. Nach dem Commit View, Policies, ACLs, Funktionsrechte, Trigger und den
   PostgREST-Schema-Cache read-only nachprüfen.
5. Abbruch- und Wiederherstellungsverhalten testen. Vor `COMMIT` muss jeder Fehler
   vollständig zurückrollen; nach einem erfolgreichen Commit ist eine geprüfte
   Forward-Fix-Migration der Standardweg. Ein Wiederherstellungsplan muss auf dem
   vorab gesicherten ACL-/Policy-/Objektstand beruhen.

Die reproduzierbare Reihenfolge, Diagnoseabfragen, Nachkontrollen und
Forward-Fix-Grenze stehen in `docs/db/trainers-offers-security-rollout.md`.

## Noch erforderliche Rollen- und Zugriffstests

Nur mit dedizierten Testkonten und Testdaten in der isolierten Umgebung:

- **anon:** sieht nur freigegebene Trainer über `trainers_public` und aktive
  Angebote freigegebener Trainer; kein Zugriff auf sensible Trainerfelder,
  Basistabellen oder Mutationen.
- **Client A und Client B:** sehen nur öffentliche Daten und können weder Trainer-
  noch Angebotsdaten verändern oder Rechte des jeweils anderen Clients nutzen.
- **Trainer A und Trainer B:** können jeweils nur den eigenen Basissatz und die
  ausdrücklich erlaubten Profilfelder ändern; gegenseitiges Lesen/Ändern privater
  Daten muss scheitern.
- **Geschützte Trainerfelder:** direkte Änderungen an Status, E-Mail,
  Stripe-Feldern, Dokumentpfaden und nicht freigegebenen Profilfeldern müssen
  scheitern.
- **Angebote:** eigener Insert, erlaubtes Update und Deaktivierung funktionieren;
  fremde Angebote, Änderung von `trainer_id` und hartes DELETE scheitern.
- **Admin:** vorgesehene Admin-Lese- und Freigaberouten funktionieren, ohne
  sensible Browserrechte vorauszusetzen.
- **service_role:** ausschließlich die vorgesehenen Serverpfade funktionieren;
  der Schlüssel oder privilegierte Client darf nicht im Browser erscheinen.
- **Registrierung:** `client` und `trainer` werden konsistent angelegt;
  manipulierte Metadaten dürfen keine Adminrolle erzeugen.
- **Öffentliche Flows im Migrations-Scope:** Trainerliste, Profil, Quiz und
  Buchungsvorbereitung verwenden die öffentliche View beziehungsweise erlaubte
  Serverpfade und exponieren keine gesperrten Felder.

## Ausdrücklich nicht Teil dieser Migration

- Storage-Buckets und Storage-Policies, insbesondere `avatars`,
  `verification-docs` und mögliche Legacy-Buckets,
- Autorisierung, Kontaktselektion und Nachrichten-RLS des Chats,
- globale Default Privileges im Schema `public`,
- Rate-Limits, CAPTCHA und Missbrauchsschutz,
- weitergehende RLS-/ACL-Härtung anderer Tabellen,
- Stripe-Zahlungslogik, Provisionen und sonstige fachliche Änderungen.

Storage- und Chat-Sicherheit bleiben separate Prüf- und gegebenenfalls
Migrationsaufträge. Ihre offene Validierung blockiert nicht die Designarbeit, muss
aber vor einer umfassenden Sicherheits- oder Produktionsfreigabe separat
abgeschlossen werden.

## Freigabestatus

Die lokale statische Review und die App-Prüfungen sind abgeschlossen. Die
Datenbankfreigabe bleibt offen, bis die Migration in einer geeigneten isolierten
PostgreSQL-17-/Supabase-Umgebung ausgeführt und die vollständige Rollenmatrix
bestanden wurde. Produkt- und Designarbeit kann parallel fortgesetzt werden,
solange daraus keine stillschweigende Produktionsfreigabe oder Änderung dieser
Berechtigungsgrenze abgeleitet wird.
