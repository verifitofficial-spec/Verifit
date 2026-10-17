import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const baseline = await readFile(
  new URL('../../supabase/baseline/20261017120000_lead_mvp_baseline.sql', import.meta.url),
  'utf8'
);

test('Baseline enthält ausschließlich Lead-MVP-Relationen', () => {
  assert.doesNotMatch(
    baseline,
    /\b(bookings|trainer_slots|messages|client_plans|client_trackings|food_database|nutrition_plans|workout_plans|appointments)\b/i
  );
  for (const relation of [
    'profiles',
    'clients',
    'trainers',
    'trainer_offers',
    'inquiries',
    'inquiry_status_events',
  ]) {
    assert.match(baseline, new RegExp(`create table public\\.${relation}\\b`, 'i'));
  }
});

test('Signup-Metadaten können niemals eine Admin-Rolle vergeben', () => {
  assert.match(baseline, /case when requested_role = 'trainer' then 'trainer' else 'client' end/);
  assert.doesNotMatch(baseline, /requested_role\s*=\s*'admin'/);
  assert.match(baseline, /values \(new\.id, safe_role\)/);
});

test('Öffentliche Trainer-View ist eine explizite security-invoker-Whitelist', () => {
  const viewStart = baseline.indexOf('create view public.trainers_public');
  const viewEnd = baseline.indexOf('comment on view public.trainers_public', viewStart);
  const viewDefinition = baseline.slice(viewStart, viewEnd);

  assert.ok(viewStart >= 0 && viewEnd > viewStart);
  assert.match(viewDefinition, /security_invoker = true/);
  assert.match(viewDefinition, /verifit_private\.public_trainers\(\)/);
  for (const privateColumn of ['email', 'status', 'license_number', 'license_document_path', 'insurance_document_path']) {
    assert.doesNotMatch(viewDefinition, new RegExp(`\\b${privateColumn}\\b`));
  }
  const publicFunctionStart = baseline.indexOf('create or replace function verifit_private.public_trainers()');
  const publicFunctionEnd = baseline.indexOf('alter function verifit_private.is_approved_trainer', publicFunctionStart);
  const publicFunction = baseline.slice(publicFunctionStart, publicFunctionEnd);
  assert.match(publicFunction, /where trainer\.status = 'approved'/);
  for (const privateColumn of ['email', 'license_number', 'license_document_path', 'insurance_document_path']) {
    assert.doesNotMatch(publicFunction, new RegExp(`trainer\\.${privateColumn}\\b`));
  }
});

test('RLS, Least-Privilege und geschützte Trainerfelder sind Teil der Baseline', () => {
  for (const relation of ['profiles', 'clients', 'trainers', 'trainer_offers', 'inquiries', 'inquiry_status_events']) {
    assert.match(baseline, new RegExp(`alter table public\\.${relation} enable row level security`, 'i'));
    assert.match(baseline, new RegExp(`alter table public\\.${relation} force row level security`, 'i'));
  }
  assert.match(baseline, /grant update \([\s\S]*license_number, liability_insurance_expiry[\s\S]*\) on public\.trainers to authenticated/);
  assert.doesNotMatch(baseline, /grant update \([^)]*status[^)]*\) on public\.trainers to authenticated/i);
  assert.doesNotMatch(baseline, /grant select[^;]*on public\.trainers to anon/i);
  assert.doesNotMatch(baseline, /trainers_public_approved_select/);
  assert.match(baseline, /new\.status is distinct from old\.status/);
});

test('Inquiry-RPCs prüfen Rolle, Eigentümer und zulässige Statusübergänge', () => {
  assert.match(baseline, /user_role is distinct from 'client'/);
  assert.match(baseline, /trainer\.status = 'approved'/);
  assert.match(baseline, /existing_inquiry\.trainer_id = p_trainer_id/);
  assert.match(baseline, /user_role is distinct from 'trainer'/);
  assert.match(baseline, /inquiry_row\.trainer_id is distinct from user_id/);
  assert.match(baseline, /INQUIRY_INVALID_TRANSITION/);
});

test('Kontolöschung blockiert bei ungeklärter Inquiry-Aufbewahrung vor jeder Löschung', () => {
  const assertStart = baseline.indexOf('create or replace function public.assert_user_deletion_allowed');
  const deleteStart = baseline.indexOf('create or replace function public.delete_user_data');
  const assertDefinition = baseline.slice(assertStart, deleteStart);
  const deleteDefinition = baseline.slice(deleteStart);

  assert.match(assertDefinition, /ACCOUNT_DELETION_REQUIRES_INQUIRY_RETENTION_DECISION/);
  assert.match(deleteDefinition, /perform public\.assert_user_deletion_allowed\(p_user_id\)/);
  assert.match(baseline, /grant execute on function public\.assert_user_deletion_allowed\(uuid\) to service_role/);
  assert.match(baseline, /grant execute on function public\.delete_user_data\(uuid\) to service_role/);
});

test('Storage-Buckets und eigentümergebundene Policies sind vollständig definiert', () => {
  assert.match(baseline, /\('avatars', 'avatars', true, 5242880/);
  assert.match(baseline, /\('verification-docs', 'verification-docs', false, 10485760/);
  for (const operation of ['select', 'insert', 'update', 'delete']) {
    assert.match(baseline, new RegExp(`create policy verification_docs_owner_${operation}`, 'i'));
  }
  assert.match(baseline, /\(storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)\)::text/);
});
