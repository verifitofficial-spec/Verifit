export type TrendPoint = { label: string; value: number | null };

export type TrackingMetricKey = 'weight' | 'calories' | 'water' | 'sleep' | 'mood' | 'health' | 'motivation';

export type TrackingMetric = {
  key: TrackingMetricKey;
  title: string;
  inputLabel: string;
  unit: string;
  color: string;
  decimals: number;
  step: string;
  placeholder: string;
  integer: boolean;
  min?: number;
  max?: number;
};

export const TRACKING_METRICS: TrackingMetric[] = [
  { key: 'weight', title: 'Gewicht', inputLabel: 'Gewicht (kg)', unit: 'kg', color: '#34d399', decimals: 1, step: '0.1', placeholder: 'z.B. 78.5', integer: false },
  { key: 'calories', title: 'Kalorien', inputLabel: 'Kalorien (kcal)', unit: 'kcal', color: '#fbbf24', decimals: 0, step: '1', placeholder: 'z.B. 2200', integer: true },
  { key: 'water', title: 'Wasser', inputLabel: 'Wasseraufnahme (Liter)', unit: 'L', color: '#38bdf8', decimals: 1, step: '0.1', placeholder: 'z.B. 3.0', integer: false },
  { key: 'sleep', title: 'Schlaf', inputLabel: 'Schlaf (Stunden)', unit: 'h', color: '#a78bfa', decimals: 1, step: '0.5', placeholder: 'z.B. 7.5', integer: false },
  { key: 'mood', title: 'Laune', inputLabel: 'Laune / Wohlbefinden (1 - 10)', unit: '/10', color: '#f472b6', decimals: 0, step: '1', placeholder: 'z.B. 8', integer: true, min: 1, max: 10 },
  { key: 'health', title: 'Gesundheit', inputLabel: 'Gesundheitszustand (1 - 10)', unit: '/10', color: '#f87171', decimals: 0, step: '1', placeholder: 'z.B. 9', integer: true, min: 1, max: 10 },
  { key: 'motivation', title: 'Motivation', inputLabel: 'Motivation (1 - 10)', unit: '/10', color: '#fb923c', decimals: 0, step: '1', placeholder: 'z.B. 7', integer: true, min: 1, max: 10 },
];

export type TrackingEntry = { id: string; created_at: string } & Record<TrackingMetricKey, number | null>;

export const RANGE_OPTIONS = [
  { key: 'week', label: '7 Tage', days: 7 },
  { key: 'month', label: '30 Tage', days: 30 },
  { key: 'quarter', label: '90 Tage', days: 90 },
  { key: 'year', label: '1 Jahr', days: 365 },
] as const;

export type RangeKey = (typeof RANGE_OPTIONS)[number]['key'];

/** Baut für eine Kennzahl die zeitlich sortierte Punktreihe der letzten `days` Tage. */
export function buildSeries(entries: TrackingEntry[], key: TrackingMetricKey, days: number): TrendPoint[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return entries
    .filter((entry) => new Date(entry.created_at).getTime() >= cutoff)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((entry) => ({
      label: new Date(entry.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      value: entry[key] === null || entry[key] === undefined ? null : Number(entry[key]),
    }));
}
