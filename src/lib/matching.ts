export const EXPERIENCE_LEVELS = ['Anfänger', 'Fortgeschritten', 'Profi'] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const SERVICE_MODES = ['Vor Ort', 'Online', 'Hybrid'] as const;
export type ServiceMode = (typeof SERVICE_MODES)[number];

export const PRICING_MODELS = ['single_session', 'package', 'monthly'] as const;
export type PricingModel = (typeof PRICING_MODELS)[number];

export type MatchingOffer = {
  id: string;
  title: string;
  type: 'discovery' | 'paid';
  isActive: boolean;
  price: number | null;
  durationMinutes: number | null;
  serviceMode: ServiceMode | null;
  pricingModel: PricingModel | null;
  includedSessions: number | null;
};

export type MatchingTrainer = {
  id: string;
  name: string | null;
  specialties: string[];
  targetLevels: ExperienceLevel[];
  offers: MatchingOffer[];
};

export type MatchingAnswers = {
  experience: ExperienceLevel;
  goal: string;
  mode: ServiceMode;
  sessionsPerMonth: number | null;
  monthlyBudget: number | null;
};

export type PartialMatchingCriteria = {
  experience?: ExperienceLevel | null;
  goal?: string | null;
  mode?: ServiceMode | null;
};

export type DynamicMatchingAnswers = {
  experience: ExperienceLevel | '';
  goal: string;
  mode: ServiceMode | '';
};

export type PriceComparison = {
  monthlyCost: number | null;
  unitPrice: number | null;
  withinBudget: boolean | null;
  label: string;
  explanation: string;
};

export type AlternativeReason =
  | { type: 'budget_exceeded'; amount: number }
  | {
      type: 'package_not_monthly_comparable';
      totalPrice: number;
      includedSessions: number;
      unitPrice: number;
    };

export type ComparedMatchingOffer = {
  offer: MatchingOffer;
  comparison: PriceComparison;
};

export type AlternativeMatchingOffer = ComparedMatchingOffer & {
  reason: AlternativeReason;
};

export type ExactTrainerMatch<T extends MatchingTrainer = MatchingTrainer> = {
  trainer: T;
  offers: ComparedMatchingOffer[];
};

export type AlternativeTrainerMatch<T extends MatchingTrainer = MatchingTrainer> = {
  trainer: T;
  offers: AlternativeMatchingOffer[];
};

export type MatchingGroups<T extends MatchingTrainer = MatchingTrainer> = {
  exact: ExactTrainerMatch<T>[];
  alternatives: AlternativeTrainerMatch<T>[];
};

type SupabaseQueryError = {
  code?: string;
  message?: string;
};

const PHASE_3_COLUMNS = ['target_levels', 'service_mode', 'pricing_model', 'included_sessions'] as const;

function euro(value: number) {
  return `${value.toFixed(2).replace('.', ',')} €`;
}

export function normalizeServiceMode(value: unknown): ServiceMode | null {
  if (typeof value !== 'string') return null;
  const lower = value.trim().toLowerCase();
  if (lower === 'hybrid' || (lower.includes('vor ort') && lower.includes('online'))) return 'Hybrid';
  if (lower === 'online') return 'Online';
  if (lower === 'vor ort') return 'Vor Ort';
  return null;
}

export function normalizePricingModel(value: unknown): PricingModel | null {
  return PRICING_MODELS.includes(value as PricingModel) ? (value as PricingModel) : null;
}

export function normalizeTargetLevels(value: unknown): ExperienceLevel[] {
  if (!Array.isArray(value)) return [];
  return EXPERIENCE_LEVELS.filter((level) => value.includes(level));
}

export function toggleTargetLevelSelection(
  levels: readonly ExperienceLevel[],
  level: ExperienceLevel
): ExperienceLevel[] {
  const selected = new Set(levels);
  if (selected.has(level)) selected.delete(level);
  else selected.add(level);
  return EXPERIENCE_LEVELS.filter((candidate) => selected.has(candidate));
}

export function validateOfferMetadata(input: {
  type: 'discovery' | 'paid';
  price: number;
  serviceMode: ServiceMode | '';
  pricingModel: PricingModel | '';
  includedSessions: number | null;
}): string | null {
  if (!input.serviceMode) return 'Bitte wähle die Trainingsform dieses Angebots.';
  if (input.type === 'discovery') return null;
  if (!Number.isFinite(input.price) || input.price <= 0) return 'Bezahlte Angebote brauchen einen Preis größer 0.';
  if (!input.pricingModel) return 'Bitte wähle ein Abrechnungsmodell.';
  if (
    input.pricingModel === 'package' &&
    (!input.includedSessions || input.includedSessions <= 0 || !Number.isInteger(input.includedSessions))
  ) {
    return 'Bitte gib an, wie viele Einheiten das Paket enthält.';
  }
  return null;
}

export function offerMetadataForPersistence(input: {
  type: 'discovery' | 'paid';
  serviceMode: ServiceMode | '';
  pricingModel: PricingModel | '';
  includedSessions: number | null;
}) {
  const pricingModel = input.type === 'paid' && input.pricingModel ? input.pricingModel : null;
  return {
    service_mode: input.serviceMode || null,
    pricing_model: pricingModel,
    included_sessions: pricingModel === 'package' ? input.includedSessions : null,
  };
}

export function normalizeDatabasePrice(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isOfferTypePriceValid(type: unknown, value: unknown): boolean {
  const price = normalizeDatabasePrice(value);
  if (type === 'discovery') return price === 0;
  if (type === 'paid') return price !== null && price > 0;
  return false;
}

/**
 * Der Legacy-Fallback ist ausschließlich für noch nicht migrierte Phase-3-Spalten gedacht.
 * Auth-, RLS-, Netzwerk- und sonstige Datenbankfehler müssen sichtbar fehlschlagen.
 */
export function isMissingPhase3MetadataError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, message } = error as SupabaseQueryError;
  if (code !== '42703' && code !== 'PGRST204') return false;
  const normalizedMessage = message?.toLowerCase() ?? '';
  return PHASE_3_COLUMNS.some((column) => normalizedMessage.includes(column));
}

export function offerSupportsMode(offerMode: ServiceMode | null, requestedMode: ServiceMode) {
  if (!offerMode) return false;
  if (requestedMode === 'Hybrid') return offerMode === 'Hybrid';
  return offerMode === requestedMode || offerMode === 'Hybrid';
}

function isQualifyingMatchingOffer(offer: MatchingOffer) {
  return (
    offer.isActive &&
    offer.type === 'paid' &&
    isOfferTypePriceValid(offer.type, offer.price) &&
    offer.serviceMode !== null
  );
}

/**
 * Gemeinsame Kandidatenlogik für dynamische Quizoptionen und finales Matching.
 * Fehlende Kriterien werden noch nicht gefiltert; unvollständig klassifizierte
 * Angebote gelten trotzdem nie als belastbarer Kandidat.
 */
export function getCandidateOffers(
  trainer: MatchingTrainer,
  criteria: PartialMatchingCriteria
) {
  if (criteria.experience && !trainer.targetLevels.includes(criteria.experience)) return [];
  if (criteria.goal && !trainer.specialties.includes(criteria.goal)) return [];

  return trainer.offers.filter(
    (offer) =>
      isQualifyingMatchingOffer(offer) &&
      (!criteria.mode || offerSupportsMode(offer.serviceMode, criteria.mode))
  );
}

export function getAvailableExperienceLevels(trainers: MatchingTrainer[]) {
  return EXPERIENCE_LEVELS.filter((experience) =>
    trainers.some(
      (trainer) =>
        trainer.specialties.length > 0 &&
        getCandidateOffers(trainer, { experience }).length > 0
    )
  );
}

export function getAvailableGoals(
  trainers: MatchingTrainer[],
  experience: ExperienceLevel | ''
) {
  if (!experience) return [];

  const goals = new Set<string>();
  for (const trainer of trainers) {
    if (getCandidateOffers(trainer, { experience }).length === 0) continue;
    for (const specialty of trainer.specialties) goals.add(specialty);
  }
  return [...goals];
}

export function getAvailableServiceModes(
  trainers: MatchingTrainer[],
  criteria: Pick<DynamicMatchingAnswers, 'experience' | 'goal'>
) {
  if (!criteria.experience || !criteria.goal) return [];

  return SERVICE_MODES.filter((mode) =>
    trainers.some(
      (trainer) =>
        getCandidateOffers(trainer, {
          experience: criteria.experience || null,
          goal: criteria.goal,
          mode,
        }).length > 0
    )
  );
}

/** Erhält gültige Folgeantworten und entfernt nur fachlich ungültig gewordene Werte. */
export function reconcileDynamicMatchingAnswers<T extends DynamicMatchingAnswers>(
  trainers: MatchingTrainer[],
  answers: T
): T {
  const availableGoals = new Set(getAvailableGoals(trainers, answers.experience));
  const goal = answers.goal && availableGoals.has(answers.goal) ? answers.goal : '';
  const availableModes = getAvailableServiceModes(trainers, {
    experience: answers.experience,
    goal,
  });
  const mode = answers.mode && availableModes.includes(answers.mode) ? answers.mode : '';

  return { ...answers, goal, mode };
}

export function compareOfferPrice(
  offer: MatchingOffer,
  sessionsPerMonth: number | null,
  monthlyBudget: number | null
): PriceComparison {
  if (offer.type === 'discovery') {
    return {
      monthlyCost: null,
      unitPrice: null,
      withinBudget: null,
      label: 'Kostenloses Erstgespräch',
      explanation: 'Das Erstgespräch wird nicht als laufende Trainingskosten gerechnet.',
    };
  }

  if (
    offer.price === null ||
    !Number.isFinite(offer.price) ||
    offer.price <= 0 ||
    !offer.pricingModel
  ) {
    return {
      monthlyCost: null,
      unitPrice: null,
      withinBudget: null,
      label: 'Nicht eindeutig berechenbar',
      explanation: 'Preis oder Abrechnungsmodell ist noch nicht vollständig hinterlegt.',
    };
  }

  if (offer.pricingModel === 'single_session') {
    if (
      sessionsPerMonth === null ||
      !Number.isFinite(sessionsPerMonth) ||
      sessionsPerMonth <= 0 ||
      monthlyBudget === null ||
      monthlyBudget <= 0
    ) {
      return {
        monthlyCost: null,
        unitPrice: offer.price,
        withinBudget: null,
        label: `${euro(offer.price)} pro Einheit`,
        explanation: 'Ohne gültige Angaben zu Einheiten und Monatsbudget ist kein Monatsvergleich möglich.',
      };
    }
    const monthlyCost = offer.price * sessionsPerMonth;
    return {
      monthlyCost,
      unitPrice: offer.price,
      withinBudget: monthlyCost <= monthlyBudget,
      label: `${euro(monthlyCost)} pro Monat`,
      explanation: `${sessionsPerMonth} Einheiten × ${euro(offer.price)} pro Einheit.`,
    };
  }

  if (offer.pricingModel === 'monthly') {
    if (monthlyBudget === null || monthlyBudget <= 0) {
      return {
        monthlyCost: offer.price,
        unitPrice: null,
        withinBudget: null,
        label: `${euro(offer.price)} pro Monat`,
        explanation: 'Ohne gültiges Monatsbudget ist kein Budgetvergleich möglich; enthaltene Einheiten sind nicht hinterlegt.',
      };
    }
    return {
      monthlyCost: offer.price,
      unitPrice: null,
      withinBudget: offer.price <= monthlyBudget,
      label: `${euro(offer.price)} pro Monat`,
      explanation: 'Monatliche Pauschale; der Umfang der enthaltenen Einheiten ist nicht hinterlegt.',
    };
  }

  const included = offer.includedSessions;
  if (!included || !Number.isFinite(included) || !Number.isInteger(included) || included <= 0) {
    return {
      monthlyCost: null,
      unitPrice: null,
      withinBudget: null,
      label: `${euro(offer.price)} Paketpreis`,
      explanation: 'Die Zahl der enthaltenen Einheiten fehlt; ein Monatsvergleich ist deshalb nicht möglich.',
    };
  }

  const unitPrice = offer.price / included;
  return {
    monthlyCost: null,
    unitPrice,
    withinBudget: null,
    label: `${euro(offer.price)} für ${included} Einheiten`,
    explanation: `${euro(unitPrice)} je Einheit · Laufzeit nicht hinterlegt.`,
  };
}

export function getMatchingOffers(trainer: MatchingTrainer, answers: MatchingAnswers) {
  return getCandidateOffers(trainer, answers);
}

function hasCompleteBudgetAnswers(answers: MatchingAnswers) {
  return (
    answers.sessionsPerMonth !== null &&
    Number.isFinite(answers.sessionsPerMonth) &&
    answers.sessionsPerMonth > 0 &&
    answers.monthlyBudget !== null &&
    answers.monthlyBudget > 0
  );
}

function compareTrainerOrder<T extends MatchingTrainer>(
  a: { trainer: T; sourceIndex: number },
  b: { trainer: T; sourceIndex: number }
) {
  return (
    (a.trainer.name ?? '').localeCompare(b.trainer.name ?? '', 'de') ||
    a.sourceIndex - b.sourceIndex
  );
}

/** Trennt fachlich qualifizierte Trainer eindeutig in exakte Treffer und Alternativen. */
export function partitionMatchingTrainers<T extends MatchingTrainer>(
  trainers: T[],
  answers: MatchingAnswers
): MatchingGroups<T> {
  if (!hasCompleteBudgetAnswers(answers)) return { exact: [], alternatives: [] };

  const seenTrainerIds = new Set<string>();
  const uniqueTrainers = trainers.filter((trainer) => {
    if (seenTrainerIds.has(trainer.id)) return false;
    seenTrainerIds.add(trainer.id);
    return true;
  });

  const evaluated = uniqueTrainers.map((trainer, sourceIndex) => {
    const offers = getMatchingOffers(trainer, answers).map((offer) => ({
      offer,
      comparison: compareOfferPrice(offer, answers.sessionsPerMonth, answers.monthlyBudget),
    }));
    const exactOffers = offers.filter(({ comparison }) => comparison.withinBudget === true);
    const alternativeOffers = offers.flatMap<AlternativeMatchingOffer>(({ offer, comparison }) => {
      if (comparison.withinBudget === false && comparison.monthlyCost !== null) {
        return [{
          offer,
          comparison,
          reason: {
            type: 'budget_exceeded' as const,
            amount: comparison.monthlyCost - answers.monthlyBudget!,
          },
        }];
      }
      if (
        offer.pricingModel === 'package' &&
        offer.price !== null &&
        Number.isFinite(offer.price) &&
        offer.price > 0 &&
        offer.includedSessions !== null &&
        Number.isFinite(offer.includedSessions) &&
        Number.isInteger(offer.includedSessions) &&
        offer.includedSessions > 0 &&
        comparison.unitPrice !== null
      ) {
        return [{
          offer,
          comparison,
          reason: {
            type: 'package_not_monthly_comparable' as const,
            totalPrice: offer.price,
            includedSessions: offer.includedSessions,
            unitPrice: comparison.unitPrice,
          },
        }];
      }
      return [];
    });

    return { trainer, sourceIndex, exactOffers, alternativeOffers };
  });

  const exactIds = new Set(
    evaluated.filter(({ exactOffers }) => exactOffers.length > 0).map(({ trainer }) => trainer.id)
  );

  const exact = evaluated
    .filter(({ exactOffers }) => exactOffers.length > 0)
    .sort(compareTrainerOrder)
    .map(({ trainer, exactOffers: offers }) => ({ trainer, offers }));

  const alternatives = evaluated
    .filter(
      ({ trainer, alternativeOffers }) =>
        !exactIds.has(trainer.id) && alternativeOffers.length > 0
    )
    .sort((a, b) => {
      const reasonRank = (offers: AlternativeMatchingOffer[]) =>
        offers.some(({ reason }) => reason.type === 'package_not_monthly_comparable') ? 0 : 1;
      const smallestOverrun = (offers: AlternativeMatchingOffer[]) =>
        Math.min(
          ...offers.flatMap(({ reason }) =>
            reason.type === 'budget_exceeded' ? [reason.amount] : []
          ),
          Number.POSITIVE_INFINITY
        );
      return (
        reasonRank(a.alternativeOffers) - reasonRank(b.alternativeOffers) ||
        smallestOverrun(a.alternativeOffers) - smallestOverrun(b.alternativeOffers) ||
        compareTrainerOrder(a, b)
      );
    })
    .slice(0, 3)
    .map(({ trainer, alternativeOffers: offers }) => ({ trainer, offers }));

  return { exact, alternatives };
}

/** Rückwärtskompatible Gesamtrangliste: exakte Treffer vor höchstens drei Alternativen. */
export function rankMatchingTrainers<T extends MatchingTrainer>(trainers: T[], answers: MatchingAnswers) {
  const { exact, alternatives } = partitionMatchingTrainers(trainers, answers);
  return [...exact, ...alternatives];
}
