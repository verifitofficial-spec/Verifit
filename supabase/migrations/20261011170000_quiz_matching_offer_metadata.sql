-- VeriFit Phase 3: belastbare Zielgruppen-, Trainingsform- und Preis-Metadaten.
-- Zuerst in Staging ausführen. Bestehende Datensätze bleiben bewusst NULL/unbekannt,
-- damit fehlende Angaben nicht automatisch als Match interpretiert werden.

begin;

alter table public.trainers
  add column if not exists target_levels text[];

alter table public.trainer_offers
  add column if not exists service_mode text,
  add column if not exists pricing_model text,
  add column if not exists included_sessions integer;

comment on column public.trainers.target_levels is
  'Explizit betreute Niveaus: Anfänger, Fortgeschritten, Profi. NULL bedeutet unbekannt.';
comment on column public.trainers.service_mode is
  'Allgemeine Trainingsform im öffentlichen Profil. Das Quiz prüft die konkrete Form je aktivem Angebot in trainer_offers.service_mode.';
comment on column public.trainer_offers.service_mode is
  'Trainingsform dieses Angebots: Vor Ort, Online oder Hybrid. NULL bedeutet unbekannt.';
comment on column public.trainer_offers.pricing_model is
  'Abrechnung: single_session, package oder monthly. NULL bedeutet nicht klassifiziert.';
comment on column public.trainer_offers.included_sessions is
  'Enthaltene Einheiten bei pricing_model=package; sonst in der Regel NULL.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.trainers'::regclass
      and conname = 'trainers_target_levels_valid'
  ) then
    alter table public.trainers
      add constraint trainers_target_levels_valid
      check (
        target_levels is null
        or (
          array_position(target_levels, null) is null
          and target_levels <@ array['Anfänger', 'Fortgeschritten', 'Profi']::text[]
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.trainer_offers'::regclass
      and conname = 'trainer_offers_service_mode_valid'
  ) then
    alter table public.trainer_offers
      add constraint trainer_offers_service_mode_valid
      check (service_mode is null or service_mode in ('Vor Ort', 'Online', 'Hybrid'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.trainer_offers'::regclass
      and conname = 'trainer_offers_pricing_model_valid'
  ) then
    alter table public.trainer_offers
      add constraint trainer_offers_pricing_model_valid
      check (pricing_model is null or pricing_model in ('single_session', 'package', 'monthly'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.trainer_offers'::regclass
      and conname = 'trainer_offers_included_sessions_valid'
  ) then
    alter table public.trainer_offers
      add constraint trainer_offers_included_sessions_valid
      check (included_sessions is null or included_sessions > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.trainer_offers'::regclass
      and conname = 'trainer_offers_package_sessions_consistent'
  ) then
    alter table public.trainer_offers
      add constraint trainer_offers_package_sessions_consistent
      check (
        (pricing_model = 'package' and included_sessions is not null)
        or (pricing_model is distinct from 'package' and included_sessions is null)
      );
  end if;
end $$;

-- Diese Migration legt keine neue Policy an. Die neuen Spalten unterliegen vollständig den
-- vorhandenen Tabellen-Policies. Vor der Ausführung in Staging müssen insbesondere die aktuelle
-- trainers-UPDATE-Policy und offers_trainer_write gegen die Rollenmatrix geprüft werden.
-- Die im veralteten Export belegten, zu breiten Legacy-Policies werden hier bewusst nicht
-- spekulativ ersetzt; ihre Korrektur gehört in eine separat verifizierte Sicherheitsmigration.

commit;
