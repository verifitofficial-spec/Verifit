# Tabellen & Spalten (public) – Staging-Export, 03.10.2026

Format: `spalte typ NULL? default`  (NN = NOT NULL)

## appointments (Legacy, im Code ungenutzt)
- id uuid NN gen_random_uuid()
- client_id uuid NN
- trainer_id uuid NN
- start_time timestamptz NN
- end_time timestamptz NN
- status text NN 'confirmed'
- created_at timestamptz NN now() utc

## bookings
- id uuid NN gen_random_uuid()
- slot_id uuid null
- trainer_id uuid NN
- client_id uuid NN
- offer_id uuid null
- offer_title text NN
- offer_type text NN
- duration_minutes integer NN
- price numeric NN 0
- slot_date date NN
- slot_time time NN
- client_name text NN
- client_email text NN
- status text NN 'pending'
- payment_due_at timestamptz null
- responded_at timestamptz null
- paid_at timestamptz null
- stripe_session_id text null
- stripe_payment_intent_id text null
- created_at timestamptz NN now()

## client_trackings
- id uuid NN gen_random_uuid()
- client_id uuid null
- weight numeric null
- calories integer null
- sleep numeric null
- created_at timestamptz NN now() utc
- water numeric null
- mood integer null

## clients
- id uuid NN gen_random_uuid()
- email text NN
- name text null
- created_at timestamptz NN now() utc
- share_data boolean null true
- height numeric null
- age integer null
- gender text null
- goal text null
- activity_level numeric null
- (**fehlt:** weight, wird aber vom Code geschrieben)

## foods
- id uuid NN gen_random_uuid()
- name text NN
- kcal numeric NN
- protein numeric NN
- carbs numeric NN
- fat numeric NN
- created_at timestamptz NN now() utc

## messages
- id uuid NN gen_random_uuid()
- sender_id uuid NN
- receiver_id uuid NN
- content text NN
- created_at timestamptz NN now() utc

## nutrition_plans (Legacy)
- id uuid NN gen_random_uuid()
- client_id uuid null
- day_of_week text NN
- meal_title text NN
- description text null
- calories / protein / carbs / fat integer null
- created_at timestamptz NN now() utc

## profiles
- id uuid NN (= auth.users.id)
- email text NN
- role text NN 'client'
- created_at timestamptz NN now() utc

## trainer_offers
- id uuid NN gen_random_uuid()
- trainer_id uuid NN
- title text NN
- type text NN
- duration_minutes integer NN
- price numeric NN 0
- description text null
- is_active boolean NN true
- created_at timestamptz NN now()

## trainer_slots
- id uuid NN gen_random_uuid()
- trainer_id uuid NN
- slot_date date NN
- slot_time time NN
- is_booked boolean null false (Legacy)
- created_at timestamptz NN now() utc
- title text null 'Discovery-Call / Training' (Legacy)
- status text null 'free'
- client_name text null (Legacy, PII)
- client_email text null (Legacy, PII)
- price numeric null 0 (Legacy)

## trainers
- id uuid NN gen_random_uuid()
- name, email, bio text null
- status text null 'pending'
- document_url text null (Legacy)
- availability_status text null 'available'
- service_mode text null 'Vor Ort & Online'
- city text null
- specialties text null (Komma-String)
- license_number text null
- liability_insurance_expiry date null
- instagram_url, tiktok_url text null
- package_category, package_duration text null; package_price numeric null (Legacy)
- license_document_path, insurance_document_path text null
- avatar_url text null
- hourly_rate numeric null
- qualifications text null
- slug text null (partial unique index)
- stripe_account_id text null (Stripe Connect Testmodus)
- charges_enabled boolean NN false

## workout_plans (Legacy)
- id uuid NN gen_random_uuid()
- client_id uuid null
- day_of_week text NN
- exercise_name text NN
- sets integer null; reps text null; weight numeric null
- created_at timestamptz NN now() utc

## Nicht vorhanden, aber vom Code benötigt
- **client_plans** (Trainer-Dashboard schreibt dorthin, Kunden-Dashboard liest dort)
