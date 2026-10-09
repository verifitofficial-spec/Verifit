-- VeriFit Final Release: Tracking-Erweiterung, Opt-in-Default, Konto-Löschung.
-- Staging zuerst ausführen (Supabase SQL Editor). Idempotent, soweit möglich.

-- 1) Tracking: Gesundheit und Motivation (Masterplan B)
alter table public.client_trackings
  add column if not exists health integer,
  add column if not exists motivation integer;

-- 2) Datenfreigabe ist Opt-in (Gesundheitsdaten, Art. 9 DSGVO). Gilt nur für neue Kunden.
alter table public.clients alter column share_data set default false;

-- 3) Buchungen müssen nach einer Kontolöschung als anonymisierte Belege bestehen bleiben.
--    Dafür dürfen client_id/trainer_id nicht mehr per Fremdschlüssel an clients/trainers hängen.
do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.bookings'::regclass
      and c.contype = 'f'
      and exists (
        select 1
        from unnest(c.conkey) as k(attnum)
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
        where a.attname in ('client_id', 'trainer_id')
      )
  loop
    execute format('alter table public.bookings drop constraint %I', r.conname);
  end loop;
end $$;

-- 4) Konto-Löschung: wird ausschließlich vom Server (service_role) über /api/delete-account aufgerufen.
create or replace function public.delete_user_data(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.messages where sender_id = p_user_id or receiver_id = p_user_id;
  delete from public.client_trackings where client_id = p_user_id;
  delete from public.client_plans where user_id = p_user_id or trainer_id = p_user_id;
  delete from public.nutrition_plans where client_id = p_user_id;
  delete from public.workout_plans where client_id = p_user_id;
  delete from public.appointments where client_id = p_user_id or trainer_id = p_user_id;

  -- Buchungen bleiben als anonymisierte Belege (Aufbewahrungspflichten) erhalten.
  update public.bookings
    set client_name = 'Gelöschter Nutzer',
        client_email = 'deleted-' || left(client_id::text, 8) || '@invalid.local'
    where client_id = p_user_id;
  update public.bookings set slot_id = null, offer_id = null where trainer_id = p_user_id;

  delete from public.trainer_slots where trainer_id = p_user_id;
  delete from public.trainer_offers where trainer_id = p_user_id;
  delete from public.trainers where id = p_user_id;
  delete from public.clients where id = p_user_id;
  delete from public.profiles where id = p_user_id;
end;
$$;

revoke all on function public.delete_user_data(uuid) from public, anon, authenticated;
grant execute on function public.delete_user_data(uuid) to service_role;
