'use client';

import { SPECIALTY_CATEGORIES, isKnownSpecialty } from '@/lib/constants';

type Props = {
  selected: string[];
  onToggle: (specialty: string) => void | Promise<void>;
};

/** Zeigt exakt die Kategorien des Matching-Quiz. Auswahl wirkt direkt auf das Quiz-Matching. */
export default function SpecialtyPicker({ selected, onToggle }: Props) {
  const legacy = selected.filter((s) => !isKnownSpecialty(s));

  return (
    <div className="space-y-5">
      {selected.length > 0 && (
        <div className="p-3.5 bg-slate-950/80 rounded-xl border border-emerald-500/30 space-y-2">
          <span className="block text-[10px] uppercase tracking-wider font-bold text-emerald-400">
            Bereits ausgewählt ({selected.length}):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {selected.map((spec) => (
              <span
                key={`selected-${spec}`}
                className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-lg text-xs font-medium"
              >
                {spec}
                <button
                  type="button"
                  onClick={() => onToggle(spec)}
                  className="hover:text-white font-bold text-sm leading-none cursor-pointer"
                  title="Entfernen"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {legacy.length > 0 && (
        <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300">
          Diese Einträge sind nicht Teil der Quiz-Kategorien und werden im Matching nicht gefunden:{' '}
          <strong>{legacy.join(', ')}</strong>. Bitte entferne sie und wähle passende Fachgebiete unten aus.
        </div>
      )}

      {SPECIALTY_CATEGORIES.map((block) => {
        const count = block.items.filter((item) => selected.includes(item)).length;
        return (
          <div key={block.category} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">{block.category}</h3>
              {count > 0 && <span className="text-[10px] text-emerald-400 font-semibold">{count} gewählt</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {block.items.map((item) => {
                const isSelected = selected.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onToggle(item)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span>{item}</span>
                    {isSelected && <span className="text-[10px] text-emerald-400 font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
