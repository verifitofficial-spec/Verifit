# Indizes (public) – Staging-Export

| Tabelle | Index | Definition |
|---|---|---|
| appointments | appointments_pkey | UNIQUE (id) |
| bookings | uq_active_booking_per_slot | UNIQUE (slot_id) WHERE status IN ('pending','accepted','confirmed') |
| bookings | bookings_pkey | UNIQUE (id) |
| bookings | bookings_trainer_id_status_idx | (trainer_id, status) |
| bookings | bookings_client_id_idx | (client_id) |
| client_trackings | client_trackings_pkey | UNIQUE (id) |
| clients | clients_email_key | UNIQUE (email) |
| clients | clients_pkey | UNIQUE (id) |
| foods | foods_pkey | UNIQUE (id) |
| foods | foods_name_key | UNIQUE (name) |
| messages | messages_pkey | UNIQUE (id) |
| nutrition_plans | nutrition_plans_pkey | UNIQUE (id) |
| profiles | profiles_pkey | UNIQUE (id) |
| profiles | profiles_email_key | UNIQUE (email) |
| trainer_offers | trainer_offers_trainer_id_idx | (trainer_id) |
| trainer_offers | trainer_offers_pkey | UNIQUE (id) |
| trainer_slots | trainer_slots_pkey | UNIQUE (id) |
| trainer_slots | uq_trainer_slot_time | UNIQUE (trainer_id, slot_date, slot_time) |
| trainers | trainers_pkey | UNIQUE (id) |
| workout_plans | workout_plans_pkey | UNIQUE (id) |

## Auffälligkeiten
- Die Tabelle `client_plans` taucht nicht auf. Sie existiert im Staging vermutlich nicht, obwohl das Trainer-Dashboard dorthin schreibt.
- Die Tabelle `appointments` existiert, wird im Code aber nicht verwendet (Legacy?).
- Kein Index auf `messages` (sender_id, receiver_id, created_at) und keiner auf `trainer_slots` (trainer_id, status).
- Kein `slug` für Trainer-URLs.

## Realtime-Publication
(noch nicht exportiert, Abfrage `select * from pg_publication_tables where pubname = 'supabase_realtime';` einzeln ausführen und Ergebnis hier ergänzen)