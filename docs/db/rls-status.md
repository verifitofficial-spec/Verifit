# RLS-Status (public)

| Tabelle | RLS aktiv | forced |
|---|---|---|
| appointments | ja | nein |
| bookings | ja | nein |
| client_trackings | ja | nein |
| clients | ja | nein |
| foods | ja | nein |
| messages | ja | nein |
| nutrition_plans | ja | nein |
| profiles | ja | nein |
| trainer_offers | ja | nein |
| trainer_slots | ja | nein |
| trainers | ja | nein |
| workout_plans | ja | nein |

Stand nach Migration `20261004160000_release_polish_auth_rls_and_dashboard`: `appointments`, `nutrition_plans`, `workout_plans` besitzen nun restriktive Teilnehmer-Policies. `client_trackings` erlaubt Owner-CRUD sowie Trainer-Read ausschließlich bei Opt-in und aktiver Buchung.
