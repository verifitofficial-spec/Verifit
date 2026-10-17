'use client';

import { Plus } from 'lucide-react';
import type { Food, MacroField, MealActions, NutritionTemplate } from '@/lib/trainer-dashboard/types';
import MealCard from './MealCard';
import { smallInputClass } from './ui';

interface Props {
  template: NutritionTemplate;
  foods: Food[];
  mealActions: MealActions;
  onRename: (value: string) => void;
  onChangeMacro: (field: MacroField, value: string) => void;
  onAddMeal: () => void;
}

const MACRO_FIELDS: { field: MacroField; label: string; className: string }[] = [
  { field: 'targetCalories', label: 'Kcal Ziel', className: 'text-accent font-black' },
  { field: 'targetProtein', label: 'Protein (g)', className: 'text-ink font-bold' },
  { field: 'targetCarbs', label: 'Kohlenhydrate (g)', className: 'text-ink font-bold' },
  { field: 'targetFat', label: 'Fett (g)', className: 'text-ink font-bold' },
  { field: 'waterIntake', label: 'Wasser (L)', className: 'text-info font-bold' },
];

export default function NutritionTemplateEditor({
  template,
  foods,
  mealActions,
  onRename,
  onChangeMacro,
  onAddMeal,
}: Props) {
  return (
    <div className="bg-surface/50 rounded-xl border border-line p-4 sm:p-5 space-y-6 relative">
      <div>
        <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
          Template-Name (erscheint im Kalender)
        </label>
        <input
          type="text"
          value={template.templateName}
          onChange={(e) => onRename(e.target.value)}
          className={smallInputClass}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-canvas/80 p-4 rounded-xl border border-line">
        {MACRO_FIELDS.map(({ field, label, className }) => (
          <div key={field}>
            <span className="block text-[9px] font-bold text-ink-muted uppercase">{label}</span>
            <input
              type="text"
              value={template[field]}
              onChange={(e) => onChangeMacro(field, e.target.value)}
              className={`w-full bg-transparent border-b border-line-strong text-sm focus:outline-none focus:border-accent ${className}`}
            />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider">Mahlzeiten</h4>
        {template.meals.map((meal, mealIndex) => (
          <MealCard key={`m-${mealIndex}`} meal={meal} mealIndex={mealIndex} foods={foods} actions={mealActions} />
        ))}
        <button
          type="button"
          onClick={onAddMeal}
          className="w-full bg-accent-soft hover:bg-accent-soft border border-accent/45 text-accent py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer mt-4"
        >
          <Plus size={14} /> Neue Mahlzeit-Box hinzufügen
        </button>
      </div>
    </div>
  );
}
