'use client';

import { useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import {
  DEFAULT_NUTRITION_TEMPLATES,
  DURATION_OPTIONS,
  createMeal,
  createMealItem,
  createNutritionTemplate,
} from '@/lib/trainer-dashboard/constants';
import {
  findFoodForItem,
  hasDuplicates,
  removeFromSchedule,
  renameInSchedule,
  scaleFood,
} from '@/lib/trainer-dashboard/utils';
import type {
  Feedback,
  Food,
  MacroField,
  Meal,
  MealActions,
  MealItem,
  NutritionTemplate,
  ScheduleMap,
} from '@/lib/trainer-dashboard/types';

export function useNutritionPlanner(trainerId: string, foods: Food[]) {
  const [clientId, setClientId] = useState('');
  const [mainTitle, setMainTitle] = useState('');
  const [duration, setDuration] = useState(DURATION_OPTIONS[1]);
  const [templates, setTemplates] = useState<NutritionTemplate[]>(() => [
    createNutritionTemplate('Standard Ernährungs-Tag'),
  ]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [schedule, setSchedule] = useState<ScheduleMap>({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const activeTemplate = templates[activeIndex] ?? templates[0];

  /* ---- unveränderliche Update-Helfer (kein Mutieren verschachtelter Objekte) ---- */
  const updateActive = (fn: (t: NutritionTemplate) => NutritionTemplate) =>
    setTemplates((prev) => prev.map((t, i) => (i === activeIndex ? fn(t) : t)));

  const updateMeal = (mealIndex: number, fn: (m: Meal) => Meal) =>
    updateActive((t) => ({ ...t, meals: t.meals.map((m, i) => (i === mealIndex ? fn(m) : m)) }));

  const updateItem = (mealIndex: number, itemIndex: number, fn: (item: MealItem) => MealItem) =>
    updateMeal(mealIndex, (m) => ({ ...m, items: m.items.map((it, i) => (i === itemIndex ? fn(it) : it)) }));

  /* ---- Templates ---- */
  function addTemplate() {
    setTemplates((prev) => [
      ...prev,
      createNutritionTemplate(`Eigenes Ernährungs-Template ${prev.length + 1}`, '08:00'),
    ]);
    setActiveIndex(templates.length);
  }

  function removeTemplate(index: number) {
    if (templates.length <= 1) {
      setFeedback({ type: 'error', text: 'Du musst mindestens ein eigenes Template behalten.' });
      return;
    }
    const removedName = templates[index].templateName;
    setTemplates((prev) => prev.filter((_, i) => i !== index));
    setActiveIndex(Math.max(0, index - 1));
    setSchedule((prev) => removeFromSchedule(prev, removedName));
  }

  function renameActive(value: string) {
    const oldName = activeTemplate?.templateName;
    updateActive((t) => ({ ...t, templateName: value }));
    if (oldName) setSchedule((prev) => renameInSchedule(prev, oldName, value));
  }

  function applyDefault(index: number) {
    const source = DEFAULT_NUTRITION_TEMPLATES[index];
    if (!source) return;
    const oldName = activeTemplate?.templateName;
    const clone: NutritionTemplate = JSON.parse(JSON.stringify({ ...source, isDefault: false }));
    updateActive(() => clone);
    if (oldName) setSchedule((prev) => renameInSchedule(prev, oldName, clone.templateName));
  }

  function changeMacro(field: MacroField, value: string) {
    updateActive((t) => ({ ...t, [field]: value }));
  }

  /* ---- Mahlzeiten ---- */
  function addMeal() {
    updateActive((t) => ({ ...t, meals: [...t.meals, createMeal()] }));
  }

  const mealActions: MealActions = {
    changeMealField: (mealIndex, field, value) => updateMeal(mealIndex, (m) => ({ ...m, [field]: value })),
    removeMeal: (mealIndex) => updateActive((t) => ({ ...t, meals: t.meals.filter((_, i) => i !== mealIndex) })),
    addItem: (mealIndex) => updateMeal(mealIndex, (m) => ({ ...m, items: [...m.items, createMealItem()] })),
    removeItem: (mealIndex, itemIndex) =>
      updateMeal(mealIndex, (m) => ({ ...m, items: m.items.filter((_, i) => i !== itemIndex) })),

    changeSearch: (mealIndex, itemIndex, value) =>
      updateItem(mealIndex, itemIndex, (item) => {
        const match = foods.find((f) => f.name.toLowerCase() === value.trim().toLowerCase());
        if (!match) return { ...item, foodSearchInput: value, foodId: '' };
        return {
          ...item,
          foodSearchInput: value,
          foodId: match.id,
          ...scaleFood(match, parseFloat(item.grams) || 100),
        };
      }),

    selectFood: (mealIndex, itemIndex, food) =>
      updateItem(mealIndex, itemIndex, (item) => ({
        ...item,
        foodId: food.id,
        foodSearchInput: food.name,
        ...scaleFood(food, parseFloat(item.grams) || 100),
      })),

    changeGrams: (mealIndex, itemIndex, value) =>
      updateItem(mealIndex, itemIndex, (item) => {
        const food = findFoodForItem(foods, item);
        if (!food) return { ...item, grams: value };
        return { ...item, grams: value, foodId: food.id, ...scaleFood(food, parseFloat(value) || 0) };
      }),
  };

  /* ---- Kalender ---- */
  function assignDate(dateStr: string, templateName: string) {
    setSchedule((prev) => ({ ...prev, [dateStr]: templateName }));
  }

  function unassignDate(dateStr: string) {
    setSchedule((prev) => {
      const next = { ...prev };
      delete next[dateStr];
      return next;
    });
  }

  /* ---- Speichern ---- */
  async function submit() {
    setFeedback(null);

    if (!clientId || !mainTitle.trim()) {
      setFeedback({ type: 'error', text: 'Bitte wähle einen Kunden und einen Gesamt-Namen für den Ernährungsplan aus.' });
      return;
    }
    const names = templates.map((t) => t.templateName);
    if (hasDuplicates(names)) {
      setFeedback({ type: 'error', text: 'Zwei Ernährungs-Tage haben denselben Namen. Bitte benenne sie eindeutig.' });
      return;
    }
    if (Object.keys(schedule).length === 0) {
      setFeedback({ type: 'error', text: 'Bitte ziehe mindestens einen Ernährungs-Tag auf einen Kalendertag.' });
      return;
    }
    if (Object.values(schedule).some((name) => !names.includes(name))) {
      setFeedback({ type: 'error', text: 'Im Kalender ist ein Ernährungs-Tag eingetragen, den es nicht mehr gibt.' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('client_plans').insert({
      trainer_id: trainerId,
      user_id: clientId,
      plan_type: 'nutrition',
      title: `${mainTitle.trim()} (${duration})`,
      content: JSON.stringify({ duration_period: duration, days: templates, schedule }),
    });
    setSaving(false);

    if (error) {
      setFeedback({ type: 'error', text: 'Fehler beim Speichern des Ernährungsplans: ' + error.message });
      return;
    }
    setFeedback({ type: 'success', text: 'Ernährungs-Monatsplan erfolgreich in das Kunden-Dashboard übertragen!' });
    setMainTitle('');
  }

  return {
    clientId, setClientId,
    mainTitle, setMainTitle,
    duration, setDuration,
    templates, activeIndex, setActiveIndex, activeTemplate,
    schedule, saving, feedback,
    addTemplate, removeTemplate, renameActive, applyDefault, changeMacro,
    addMeal, mealActions,
    assignDate, unassignDate, submit,
  };
}
