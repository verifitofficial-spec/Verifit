'use client';

import { SPECIALTY_CATEGORIES, isKnownSpecialty } from '@/lib/constants';

type Props = {
  selected: string[];
  disabled?: boolean;
  onToggle: (specialty: string) => void | Promise<void>;
};

/** Zeigt exakt die Kategorien des Matching-Quiz. Auswahl wirkt direkt auf das Quiz-Matching. */
export default function SpecialtyPicker({ selected, disabled = false, onToggle }: Props) {
  const legacy = selected.filter((s) => !isKnownSpecialty(s));

  return (
    <div className="space-y-5">
      {legacy.length > 0 && (
        <div className="p-3 rounded-xl border border-warning-line bg-warning-soft text-xs text-warning">
          Diese Einträge sind nicht Teil der Quiz-Kategorien und werden im Matching nicht gefunden:{' '}
          <strong>{legacy.join(', ')}</strong>. Bitte entferne sie und wähle passende Fachgebiete unten aus.
        </div>
      )}

      {SPECIALTY_CATEGORIES.map((block) => {
        const count = block.items.filter((item) => selected.includes(item)).length;
        return (
          <div key={block.category} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft">{block.category}</h3>
              {count > 0 && <span className="text-[10px] text-accent font-semibold">{count} gewählt</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {block.items.map((item) => {
                const isSelected = selected.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={disabled}
                    onClick={() => onToggle(item)}
                    className={`flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-60 ${
                      isSelected
                        ? 'bg-accent-soft border-accent text-accent'
                        : 'cursor-pointer bg-surface border-line-strong text-ink-soft hover:border-accent hover:text-ink'
                    }`}
                  >
                    <span>{item}</span>
                    {isSelected && <span className="text-[10px] text-accent font-bold">✓</span>}
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
