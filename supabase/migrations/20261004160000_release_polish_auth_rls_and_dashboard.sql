-- VeriFit release-polish: Auth-, RLS- und Dashboard-Fixes.
-- Staging-only. Additive/idempotent; keine Daten werden gelöscht.
-- Rollback-Hinweis: Vor dem Zurücksetzen Policies/Funktionen exportieren und die
-- ergänzte clients.weight-Spalte samt Datenmigration separat bewerten.

-- Der Client-Dashboard-Code synchronisiert das aktuelle Gewicht in clients.
-- Die Spalte fehlte im dokumentierten Staging-Schema.
alter table public.clients add column if not exists weight numeric;

-- Signup ist die einzige Quelle für fachliche Profile. Die Trigger-Funktion wird
-- nicht als öffentliche RPC angeboten; sie bleibt nur für den Auth-Trigger nutzbar.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- is_admin wird in RLS-Ausdrücken benötigt, aber nicht anonym aufrufbar gemacht.
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Trigger-Helfer dürfen nicht direkt über PostgREST aufgerufen werden.
revoke execute on function public.prevent_profile_role_changes() from public, anon, authenticated;
revoke execute on function public.prevent_protected_profile_changes() from public, anon, authenticated;

-- Legacy-Tabellen bleiben RLS-geschützt und liefern keine versehentlichen 403-
-- Überraschungen bei bestehenden Integrationen. Die eigentliche Anwendung nutzt
-- client_plans; die Policies erlauben nur Teilnehmerdaten.
drop policy if exists appointments_participant_select on public.appointments;
drop policy if exists appointments_client_insert on public.appointments;
create policy appointments_participant_select on public.appointments
for select to authenticated
using (client_id = auth.uid() or trainer_id = auth.uid() or public.is_admin());
create policy appointments_client_insert on public.appointments
for insert to authenticated
with check (client_id = auth.uid() or public.is_admin());

drop policy if exists legacy_nutrition_plans_client_select on public.nutrition_plans;
drop policy if exists legacy_nutrition_plans_trainer_write on public.nutrition_plans;
create policy legacy_nutrition_plans_client_select on public.nutrition_plans
for select to authenticated
using (client_id = auth.uid() or public.is_admin());
create policy legacy_nutrition_plans_trainer_write on public.nutrition_plans
for all to authenticated
using (public.is_admin() or exists (
  select 1 from public.bookings b
  where b.client_id = nutrition_plans.client_id
    and b.trainer_id = auth.uid()
    and b.status in ('pending', 'accepted', 'confirmed')
))
with check (public.is_admin() or exists (
  select 1 from public.bookings b
  where b.client_id = nutrition_plans.client_id
    and b.trainer_id = auth.uid()
    and b.status in ('pending', 'accepted', 'confirmed')
));

drop policy if exists legacy_workout_plans_client_select on public.workout_plans;
drop policy if exists legacy_workout_plans_trainer_write on public.workout_plans;
create policy legacy_workout_plans_client_select on public.workout_plans
for select to authenticated
using (client_id = auth.uid() or public.is_admin());
create policy legacy_workout_plans_trainer_write on public.workout_plans
for all to authenticated
using (public.is_admin() or exists (
  select 1 from public.bookings b
  where b.client_id = workout_plans.client_id
    and b.trainer_id = auth.uid()
    and b.status in ('pending', 'accepted', 'confirmed')
))
with check (public.is_admin() or exists (
  select 1 from public.bookings b
  where b.client_id = workout_plans.client_id
    and b.trainer_id = auth.uid()
    and b.status in ('pending', 'accepted', 'confirmed')
));

-- Die bisherige ALL-Policy erlaubte jedem authentifizierten oder anonymen Nutzer
-- Trackingdaten aller Kunden zu lesen und zu verändern.
drop policy if exists "Erlaube allen Zugriff auf client_trackings" on public.client_trackings;
drop policy if exists client_trackings_owner_select on public.client_trackings;
drop policy if exists client_trackings_owner_insert on public.client_trackings;
drop policy if exists client_trackings_owner_update on public.client_trackings;
drop policy if exists client_trackings_owner_delete on public.client_trackings;
drop policy if exists client_trackings_trainer_select on public.client_trackings;
create policy client_trackings_owner_select on public.client_trackings
for select to authenticated
using (client_id = auth.uid() or public.is_admin());
create policy client_trackings_owner_insert on public.client_trackings
for insert to authenticated
with check (client_id = auth.uid() or public.is_admin());
create policy client_trackings_owner_update on public.client_trackings
for update to authenticated
using (client_id = auth.uid() or public.is_admin())
with check (client_id = auth.uid() or public.is_admin());
create policy client_trackings_owner_delete on public.client_trackings
for delete to authenticated
using (client_id = auth.uid() or public.is_admin());
create policy client_trackings_trainer_select on public.client_trackings
for select to authenticated
using (exists (
  select 1
  from public.clients c
  join public.bookings b on b.client_id = c.id
  where c.id = client_trackings.client_id
    and c.share_data is true
    and b.trainer_id = auth.uid()
    and b.status in ('accepted', 'confirmed')
));

-- Die bisherige Nachrichten-Policy enthielt eine tautologische Selbstreferenz
-- (m.sender_id = m.sender_id) und erlaubte damit fremde Chatkontakte.
drop policy if exists messages_participant_insert on public.messages;
create policy messages_participant_insert on public.messages
for insert to authenticated
with check (
  sender_id = auth.uid()
  and (
    public.is_admin()
    or exists (
      select 1 from public.bookings b
      where b.status in ('pending', 'accepted', 'confirmed')
        and ((b.client_id = sender_id and b.trainer_id = receiver_id)
          or (b.client_id = receiver_id and b.trainer_id = sender_id))
    )
  )
);

-- Bei einem bezahlten Angebot bleibt der Slot bis zur Zahlung pending. Erst der
-- Stripe-Webhook setzt ihn auf booked.
create or replace function public.respond_to_booking(p_booking_id uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings%rowtype;
  new_status text;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Buchung nicht gefunden'; end if;
  if b.trainer_id is distinct from auth.uid() then raise exception 'Keine Berechtigung'; end if;
  if b.status <> 'pending' then raise exception 'Anfrage wurde bereits bearbeitet'; end if;

  if p_accept then
    if b.price > 0 then
      new_status := 'accepted';
      update public.bookings
        set status = 'accepted', responded_at = now(), payment_due_at = now() + interval '24 hours'
        where id = b.id;
      update public.trainer_slots set status = 'pending'
        where id = b.slot_id and status = 'pending';
    else
      new_status := 'confirmed';
      update public.bookings set status = 'confirmed', responded_at = now() where id = b.id;
      update public.trainer_slots set status = 'booked'
        where id = b.slot_id and status = 'pending';
    end if;
  else
    new_status := 'declined';
    update public.bookings set status = 'declined', responded_at = now() where id = b.id;
    update public.trainer_slots set status = 'free'
      where id = b.slot_id and status = 'pending';
  end if;
  return new_status;
end;
$$;
revoke execute on function public.respond_to_booking(uuid, boolean) from public, anon;
grant execute on function public.respond_to_booking(uuid, boolean) to authenticated;
