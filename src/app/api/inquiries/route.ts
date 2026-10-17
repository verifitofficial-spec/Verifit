import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getResendClient } from '@/app/lib/resend';
import {
  getAccessTokenFromRequest,
  getAdminClient,
  getRequestAuthentication,
  getUserClient,
} from '@/app/lib/supabaseServer';
import {
  createInquirySchema,
  inquiryQuerySchema,
  updateInquiryStatusSchema,
} from '@/app/lib/validation/inquirySchemas';
import {
  InquiryWorkflowError,
  createInquiryWorkflow,
  listInquiriesWorkflow,
  updateInquiryStatusWorkflow,
  type InquiryActor,
  type InquiryRecord,
  type InquiryStatus,
} from '@/lib/inquiryCore';
import { isOfferTypePriceValid } from '@/lib/matching';

type DbInquiryRow = {
  id: string;
  client_id: string;
  trainer_id: string;
  offer_id: string | null;
  client_name: string;
  client_email: string;
  trainer_name: string;
  offer_title: string | null;
  message: string;
  status: InquiryStatus;
  created_at: string;
  updated_at: string;
  status_changed_at: string;
};

type DbStatusEvent = {
  inquiry_id: string;
  from_status: InquiryStatus | null;
  to_status: InquiryStatus;
  actor_role: 'client' | 'trainer' | 'admin';
  changed_at: string;
};

type RpcError = { message?: string; code?: string };

const INQUIRY_COLUMNS =
  'id, client_id, trainer_id, offer_id, client_name, client_email, trainer_name, offer_title, message, status, created_at, updated_at, status_changed_at';

function escapeHtml(value: string | null) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toRecord(row: DbInquiryRow): InquiryRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    trainerId: row.trainer_id,
    offerId: row.offer_id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    trainerName: row.trainer_name,
    offerTitle: row.offer_title,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    statusChangedAt: row.status_changed_at,
  };
}

function actorFrom(authentication: Awaited<ReturnType<typeof getRequestAuthentication>>): InquiryActor | null {
  if (!authentication) return null;
  return { userId: authentication.user.id, role: authentication.role };
}

function databaseFailure(message: string): InquiryWorkflowError {
  return new InquiryWorkflowError('database_error', 500, message);
}

function rpcFailure(error: RpcError): InquiryWorkflowError {
  switch (error.message) {
    case 'INQUIRY_RATE_LIMIT':
      return new InquiryWorkflowError(
        'rate_limited',
        429,
        'Du hast in kurzer Zeit zu viele Anfragen gesendet. Bitte versuche es später erneut.'
      );
    case 'INQUIRY_IDEMPOTENCY_CONFLICT':
      return new InquiryWorkflowError(
        'idempotency_conflict',
        409,
        'Diese Anfragekennung wurde bereits für eine andere Anfrage verwendet.'
      );
    case 'INQUIRY_TRAINER_UNAVAILABLE':
      return new InquiryWorkflowError('trainer_unavailable', 404, 'Trainer ist nicht verfügbar.');
    case 'INQUIRY_OFFER_UNAVAILABLE':
      return new InquiryWorkflowError('offer_unavailable', 400, 'Das ausgewählte Angebot ist nicht verfügbar.');
    case 'INQUIRY_NOT_FOUND':
      return new InquiryWorkflowError('inquiry_missing', 404, 'Anfrage nicht gefunden.');
    case 'INQUIRY_INVALID_TRANSITION':
    case 'INQUIRY_INVALID_STATUS':
      return new InquiryWorkflowError('invalid_transition', 409, 'Dieser Statuswechsel ist nicht zulässig.');
    case 'INQUIRY_CLIENT_ONLY':
    case 'INQUIRY_TRAINER_ONLY':
    case 'INQUIRY_UNAUTHENTICATED':
      return new InquiryWorkflowError('forbidden', 403, 'Keine Berechtigung.');
    default:
      return databaseFailure('Anfrage konnte nicht verarbeitet werden.');
  }
}

function responseForError(error: unknown) {
  if (error instanceof InquiryWorkflowError) {
    return NextResponse.json({ error: error.publicMessage }, { status: error.status });
  }
  console.error('Inquiry-Anfrage konnte nicht verarbeitet werden');
  return NextResponse.json({ error: 'Anfrage konnte nicht verarbeitet werden.' }, { status: 500 });
}

async function parseBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new InquiryWorkflowError('invalid_json', 400, 'Ungültiger Request-Body.');
  }
}

async function findInquiry(
  userClient: SupabaseClient,
  inquiryId: string
): Promise<InquiryRecord | null> {
  const { data, error } = await userClient
    .from('inquiries')
    .select(INQUIRY_COLUMNS)
    .eq('id', inquiryId)
    .maybeSingle();

  if (error) throw databaseFailure('Anfrage konnte nicht geladen werden.');
  return data ? toRecord(data as DbInquiryRow) : null;
}

export async function POST(request: Request) {
  try {
    const authentication = await getRequestAuthentication(request);
    const accessToken = getAccessTokenFromRequest(request);
    if (!authentication || !accessToken) {
      throw new InquiryWorkflowError('unauthenticated', 401, 'Bitte melde dich an.');
    }

    const parsed = createInquirySchema.safeParse(await parseBody(request));
    if (!parsed.success) {
      throw new InquiryWorkflowError(
        'invalid_input',
        400,
        parsed.error.issues[0]?.message || 'Ungültige Eingabe.'
      );
    }

    const admin = getAdminClient();
    const userClient = getUserClient(accessToken);
    const repository = {
      async getClientContact(userId: string) {
        const { data, error } = await admin
          .from('clients')
          .select('name, email')
          .eq('id', userId)
          .maybeSingle();
        if (error) throw databaseFailure('Kundenprofil konnte nicht geprüft werden.');
        if (!data) return null;
        return { name: data.name?.trim() || data.email, email: data.email };
      },
      async getApprovedTrainer(trainerId: string) {
        const { data, error } = await admin
          .from('trainers')
          .select('id, name, email, status')
          .eq('id', trainerId)
          .maybeSingle();
        if (error) throw databaseFailure('Trainer konnte nicht geprüft werden.');
        if (!data || data.status !== 'approved') return null;
        return {
          id: data.id,
          name: data.name?.trim() || 'Trainer',
          email: data.email?.trim() || '',
        };
      },
      async getEligibleOffer(offerId: string, trainerId: string) {
        const { data, error } = await admin
          .from('trainer_offers')
          .select('id, trainer_id, title, type, price, is_active')
          .eq('id', offerId)
          .maybeSingle();
        if (error) throw databaseFailure('Angebot konnte nicht geprüft werden.');
        if (
          !data ||
          data.trainer_id !== trainerId ||
          !data.is_active ||
          !isOfferTypePriceValid(data.type, data.price)
        ) {
          return null;
        }
        return { id: data.id, title: data.title };
      },
      async create(input: typeof parsed.data) {
        const { data, error } = await userClient.rpc('create_inquiry', {
          p_trainer_id: input.trainerId,
          p_offer_id: input.offerId ?? null,
          p_message: input.message,
          p_idempotency_key: input.idempotencyKey,
        });
        if (error) throw rpcFailure(error);
        const result = (data as Array<{ inquiry_id: string; was_created: boolean }> | null)?.[0];
        if (!result) throw databaseFailure('Anfrage konnte nicht gespeichert werden.');
        return { inquiryId: result.inquiry_id, wasCreated: result.was_created };
      },
    };

    const result = await createInquiryWorkflow({
      actor: actorFrom(authentication),
      input: {
        trainerId: parsed.data.trainerId,
        offerId: parsed.data.offerId ?? null,
        message: parsed.data.message,
        idempotencyKey: parsed.data.idempotencyKey,
      },
      repository,
      notifyTrainer: async ({ client, trainer, offer }) => {
        if (!trainer.email) throw new Error('Trainer hat keine E-Mail-Adresse');
        const appUrl = process.env.NEXT_PUBLIC_APP_URL;
        let dashboardLink = '';
        if (appUrl) {
          try {
            const url = new URL(`/trainer/${trainer.id}/dashboard`, appUrl).toString();
            dashboardLink = `<p><a href="${escapeHtml(url)}">Anfrage im Dashboard ansehen</a></p>`;
          } catch {
            dashboardLink = '';
          }
        }

        const { error } = await getResendClient().emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          to: trainer.email,
          subject: 'Neue unverbindliche Anfrage – VeriFit',
          html: `<p>Hallo ${escapeHtml(trainer.name)},</p>
            <p>${escapeHtml(client.name)} hat dir eine unverbindliche Anfrage gesendet${offer ? ` – zum Angebot <strong>${escapeHtml(offer.title)}</strong>` : ''}.</p>
            <p>Die Nachricht und Kontaktdaten findest du geschützt in deinem Trainer-Dashboard.</p>
            ${dashboardLink}`,
        });
        if (error) throw new Error('Mailversand fehlgeschlagen');
      },
    });

    if (result.mailSent === false) {
      console.error('Trainer-Benachrichtigung für gespeicherte Inquiry fehlgeschlagen');
    }

    return NextResponse.json(
      {
        success: true,
        inquiryId: result.inquiryId,
        deduplicated: result.deduplicated,
        mailSent: result.mailSent,
      },
      { status: result.deduplicated ? 200 : 201 }
    );
  } catch (error) {
    return responseForError(error);
  }
}

export async function GET(request: Request) {
  try {
    const authentication = await getRequestAuthentication(request);
    const accessToken = getAccessTokenFromRequest(request);
    if (!authentication || !accessToken) {
      throw new InquiryWorkflowError('unauthenticated', 401, 'Bitte melde dich an.');
    }

    const url = new URL(request.url);
    const parsed = inquiryQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      throw new InquiryWorkflowError(
        'invalid_query',
        400,
        parsed.error.issues[0]?.message || 'Ungültige Anfrage.'
      );
    }

    const userClient = getUserClient(accessToken);
    const inquiries = await listInquiriesWorkflow({
      actor: actorFrom(authentication),
      inquiryId: parsed.data.inquiryId,
      repository: {
        async list(inquiryId?: string) {
          let query = userClient
            .from('inquiries')
            .select(INQUIRY_COLUMNS)
            .order('created_at', { ascending: false });
          if (inquiryId) query = query.eq('id', inquiryId);
          const { data, error } = await query;
          if (error) throw databaseFailure('Anfragen konnten nicht geladen werden.');
          return ((data ?? []) as DbInquiryRow[]).map(toRecord);
        },
      },
    });

    if (parsed.data.inquiryId && inquiries.length === 0) {
      throw new InquiryWorkflowError('inquiry_missing', 404, 'Anfrage nicht gefunden.');
    }

    const ids = inquiries.map((inquiry) => inquiry.id);
    let events: DbStatusEvent[] = [];
    if (ids.length > 0) {
      const { data, error } = await userClient
        .from('inquiry_status_events')
        .select('inquiry_id, from_status, to_status, actor_role, changed_at')
        .in('inquiry_id', ids)
        .order('changed_at', { ascending: true });
      if (error) throw databaseFailure('Statusverlauf konnte nicht geladen werden.');
      events = (data ?? []) as DbStatusEvent[];
    }

    const response = inquiries.map((inquiry) => ({
      id: inquiry.id,
      trainerId: inquiry.trainerId,
      offerId: inquiry.offerId,
      trainerName: inquiry.trainerName,
      offerTitle: inquiry.offerTitle,
      message: inquiry.message,
      status: inquiry.status,
      createdAt: inquiry.createdAt,
      updatedAt: inquiry.updatedAt,
      statusChangedAt: inquiry.statusChangedAt,
      ...(authentication.role === 'trainer' || authentication.role === 'admin'
        ? { client: { name: inquiry.clientName, email: inquiry.clientEmail } }
        : {}),
      history: events
        .filter((event) => event.inquiry_id === inquiry.id)
        .map((event) => ({
          fromStatus: event.from_status,
          toStatus: event.to_status,
          actorRole: event.actor_role,
          changedAt: event.changed_at,
        })),
    }));

    return NextResponse.json({ inquiries: response });
  } catch (error) {
    return responseForError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const authentication = await getRequestAuthentication(request);
    const accessToken = getAccessTokenFromRequest(request);
    if (!authentication || !accessToken) {
      throw new InquiryWorkflowError('unauthenticated', 401, 'Bitte melde dich an.');
    }

    const parsed = updateInquiryStatusSchema.safeParse(await parseBody(request));
    if (!parsed.success) {
      throw new InquiryWorkflowError(
        'invalid_input',
        400,
        parsed.error.issues[0]?.message || 'Ungültige Eingabe.'
      );
    }

    const userClient = getUserClient(accessToken);
    const inquiry = await updateInquiryStatusWorkflow({
      actor: actorFrom(authentication),
      inquiryId: parsed.data.inquiryId,
      status: parsed.data.status,
      repository: {
        findById: (inquiryId) => findInquiry(userClient, inquiryId),
        async transition(inquiryId, status) {
          const { error } = await userClient.rpc('transition_inquiry_status', {
            p_inquiry_id: inquiryId,
            p_status: status,
          });
          if (error) throw rpcFailure(error);
          const updated = await findInquiry(userClient, inquiryId);
          if (!updated) throw databaseFailure('Aktualisierte Anfrage konnte nicht geladen werden.');
          return updated;
        },
      },
    });

    return NextResponse.json({
      inquiry: {
        id: inquiry.id,
        status: inquiry.status,
        updatedAt: inquiry.updatedAt,
        statusChangedAt: inquiry.statusChangedAt,
      },
    });
  } catch (error) {
    return responseForError(error);
  }
}
