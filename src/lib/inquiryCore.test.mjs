import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  InquiryWorkflowError,
  createInquiryWorkflow,
  listInquiriesWorkflow,
  updateInquiryStatusWorkflow,
} from './inquiryCore.ts';

const CLIENT_A = '00000000-0000-4000-8000-000000000001';
const CLIENT_B = '00000000-0000-4000-8000-000000000002';
const TRAINER_A = '00000000-0000-4000-8000-000000000010';
const TRAINER_B = '00000000-0000-4000-8000-000000000011';
const OFFER_A = '00000000-0000-4000-8000-000000000020';
const INQUIRY_ID = '00000000-0000-4000-8000-000000000030';
const REQUEST_KEY = '00000000-0000-4000-8000-000000000040';

function record(overrides = {}) {
  return {
    id: INQUIRY_ID,
    clientId: CLIENT_A,
    trainerId: TRAINER_A,
    offerId: OFFER_A,
    clientName: 'Kunde A',
    clientEmail: 'kunde-a@example.test',
    trainerName: 'Trainer A',
    offerTitle: 'Online Coaching',
    message: 'Ich suche Unterstützung für mein Training.',
    status: 'new',
    createdAt: '2026-10-17T00:00:00.000Z',
    updatedAt: '2026-10-17T00:00:00.000Z',
    statusChangedAt: '2026-10-17T00:00:00.000Z',
    ...overrides,
  };
}

function createRepository(overrides = {}) {
  return {
    async getClientContact() {
      return { name: 'Kunde A', email: 'kunde-a@example.test' };
    },
    async getApprovedTrainer() {
      return { id: TRAINER_A, name: 'Trainer A', email: 'trainer-a@example.test' };
    },
    async getEligibleOffer() {
      return { id: OFFER_A, title: 'Online Coaching' };
    },
    async create() {
      return { inquiryId: INQUIRY_ID, wasCreated: true };
    },
    ...overrides,
  };
}

const validInput = {
  trainerId: TRAINER_A,
  offerId: OFFER_A,
  message: 'Ich suche Unterstützung für mein Training.',
  idempotencyKey: REQUEST_KEY,
};

test('gültige Anfrage wird gespeichert und genau einmal benachrichtigt', async () => {
  let notifications = 0;
  const result = await createInquiryWorkflow({
    actor: { userId: CLIENT_A, role: 'client' },
    input: validInput,
    repository: createRepository(),
    notifyTrainer: async () => {
      notifications += 1;
    },
  });

  assert.equal(result.inquiryId, INQUIRY_ID);
  assert.equal(result.deduplicated, false);
  assert.equal(result.mailSent, true);
  assert.equal(notifications, 1);
});

test('nicht authentifizierter Aufruf wird abgelehnt', async () => {
  await assert.rejects(
    createInquiryWorkflow({
      actor: null,
      input: validInput,
      repository: createRepository(),
      notifyTrainer: async () => {},
    }),
    (error) => error instanceof InquiryWorkflowError && error.status === 401
  );
});

test('falsche Rolle darf keine Anfrage erstellen', async () => {
  await assert.rejects(
    createInquiryWorkflow({
      actor: { userId: TRAINER_A, role: 'trainer' },
      input: validInput,
      repository: createRepository(),
      notifyTrainer: async () => {},
    }),
    (error) => error instanceof InquiryWorkflowError && error.code === 'client_only'
  );
});

test('nicht freigegebener Trainer wird abgelehnt', async () => {
  await assert.rejects(
    createInquiryWorkflow({
      actor: { userId: CLIENT_A, role: 'client' },
      input: validInput,
      repository: createRepository({ getApprovedTrainer: async () => null }),
      notifyTrainer: async () => {},
    }),
    (error) => error instanceof InquiryWorkflowError && error.code === 'trainer_unavailable'
  );
});

test('fremdes oder ungültiges Angebot wird abgelehnt', async () => {
  await assert.rejects(
    createInquiryWorkflow({
      actor: { userId: CLIENT_A, role: 'client' },
      input: validInput,
      repository: createRepository({ getEligibleOffer: async () => null }),
      notifyTrainer: async () => {},
    }),
    (error) => error instanceof InquiryWorkflowError && error.code === 'offer_unavailable'
  );
});

test('Kunde A kann die Anfrage von Kunde B nicht lesen', async () => {
  const result = await listInquiriesWorkflow({
    actor: { userId: CLIENT_A, role: 'client' },
    repository: { list: async () => [record({ clientId: CLIENT_B })] },
  });
  assert.deepEqual(result, []);
});

test('Trainer A kann Anfrage von Trainer B nicht lesen oder verändern', async () => {
  let transitionCalled = false;
  await assert.rejects(
    updateInquiryStatusWorkflow({
      actor: { userId: TRAINER_A, role: 'trainer' },
      inquiryId: INQUIRY_ID,
      status: 'viewed',
      repository: {
        findById: async () => record({ trainerId: TRAINER_B }),
        transition: async () => {
          transitionCalled = true;
          return record();
        },
      },
    }),
    (error) => error instanceof InquiryWorkflowError && error.status === 404
  );
  assert.equal(transitionCalled, false);
});

test('unzulässiger Statussprung von new zu contacted wird abgelehnt', async () => {
  await assert.rejects(
    updateInquiryStatusWorkflow({
      actor: { userId: TRAINER_A, role: 'trainer' },
      inquiryId: INQUIRY_ID,
      status: 'contacted',
      repository: {
        findById: async () => record(),
        transition: async () => record({ status: 'contacted' }),
      },
    }),
    (error) => error instanceof InquiryWorkflowError && error.code === 'invalid_transition'
  );
});

test('wiederholter Request wird dedupliziert und erzeugt keine zweite Mail', async () => {
  let created = false;
  let notifications = 0;
  const repository = createRepository({
    async create() {
      if (created) return { inquiryId: INQUIRY_ID, wasCreated: false };
      created = true;
      return { inquiryId: INQUIRY_ID, wasCreated: true };
    },
  });
  const run = () => createInquiryWorkflow({
    actor: { userId: CLIENT_A, role: 'client' },
    input: validInput,
    repository,
    notifyTrainer: async () => {
      notifications += 1;
    },
  });

  const first = await run();
  const second = await run();
  assert.equal(first.deduplicated, false);
  assert.equal(second.deduplicated, true);
  assert.equal(notifications, 1);
});

test('Mailfehler lässt die gespeicherte Anfrage bestehen', async () => {
  let persisted = false;
  const result = await createInquiryWorkflow({
    actor: { userId: CLIENT_A, role: 'client' },
    input: validInput,
    repository: createRepository({
      async create() {
        persisted = true;
        return { inquiryId: INQUIRY_ID, wasCreated: true };
      },
    }),
    notifyTrainer: async () => {
      throw new Error('simulierter Mailfehler');
    },
  });

  assert.equal(persisted, true);
  assert.equal(result.inquiryId, INQUIRY_ID);
  assert.equal(result.mailSent, false);
});

const routeSource = await readFile(new URL('../app/api/inquiries/route.ts', import.meta.url), 'utf8');

test('Inquiry-API reserviert keine Slots', () => {
  assert.doesNotMatch(routeSource, /trainer_slots|book-slot|slot_id/i);
});

test('Inquiry-API erstellt keine Buchung', () => {
  assert.doesNotMatch(routeSource, /from\(['"]bookings['"]\)|respond-booking/i);
});

test('Inquiry-API startet keinen Checkout und keine Stripe-Aktion', () => {
  assert.doesNotMatch(routeSource, /stripe|checkout|payment_intent/i);
});
