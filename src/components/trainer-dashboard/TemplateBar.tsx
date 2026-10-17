'use client';

import { Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  defaults: string[];
  customs: string[];
  activeIndex: number;
  icon: LucideIcon;
  customLabel: string;
  addLabel: string;
  removeTitle: string;
  onSelectDefault: (index: number) => void;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}

export default function TemplateBar({
  defaults,
  customs,
  activeIndex,
  icon: Icon,
  customLabel,
  addLabel,
  removeTitle,
  onSelectDefault,
  onSelect,
  onRemove,
  onAdd,
}: Props) {
  return (
    <>
      <div className="space-y-2">
        <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
          Vorgaben (Klick zum Überschreiben des Editors):
        </span>
        <div className="flex flex-wrap gap-2">
          {defaults.map((name, index) => (
            <button
              key={`default-${index}`}
              type="button"
              onClick={() => onSelectDefault(index)}
              className="bg-surface border border-line hover:border-accent/65 text-ink-soft hover:text-accent px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-line/80 pt-4 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <span className="text-xs font-semibold text-accent uppercase tracking-wider flex items-center gap-2">
            <Icon size={14} /> {customLabel}
          </span>
          <button
            type="button"
            onClick={onAdd}
            className="bg-accent-soft hover:bg-accent-soft text-accent border border-accent/45 px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <Plus size={12} /> {addLabel}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {customs.map((name, index) => (
            <div
              key={`custom-${index}`}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', name)}
              className={`flex items-center bg-canvas/80 border rounded-lg overflow-hidden transition cursor-grab active:cursor-grabbing ${
                index === activeIndex ? 'border-accent shadow-sm' : 'border-line'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(index)}
                className={`px-3 py-1.5 text-xs font-bold transition ${
                  index === activeIndex ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {name}
              </button>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="px-2 py-1.5 text-danger/50 hover:text-danger hover:bg-danger-soft transition cursor-pointer"
                title={removeTitle}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
