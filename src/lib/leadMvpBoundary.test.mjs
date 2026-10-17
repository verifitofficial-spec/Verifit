import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('Trainer-Dashboard lädt nur Lead-MVP-Hooks und -Bereiche', async () => {
  const dashboard = await source('../app/trainer/[id]/dashboard/page.tsx');
  const offersHook = await source('../hooks/trainer-dashboard/useTrainerOffers.ts');
  const accountHook = await source('../hooks/trainer-dashboard/useTrainerAccount.ts');
  const offersSection = await source('../components/trainer-dashboard/OffersSection.tsx');

  assert.match(dashboard, /useTrainerOffers/);
  assert.match(dashboard, /InquiryList/);
  assert.doesNotMatch(
    dashboard,
    /useTrainerSchedule|useClients|StripeSection|StripeReturnSync|ScheduleSection|ChatSection|WorkoutPlanner|NutritionPlanner/
  );
  assert.doesNotMatch(offersHook, /trainer_slots|bookings|messages|client_plans|client_trackings|stripe/i);
  assert.match(accountHook, /setError\('Dein Trainerprofil konnte nicht geladen werden\.'/);
  assert.match(dashboard, /Trainer-Dashboard nicht verfügbar/);
  assert.match(offersHook, /setError\('Deine Angebote konnten nicht geladen werden\.'/);
  assert.match(offersSection, /Angebote werden geladen/);
  assert.match(offersSection, /Erneut versuchen/);
});

test('Client-Dashboard benötigt keine ausgeschlossenen Datenbankobjekte oder Zahlungsabläufe', async () => {
  const dashboard = await source('../app/client/[id]/dashboard/page.tsx');

  assert.match(dashboard, /InquiryList/);
  assert.match(dashboard, /DeleteAccountCard/);
  assert.doesNotMatch(
    dashboard,
    /trainer_slots|bookings|client_trackings|client_plans|messages|food_database|stripe|checkout|Chat|TrendChart/
  );
});

test('Kontolöschung hängt nur vom atomaren MVP-Löschprozess und Storage ab', async () => {
  const route = await source('../app/api/delete-account/route.ts');

  assert.match(route, /rpc\('assert_user_deletion_allowed'/);
  assert.match(route, /rpc\('delete_user_data'/);
  assert.match(route, /auth\.admin\.deleteUser/);
  const postHandler = route.slice(route.indexOf('export async function POST'));
  assert.ok(
    postHandler.indexOf("rpc('assert_user_deletion_allowed'") < postHandler.indexOf("if (role === 'trainer')"),
    'Die Löschfreigabe muss vor dem ersten Storage-Zugriff erfolgen.'
  );
  assert.doesNotMatch(route, /trainer_slots|bookings|client_trackings|client_plans|messages|stripe/i);
});

test('Öffentliche Trainerpfade greifen nie auf die private Basistabelle zurück', async () => {
  const publicSources = await Promise.all([
    source('../app/quiz/page.tsx'),
    source('../app/trainer/list/page.tsx'),
    source('../app/trainer/[id]/page.tsx'),
  ]);

  for (const publicSource of publicSources) {
    assert.match(publicSource, /\.from\('trainers_public'\)/);
    assert.doesNotMatch(publicSource, /\.from\('trainers'\)/);
  }
});

test('Quiz nutzt bei einer fehlenden öffentlichen View nur den feldgewhitelisteten Server-Fallback', async () => {
  const quiz = await source('../app/quiz/page.tsx');
  const trainerList = await source('../app/trainer/list/page.tsx');
  const trainerProfile = await source('../app/trainer/[id]/page.tsx');
  const route = await source('../app/api/public/matching-data/route.ts');

  assert.match(quiz, /isMissingRelationError\(enrichedTrainerRes\.error, 'trainers_public'\)/);
  assert.match(quiz, /fetch\('\/api\/public\/matching-data'/);
  assert.match(trainerList, /isMissingRelationError\(error, 'trainers_public'\)/);
  assert.match(trainerList, /fetch\('\/api\/public\/matching-data'/);
  assert.match(trainerProfile, /isMissingRelationError\(trainerResult\.error, 'trainers_public'\)/);
  assert.match(trainerProfile, /\/api\/public\/matching-data\?trainerId=/);
  assert.match(route, /getPublicClient/);
  assert.doesNotMatch(route, /getAdminClient|SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(route, /\.from\('trainers'\)[\s\S]*?\.eq\('status', 'approved'\)/);
  assert.match(route, /id, name, bio, city, service_mode, specialties, target_levels/);
  assert.doesNotMatch(
    route,
    /email|license_document_path|insurance_document_path|stripe_account_id|charges_enabled/
  );
});

test('Trainerstatus bleibt ausschließlich über die Admin-Route änderbar', async () => {
  const adminRoute = await source('../app/api/admin/trainer-status/route.ts');
  const editableSections = await Promise.all([
    source('../components/trainer-dashboard/ProfileSection.tsx'),
    source('../components/trainer-dashboard/SpecialtiesSection.tsx'),
    source('../components/trainer-dashboard/VerificationSection.tsx'),
  ]);

  assert.match(adminRoute, /authentication\.role !== 'admin'/);
  assert.match(adminRoute, /\.update\(\{ status: parsed\.data\.status \}\)/);
  for (const editableSection of editableSections) {
    assert.doesNotMatch(editableSection, /\.update\(\{[^}]*status\s*:/s);
  }
});

test('Direkte Legacy-APIs enden vor Datenbank-, Mail- oder Stripe-Zugriffen mit der Lead-MVP-Grenze', async () => {
  const legacyRoutes = await Promise.all([
    source('../app/api/book-slot/route.ts'),
    source('../app/api/respond-booking/route.ts'),
    source('../app/api/checkout/route.ts'),
    source('../app/api/checkout/confirm/route.ts'),
    source('../app/api/stripe/connect-link/route.ts'),
    source('../app/api/stripe/sync-account/route.ts'),
    source('../app/api/webhook/route.ts'),
  ]);

  for (const route of legacyRoutes) {
    assert.match(route, /leadMvpUnavailable/);
    assert.doesNotMatch(route, /Stripe|supabase|Resend|getAdminClient|getRequestAuthentication|\.from\(|\.rpc\(/);
  }

  const boundary = await source('../app/lib/leadMvpUnavailable.ts');
  assert.match(boundary, /status: 410/);
  assert.match(boundary, /Cache-Control.*no-store/);
});

test('Navigation und direkt aufrufbare Legacy-Seiten bleiben innerhalb der Lead-MVP-Grenze', async () => {
  const appShell = await source('../components/AppShell.tsx');
  const checkoutSuccess = await source('../app/checkout/success/page.tsx');
  const trainerClients = await source('../app/trainer/[id]/clients/page.tsx');

  assert.doesNotMatch(appShell, /Meine Kunden|Buchungen|Tracking|Nachrichten/);
  assert.match(checkoutSuccess, /LeadMvpLegacyNotice/);
  assert.match(trainerClients, /LeadMvpLegacyNotice/);
  assert.doesNotMatch(checkoutSuccess, /stripe|checkout\/confirm|supabase|session_id/i);
  assert.doesNotMatch(trainerClients, /bookings|client_trackings|supabase|TrendChart/i);
});
