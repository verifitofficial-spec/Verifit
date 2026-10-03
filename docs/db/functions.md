proname,definition
cancel_booking,"CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare b public.bookings%rowtype;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Buchung nicht gefunden'; end if;
  if b.client_id is distinct from auth.uid() then raise exception 'Keine Berechtigung'; end if;
  if b.status = 'confirmed' and b.price > 0 then
    raise exception 'Bezahlte Termine bitte direkt mit dem Trainer klären';
  end if;
  if b.status not in ('pending', 'accepted', 'confirmed') then
    raise exception 'Diese Buchung kann nicht mehr storniert werden';
  end if;
  update public.bookings set status = 'cancelled' where id = b.id;
  update public.trainer_slots set status = 'free' where id = b.slot_id;
end $function$
"
expire_unpaid_bookings,"CREATE OR REPLACE FUNCTION public.expire_unpaid_bookings()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with expired as (
    update public.bookings set status = 'expired'
    where status = 'accepted' and payment_due_at < now()
    returning slot_id
  )
  update public.trainer_slots set status = 'free' where id in (select slot_id from expired);
$function$
"
handle_new_user,"CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data ->> 'role', 'client') -- Standardmäßig 'client', außer es wird 'trainer' oder 'admin' übergeben
  );
  return new;
end;
$function$
"
is_admin,"CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$function$
"
respond_to_booking,"CREATE OR REPLACE FUNCTION public.respond_to_booking(p_booking_id uuid, p_accept boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare b public.bookings%rowtype; new_status text;
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
    else
      new_status := 'confirmed';
      update public.bookings set status = 'confirmed', responded_at = now() where id = b.id;
    end if;
    update public.trainer_slots set status = 'booked' where id = b.slot_id;
  else
    new_status := 'declined';
    update public.bookings set status = 'declined', responded_at = now() where id = b.id;
    update public.trainer_slots set status = 'free' where id = b.slot_id;
  end if;
  return new_status;
end $function$
"