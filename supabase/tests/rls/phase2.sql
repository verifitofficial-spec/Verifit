-- VeriFit Phase 2 RLS test harness.
-- Run against the STAGING project with the Supabase SQL editor or psql.
-- Replace the UUID placeholders with staging fixtures. This script performs
-- read-only checks in a transaction and rolls back at the end.

begin;

-- S1: the trigger source must whitelist roles; admin must not be accepted from
-- raw signup metadata. Review the function body as part of the test output.
select pg_get_functiondef('public.handle_new_user()'::regprocedure) as handle_new_user_definition;

-- S2/S3: the public surface must be the whitelist view, not the base table.
select to_regclass('public.trainers_public') as public_trainer_view;
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'trainers_public'
order by ordinal_position;

-- Anonymous users can see approved public profiles, but cannot read the base
-- trainer table or mutate trainer/booking data.
set local role anon;
select count(*) as public_trainer_rows from public.trainers_public;
select count(*) as anon_base_trainer_rows from public.trainers;
select count(*) as anon_booking_rows from public.bookings;

-- Authenticated fixtures. The UUIDs are deliberately explicit so this file
-- never depends on a real account or secret.
set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select count(*) as client_a_own_clients from public.clients;
select count(*) as client_a_visible_bookings from public.bookings;
select count(*) as client_a_tracking_rows from public.client_trackings;
select count(*) as client_a_visible_messages from public.messages;

-- A trainer must only receive confirmed bookings and must not receive all
-- client rows. The query is expected to return zero for these placeholder IDs.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select count(*) as trainer_b_visible_clients from public.clients;
select count(*) as trainer_b_bookings from public.bookings;

-- Storage policy smoke checks: policy definitions must be present and the
-- legacy bucket-wide trainer policies must be absent.
select policyname, cmd
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

rollback;

-- Acceptance matrix (execute with real staging fixture IDs):
-- | Actor    | trainers_public | trainers base | own client | other client | own booking | other booking | messages without confirmed booking |
-- | anon     | approved only   | denied        | denied     | denied       | denied      | denied        | denied                             |
-- | client A | approved only   | denied        | read/write | denied       | own read    | denied        | denied                             |
-- | trainer A| approved only   | own/admin     | booking DTO | denied      | own read    | denied        | denied                             |
-- | admin    | approved only   | all           | all        | all          | all         | all           | policy governed                    |
