'use client';

import { Plus, Trash2 } from 'lucide-react';
import { sumItems } from '@/lib/trainer-dashboard/utils';
import type { Food, Meal, MealActions } from '@/lib/trainer-dashboard/types';
import MealItemRow from './MealItemRow';

interface Props {
  meal: Meal;
  mealIndex: number;
  foods: Food[];
  actions: MealActions;
}

export default function MealCard({ meal, mealIndex, foods, actions }: Props) {
  const total = sumItems(meal.items);

  return (
    <div className="bg-canvas border border-line rounded-xl overflow-hidden">
      <div className="bg-surface/80 px-4 py-3 flex flex-wrap gap-3 justify-between items-center border-b border-line">
        <div className="flex items-center gap-3 flex-1">
          <input
            type="time"
            value={meal.time}
            onChange={(e) => actions.changeMealField(mealIndex, 'time', e.target.value)}
            className="bg-canvas border border-line-strong rounded text-xs px-2 py-1 text-ink-soft focus:outline-none focus:border-accent"
          />
          <input
            type="text"
            value={meal.title}
            onChange={(e) => actions.changeMealField(mealIndex, 'title', e.target.value)}
            placeholder="Mahlzeit Name..."
            className="bg-transparent font-bold text-sm text-accent focus:outline-none placeholder:text-ink-muted flex-1"
          />
        </div>
        <div className="flex items-center gap-4 text-[10px] font-bold text-ink-muted bg-canvas px-3 py-1.5 rounded-lg border border-line">
          <span className="text-accent">{Math.round(total.kcal)} kcal</span>
          <span>P: {total.protein.toFixed(1)}g</span>
          <span>C: {total.carbs.toFixed(1)}g</span>
          <span>F: {total.fat.toFixed(1)}g</span>
          <button
            type="button"
            onClick={() => actions.removeMeal(mealIndex)}
            className="ml-2 text-ink-muted hover:text-danger transition cursor-pointer"
            title="Mahlzeit löschen"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <div className="hidden sm:grid grid-cols-12 gap-2 px-2 text-[9px] font-bold text-ink-muted uppercase tracking-wider">
          <div className="col-span-5">Lebensmittel-Suche</div>
          <div className="col-span-2">Menge (g)</div>
          <div className="col-span-1 text-right">Kcal</div>
          <div className="col-span-1 text-right">P</div>
          <div className="col-span-1 text-right">C</div>
          <div className="col-span-1 text-right">F</div>
          <div className="col-span-1 text-center">Aktion</div>
        </div>

        {meal.items.map((item, itemIndex) => (
          <MealItemRow
            key={`item-${mealIndex}-${itemIndex}`}
            item={item}
            mealIndex={mealIndex}
            itemIndex={itemIndex}
            foods={foods}
            actions={actions}
          />
        ))}

        <button
          type="button"
          onClick={() => actions.addItem(mealIndex)}
          className="w-full bg-surface/50 hover:bg-surface border border-line border-dashed text-ink-muted hover:text-accent py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
        >
          <Plus size={12} /> Zutat hinzufügen
        </button>
      </div>
    </div>
  );
}
