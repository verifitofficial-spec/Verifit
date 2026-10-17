export const INQUIRY_STATUSES = ['new', 'viewed', 'contacted', 'declined', 'closed'] as const;

export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];
export type InquiryActorRole = 'client' | 'trainer' | 'admin' | null;

export type InquiryActor = {
  userId: string;
  role: InquiryActorRole;
};

export type InquiryRecord = {
  id: string;
  clientId: string;
  trainerId: string;
  offerId: string | null;
  clientName: string;
  clientEmail: string;
  trainerName: string;
  offerTitle: string | null;
  message: string;
  status: InquiryStatus;
  createdAt: string;
  updatedAt: string;
  statusChangedAt: string;
};

export type InquiryCreateInput = {
  trainerId: string;
  offerId: string | null;
  message: string;
  idempotencyKey: string;
};

export type InquiryCreateResult = {
  inquiryId: string;
  wasCreated: boolean;
};

export type InquiryClientContact = {
  name: string;
  email: string;
};

export type InquiryTrainerContact = {
  id: string;
  name: string;
  email: string;
};

export type InquiryOffer = {
  id: string;
  title: string;
};

export interface CreateInquiryRepository {
  getClientContact(userId: string): Promise<InquiryClientContact | null>;
  getApprovedTrainer(trainerId: string): Promise<InquiryTrainerContact | null>;
  getEligibleOffer(offerId: string, trainerId: string): Promise<InquiryOffer | null>;
  create(input: InquiryCreateInput): Promise<InquiryCreateResult>;
}

export interface ReadInquiryRepository {
  list(inquiryId?: string): Promise<InquiryRecord[]>;
}

export interface UpdateInquiryRepository {
  findById(inquiryId: string): Promise<InquiryRecord | null>;
  transition(inquiryId: string, status: InquiryStatus): Promise<InquiryRecord>;
}

export class InquiryWorkflowError extends Error {
  readonly code: string;
  readonly status: number;
  readonly publicMessage: string;

  constructor(code: string, status: number, publicMessage: string) {
    super(publicMessage);
    this.name = 'InquiryWorkflowError';
    this.code = code;
    this.status = status;
    this.publicMessage = publicMessage;
  }
}

const ALLOWED_TRANSITIONS: Record<InquiryStatus, readonly InquiryStatus[]> = {
  new: ['viewed', 'declined', 'closed'],
  viewed: ['contacted', 'declined', 'closed'],
  contacted: ['closed'],
  declined: ['closed'],
  closed: [],
};

export function getAllowedInquiryTransitions(status: InquiryStatus): readonly InquiryStatus[] {
  return ALLOWED_TRANSITIONS[status];
}

export function canTransitionInquiry(from: InquiryStatus, to: InquiryStatus): boolean {
  return from === to || ALLOWED_TRANSITIONS[from].includes(to);
}

function requireActor(actor: InquiryActor | null): InquiryActor {
  if (!actor) {
    throw new InquiryWorkflowError('unauthenticated', 401, 'Bitte melde dich an.');
  }
  return actor;
}

function canReadInquiry(actor: InquiryActor, inquiry: InquiryRecord): boolean {
  if (actor.role === 'admin') return true;
  if (actor.role === 'client') return inquiry.clientId === actor.userId;
  if (actor.role === 'trainer') return inquiry.trainerId === actor.userId;
  return false;
}

export async function createInquiryWorkflow({
  actor: possibleActor,
  input,
  repository,
  notifyTrainer,
}: {
  actor: InquiryActor | null;
  input: InquiryCreateInput;
  repository: CreateInquiryRepository;
  notifyTrainer: (context: {
    inquiryId: string;
    client: InquiryClientContact;
    trainer: InquiryTrainerContact;
    offer: InquiryOffer | null;
  }) => Promise<void>;
}) {
  const actor = requireActor(possibleActor);
  if (actor.role !== 'client') {
    throw new InquiryWorkflowError('client_only', 403, 'Nur Kunden-Konten können Anfragen senden.');
  }

  const [client, trainer] = await Promise.all([
    repository.getClientContact(actor.userId),
    repository.getApprovedTrainer(input.trainerId),
  ]);

  if (!client) {
    throw new InquiryWorkflowError('client_missing', 403, 'Kundenprofil konnte nicht gefunden werden.');
  }
  if (!trainer) {
    throw new InquiryWorkflowError('trainer_unavailable', 404, 'Trainer ist nicht verfügbar.');
  }

  const offer = input.offerId
    ? await repository.getEligibleOffer(input.offerId, input.trainerId)
    : null;
  if (input.offerId && !offer) {
    throw new InquiryWorkflowError('offer_unavailable', 400, 'Das ausgewählte Angebot ist nicht verfügbar.');
  }

  const created = await repository.create(input);
  let mailSent: boolean | null = null;

  if (created.wasCreated) {
    try {
      await notifyTrainer({ inquiryId: created.inquiryId, client, trainer, offer });
      mailSent = true;
    } catch {
      mailSent = false;
    }
  }

  return {
    inquiryId: created.inquiryId,
    deduplicated: !created.wasCreated,
    mailSent,
  };
}

export async function listInquiriesWorkflow({
  actor: possibleActor,
  inquiryId,
  repository,
}: {
  actor: InquiryActor | null;
  inquiryId?: string;
  repository: ReadInquiryRepository;
}) {
  const actor = requireActor(possibleActor);
  if (actor.role !== 'client' && actor.role !== 'trainer' && actor.role !== 'admin') {
    throw new InquiryWorkflowError('forbidden', 403, 'Keine Berechtigung.');
  }

  const rows = await repository.list(inquiryId);
  return rows.filter((row) => canReadInquiry(actor, row));
}

export async function updateInquiryStatusWorkflow({
  actor: possibleActor,
  inquiryId,
  status,
  repository,
}: {
  actor: InquiryActor | null;
  inquiryId: string;
  status: InquiryStatus;
  repository: UpdateInquiryRepository;
}) {
  const actor = requireActor(possibleActor);
  if (actor.role !== 'trainer') {
    throw new InquiryWorkflowError('trainer_only', 403, 'Nur Trainer können Anfragestatus ändern.');
  }

  const inquiry = await repository.findById(inquiryId);
  if (!inquiry || inquiry.trainerId !== actor.userId) {
    throw new InquiryWorkflowError('inquiry_missing', 404, 'Anfrage nicht gefunden.');
  }
  if (!canTransitionInquiry(inquiry.status, status)) {
    throw new InquiryWorkflowError(
      'invalid_transition',
      409,
      'Dieser Statuswechsel ist nicht zulässig.'
    );
  }

  if (inquiry.status === status) return inquiry;
  return repository.transition(inquiryId, status);
}
