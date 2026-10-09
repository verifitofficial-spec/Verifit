'use client';

import { useState } from 'react';
import { CheckCircle, Plus, Utensils } from 'lucide-react';
import { useFoodDatabase } from '@/hooks/trainer-dashboard/useFoodDatabase';
import { useNutritionPlanner } from '@/hooks/trainer-dashboard/useNutritionPlanner';
import { DEFAULT_NUTRITION_TEMPLATES } from '@/lib/trainer-dashboard/constants';
import type { ClientOption } from '@/lib/trainer-dashboard/types';
import FoodModal from './FoodModal';
import NutritionTemplateEditor from './NutritionTemplateEditor';
import PlanMetaFields from './PlanMetaFields';
import PlannerCalendar from './PlannerCalendar';
import TemplateBar from './TemplateBar';
import { FeedbackBox, SectionCard, SectionHeader, primaryButtonClass } from './ui';

const DEFAULT_NAMES = DEFAULT_NUTRITION_TEMPLATES.map((t) => t.templateName);

export default function NutritionPlanner({ trainerId, clients }: { trainerId: string; clients: ClientOption[] }) {
  const { foods, addFood } = useFoodDatabase();
  const planner = useNutritionPlanner(trainerId, foods);
  const [foodModalOpen, setFoodModalOpen] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void planner.submit();
  }

  return (
    <SectionCard>
      <SectionHeader
        icon={Utensils}
        title="Ernährungsplaner"
        description="Makros tracken, Templates erstellen und per Drag & Drop planen."
        actions={
          <button
            type="button"
            onClick={() => setFoodModalOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition cursor-pointer shadow-sm"
          >
            <Plus size={14} /> Neues Lebensmittel in DB
          </button>
        }
      />

      <FeedbackBox feedback={planner.feedback} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <PlanMetaFields
          clients={clients}
          clientId={planner.clientId}
          onClientChange={planner.setClientId}
          title={planner.mainTitle}
          onTitleChange={planner.setMainTitle}
          titlePlaceholder="z.B. 4-Wochen Definitionsphase"
          duration={planner.duration}
          onDurationChange={planner.setDuration}
        />

        <PlannerCalendar
          title="Ernährungs-Kalender"
          hint="Ziehe ein Ernährungs-Template auf den gewünschten Tag."
          schedule={planner.schedule}
          onAssign={planner.assignDate}
          onRemove={planner.unassignDate}
        />

        <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 space-y-4">
          <TemplateBar
            defaults={DEFAULT_NAMES}
            customs={planner.templates.map((t) => t.templateName)}
            activeIndex={planner.activeIndex}
            icon={Utensils}
            customLabel="Eigene Ernährungs-Tage (Drag & Drop fähig):"
            addLabel="Neuer Tag"
            removeTitle="Tag löschen"
            onSelectDefault={planner.applyDefault}
            onSelect={planner.setActiveIndex}
            onRemove={planner.removeTemplate}
            onAdd={planner.addTemplate}
          />

          <NutritionTemplateEditor
            template={planner.activeTemplate}
            foods={foods}
            mealActions={planner.mealActions}
            onRename={planner.renameActive}
            onChangeMacro={planner.changeMacro}
            onAddMeal={planner.addMeal}
          />
        </div>

        <button
          type="submit"
          disabled={planner.saving}
          className={`w-full py-3.5 flex items-center justify-center gap-2 ${primaryButtonClass}`}
        >
          {planner.saving ? 'Speichere...' : 'Ernährungsplan an Kunden senden'}
          {!planner.saving && <CheckCircle size={16} />}
        </button>
      </form>

      {foodModalOpen && <FoodModal onClose={() => setFoodModalOpen(false)} onSubmit={addFood} />}
    </SectionCard>
  );
}
