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
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Vorgaben (Klick zum Überschreiben des Editors):
        </span>
        <div className="flex flex-wrap gap-2">
          {defaults.map((name, index) => (
            <button
              key={`default-${index}`}
              type="button"
              onClick={() => onSelectDefault(index)}
              className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-800/80 pt-4 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <Icon size={14} /> {customLabel}
          </span>
          <button
            type="button"
            onClick={onAdd}
            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
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
              className={`flex items-center bg-slate-950/80 border rounded-lg overflow-hidden transition cursor-grab active:cursor-grabbing ${
                index === activeIndex ? 'border-emerald-500 shadow-md shadow-emerald-500/10' : 'border-slate-800'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(index)}
                className={`px-3 py-1.5 text-xs font-bold transition ${
                  index === activeIndex ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                {name}
              </button>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="px-2 py-1.5 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
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
