'use client';

import { useId } from 'react';
import type { TrendPoint } from '@/lib/trackingMetrics';

type Props = {
  title: string;
  unit?: string;
  color?: string;
  points: TrendPoint[];
  decimals?: number;
  fixedMin?: number;
  fixedMax?: number;
};

const W = 320;
const H = 130;
const PAD_L = 34;
const PAD_R = 10;
const PAD_T = 12;
const PAD_B = 24;

export default function TrendChart({ title, unit = '', color = '#34d399', points, decimals = 1, fixedMin, fixedMax }: Props) {
  const gradientId = `grad-${useId().replace(/:/g, '')}`;
  const valid = points.filter((p): p is { label: string; value: number } => p.value !== null && Number.isFinite(p.value));

  if (valid.length === 0) {
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
        <p className="text-xs font-bold text-slate-300">{title}</p>
        <p className="text-[11px] text-slate-500 mt-6 mb-6 text-center">Noch keine Werte im gewählten Zeitraum.</p>
      </div>
    );
  }

  const values = valid.map((p) => p.value);
  let min = fixedMin ?? Math.min(...values);
  let max = fixedMax ?? Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  } else if (fixedMin === undefined && fixedMax === undefined) {
    const pad = (max - min) * 0.12;
    min -= pad;
    max += pad;
  }

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const x = (i: number) => (valid.length === 1 ? PAD_L + plotW / 2 : PAD_L + (i * plotW) / (valid.length - 1));
  const y = (v: number) => PAD_T + (1 - (v - min) / (max - min)) * plotH;

  const line = valid.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(valid.length - 1).toFixed(1)} ${H - PAD_B} L${x(0).toFixed(1)} ${H - PAD_B} Z`;
  const ticks = [max, (max + min) / 2, min];

  const latest = valid[valid.length - 1].value;
  const average = values.reduce((sum, v) => sum + v, 0) / values.length;
  const delta = valid.length > 1 ? latest - valid[0].value : null;
  const fmt = (v: number) => v.toFixed(decimals);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-slate-300">{title}</p>
          <p className="text-lg font-black" style={{ color }}>
            {fmt(latest)} <span className="text-[11px] font-semibold text-slate-500">{unit}</span>
          </p>
        </div>
        <div className="text-right text-[10px] text-slate-500 leading-4">
          <p>
            Ø {fmt(average)} {unit}
          </p>
          {delta !== null && (
            <p className={delta === 0 ? 'text-slate-500' : 'text-slate-300'}>
              {delta > 0 ? '+' : ''}
              {fmt(delta)} {unit} im Zeitraum
            </p>
          )}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Verlauf ${title}`} className="w-full h-auto">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(tick)} y2={y(tick)} stroke="#1e293b" strokeWidth="1" />
            <text x={PAD_L - 5} y={y(tick) + 3} textAnchor="end" fontSize="9" fill="#64748b">
              {fmt(tick)}
            </text>
          </g>
        ))}

        {valid.length > 1 && <path d={area} fill={`url(#${gradientId})`} />}
        {valid.length > 1 && (
          <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        )}

        {valid.map((p, i) => (
          <circle key={`${p.label}-${i}`} cx={x(i)} cy={y(p.value)} r="3" fill="#020617" stroke={color} strokeWidth="2">
            <title>{`${p.label}: ${fmt(p.value)} ${unit}`}</title>
          </circle>
        ))}

        <text x={PAD_L} y={H - 6} fontSize="9" fill="#64748b">
          {valid[0].label}
        </text>
        {valid.length > 1 && (
          <text x={W - PAD_R} y={H - 6} textAnchor="end" fontSize="9" fill="#64748b">
            {valid[valid.length - 1].label}
          </text>
        )}
      </svg>
    </div>
  );
}
