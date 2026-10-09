'use client';

import { Trash2 } from 'lucide-react';
import type { Food, MealActions, MealItem } from '@/lib/trainer-dashboard/types';

interface Props {
  item: MealItem;
  mealIndex: number;
  itemIndex: number;
  foods: Food[];
  actions: MealActions;
}

const MAX_SUGGESTIONS = 30;

export default function MealItemRow({ item, mealIndex, itemIndex, foods, actions }: Props) {
  const search = item.foodSearchInput.trim().toLowerCase();
  const showDropdown = search.length > 0 && !item.foodId;
  const suggestions = showDropdown
    ? foods.filter((f) => f.name.toLowerCase().includes(search)).slice(0, MAX_SUGGESTIONS)
    : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-900/50 p-2 rounded-lg relative">
      <div className="sm:col-span-5 relative">
        <label className="sm:hidden block text-[9px] font-bold text-slate-500 uppercase mb-1">Lebensmittel</label>
        <input
          type="text"
          value={item.foodSearchInput}
          onChange={(e) => actions.changeSearch(mealIndex, itemIndex, e.target.value)}
          placeholder="Suchen... (z.B. Haferflocken)"
          className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
        />
        {suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-xl max-h-40 overflow-y-auto">
            {suggestions.map((food) => (
              <button
                key={food.id}
                type="button"
                onClick={() => actions.selectFood(mealIndex, itemIndex, food)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-500/20 hover:text-emerald-300 border-b border-slate-700/50 last:border-0"
              >
                {food.name} <span className="text-[10px] text-slate-400">({food.kcal} kcal/100g)</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="sm:col-span-2 flex items-center gap-2">
        <label className="sm:hidden w-16 text-[9px] font-bold text-slate-500 uppercase">Menge (g)</label>
        <input
          type="number"
          min="0"
          value={item.grams}
          onChange={(e) => actions.changeGrams(mealIndex, itemIndex, e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-center text-white focus:outline-none focus:border-emerald-500"
        />
      </div>

      {[
        { label: 'Kcal', value: item.calories, className: 'font-bold text-emerald-400' },
        { label: 'Protein', value: item.protein, className: 'text-slate-300' },
        { label: 'Carbs', value: item.carbs, className: 'text-slate-300' },
        { label: 'Fett', value: item.fat, className: 'text-slate-300' },
      ].map((cell) => (
        <div key={cell.label} className="sm:col-span-1 flex justify-between sm:block text-right">
          <span className="sm:hidden text-[9px] font-bold text-slate-500 uppercase">{cell.label}</span>
          <span className={`text-xs ${cell.className}`}>{cell.value || 0}</span>
        </div>
      ))}

      <div className="sm:col-span-1 flex justify-end sm:justify-center">
        <button
          type="button"
          onClick={() => actions.removeItem(mealIndex, itemIndex)}
          className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
          title="Zutat entfernen"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
