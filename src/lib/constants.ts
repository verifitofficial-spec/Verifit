export type SpecialtyCategory = { category: string; items: string[] };

/**
 * Einzige Quelle der Wahrheit für Fachgebiete.
 * Das Trainer-Dashboard (Kernkompetenzen) und das Matching-Quiz nutzen exakt diese Liste.
 */
export const SPECIALTY_CATEGORIES: SpecialtyCategory[] = [
  {
    category: 'Muskelaufbau & Kraft',
    items: ['Muskelaufbau', 'Hypertrophie', 'Krafttraining', 'Ganzkörpertraining'],
  },
  {
    category: 'Abnehmen & Transformation',
    items: ['Gewichtsverlust', 'Fettabbau', 'Body-Transformation', 'Ernährungsberatung', 'Stoffwechseloptimierung'],
  },
  {
    category: 'Gesundheit & Prävention',
    items: [
      'Reha & Prävention',
      'Rückentraining',
      'Körperhaltung & Core',
      'Mobility & Stretching',
      'Gesundheitsorientiertes Krafttraining',
      'Seniorenfitness',
      'Pränatales Training',
      'Postnatales Training',
      'Stressabbau & Entspannung',
      'Yogalates & Core',
    ],
  },
  {
    category: 'Performance & Athletik',
    items: [
      'Athletiktraining',
      'Leistungsdiagnostik',
      'Functional Training',
      'HIIT & Cardio',
      'Lauftraining & Ausdauer',
      'Sportartspezifisches Training',
    ],
  },
];

export const AVAILABLE_SPECIALTIES: string[] = SPECIALTY_CATEGORIES.flatMap((c) => c.items).sort((a, b) =>
  a.localeCompare(b, 'de')
);

/** Das Quiz zeigt dieselben Kategorien wie das Trainer-Dashboard. */
export const QUIZ_GOAL_BLOCKS: SpecialtyCategory[] = SPECIALTY_CATEGORIES;

const CANONICAL_BY_LOWER = new Map(AVAILABLE_SPECIALTIES.map((s) => [s.toLowerCase(), s]));

/** Alte Bezeichnungen aus bestehenden Trainerprofilen werden auf die neue Liste abgebildet. */
const LEGACY_SPECIALTY_MAP: Record<string, string> = {
  rehabilitation: 'Reha & Prävention',
  reha: 'Reha & Prävention',
  mobilität: 'Mobility & Stretching',
  mobility: 'Mobility & Stretching',
  'functional fitness': 'Functional Training',
  gewichtsmanagement: 'Gewichtsverlust',
  abnehmen: 'Gewichtsverlust',
  transformation: 'Body-Transformation',
  ausdauer: 'Lauftraining & Ausdauer',
  lauftraining: 'Lauftraining & Ausdauer',
  laufen: 'Lauftraining & Ausdauer',
};

export function normalizeSpecialty(value: string): string {
  const trimmed = value.trim();
  const key = trimmed.toLowerCase();
  return CANONICAL_BY_LOWER.get(key) ?? LEGACY_SPECIALTY_MAP[key] ?? trimmed;
}

/** Wandelt den kommagetrennten DB-String (oder ein Array) in eine bereinigte, eindeutige Liste um. */
export function parseSpecialties(value: string | string[] | null | undefined): string[] {
  const parts = Array.isArray(value) ? value : (value ?? '').split(',');
  const result: string[] = [];
  for (const part of parts) {
    const normalized = normalizeSpecialty(part);
    if (normalized && !result.includes(normalized)) result.push(normalized);
  }
  return result;
}

export const normalizeSpecialties = parseSpecialties;

export function isKnownSpecialty(value: string): boolean {
  return CANONICAL_BY_LOWER.has(value.trim().toLowerCase());
}
