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
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
      <div className="bg-slate-900/80 px-4 py-3 flex flex-wrap gap-3 justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-3 flex-1">
          <input
            type="time"
            value={meal.time}
            onChange={(e) => actions.changeMealField(mealIndex, 'time', e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded text-xs px-2 py-1 text-slate-300 focus:outline-none focus:border-emerald-500"
          />
          <input
            type="text"
            value={meal.title}
            onChange={(e) => actions.changeMealField(mealIndex, 'title', e.target.value)}
            placeholder="Mahlzeit Name..."
            className="bg-transparent font-bold text-sm text-emerald-400 focus:outline-none placeholder:text-slate-600 flex-1"
          />
        </div>
        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <span className="text-emerald-400">{Math.round(total.kcal)} kcal</span>
          <span>P: {total.protein.toFixed(1)}g</span>
          <span>C: {total.carbs.toFixed(1)}g</span>
          <span>F: {total.fat.toFixed(1)}g</span>
          <button
            type="button"
            onClick={() => actions.removeMeal(mealIndex)}
            className="ml-2 text-slate-500 hover:text-red-400 transition cursor-pointer"
            title="Mahlzeit löschen"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <div className="hidden sm:grid grid-cols-12 gap-2 px-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
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
          className="w-full bg-slate-900/50 hover:bg-slate-900 border border-slate-800 border-dashed text-slate-400 hover:text-emerald-400 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
        >
          <Plus size={12} /> Zutat hinzufügen
        </button>
      </div>
    </div>
  );
}
