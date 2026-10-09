import type { Food, MealItem, ScheduleMap } from './types';

/* ---------- Kalender ---------- */

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Anzahl leerer Felder vor dem 1. des Monats (Woche beginnt am Montag). */
export function getFirstWeekdayOffset(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function todayDateStr(): string {
  return new Date().toLocaleDateString('en-CA');
}

export function formatDateDE(date: string): string {
  return date.split('-').reverse().join('.');
}

/* ---------- Pläne ---------- */

export function renameInSchedule(schedule: ScheduleMap, oldName: string, newName: string): ScheduleMap {
  return Object.fromEntries(
    Object.entries(schedule).map(([date, name]) => [date, name === oldName ? newName : name])
  );
}

export function removeFromSchedule(schedule: ScheduleMap, templateName: string): ScheduleMap {
  return Object.fromEntries(Object.entries(schedule).filter(([, name]) => name !== templateName));
}

export function hasDuplicates(names: string[]): boolean {
  return new Set(names.map((n) => n.trim().toLowerCase())).size !== names.length;
}

/* ---------- Ernährung ---------- */

export function scaleFood(food: Food, grams: number) {
  const factor = grams / 100;
  return {
    calories: String(Math.round((Number(food.kcal) || 0) * factor)),
    protein: ((Number(food.protein) || 0) * factor).toFixed(1),
    carbs: ((Number(food.carbs) || 0) * factor).toFixed(1),
    fat: ((Number(food.fat) || 0) * factor).toFixed(1),
  };
}

export function sumItems(items: MealItem[]) {
  return items.reduce(
    (total, item) => ({
      kcal: total.kcal + (parseFloat(item.calories) || 0),
      protein: total.protein + (parseFloat(item.protein) || 0),
      carbs: total.carbs + (parseFloat(item.carbs) || 0),
      fat: total.fat + (parseFloat(item.fat) || 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function findFoodForItem(foods: Food[], item: MealItem): Food | undefined {
  return (
    foods.find((f) => f.id === item.foodId) ??
    foods.find((f) => f.name.toLowerCase() === item.foodSearchInput.trim().toLowerCase())
  );
}
