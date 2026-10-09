'use client';

import { CheckCircle, Dumbbell } from 'lucide-react';
import { useWorkoutPlanner } from '@/hooks/trainer-dashboard/useWorkoutPlanner';
import { DEFAULT_WORKOUT_TEMPLATES } from '@/lib/trainer-dashboard/constants';
import type { ClientOption } from '@/lib/trainer-dashboard/types';
import PlanMetaFields from './PlanMetaFields';
import PlannerCalendar from './PlannerCalendar';
import TemplateBar from './TemplateBar';
import WorkoutTemplateEditor from './WorkoutTemplateEditor';
import { FeedbackBox, SectionCard, SectionHeader, primaryButtonClass } from './ui';

const DEFAULT_NAMES = DEFAULT_WORKOUT_TEMPLATES.map((t) => t.templateName);

export default function WorkoutPlanner({ trainerId, clients }: { trainerId: string; clients: ClientOption[] }) {
  const planner = useWorkoutPlanner(trainerId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void planner.submit();
  }

  return (
    <SectionCard>
      <SectionHeader
        icon={Dumbbell}
        title="Krafttrainingsplaner"
        description="Templates per Drag & Drop auf Kalendertage ziehen oder per Klick in den Editor laden."
      />

      <FeedbackBox feedback={planner.feedback} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <PlanMetaFields
          clients={clients}
          clientId={planner.clientId}
          onClientChange={planner.setClientId}
          title={planner.mainTitle}
          onTitleChange={planner.setMainTitle}
          titlePlaceholder="z.B. 4-Wochen Hypertrophie-Plan"
          duration={planner.duration}
          onDurationChange={planner.setDuration}
        />

        <PlannerCalendar
          title="Monatsplan Kalender"
          hint="Ziehe ein Template aus der Leiste auf den gewünschten Tag."
          schedule={planner.schedule}
          onAssign={planner.assignDate}
          onRemove={planner.unassignDate}
        />

        <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 space-y-4">
          <TemplateBar
            defaults={DEFAULT_NAMES}
            customs={planner.templates.map((t) => t.templateName)}
            activeIndex={planner.activeIndex}
            icon={Dumbbell}
            customLabel="Eigene Templates (Drag & Drop fähig):"
            addLabel="Neues Template"
            removeTitle="Template löschen"
            onSelectDefault={planner.applyDefault}
            onSelect={planner.setActiveIndex}
            onRemove={planner.removeTemplate}
            onAdd={planner.addTemplate}
          />

          <WorkoutTemplateEditor
            template={planner.activeTemplate}
            onRename={planner.renameActive}
            onAddExercise={planner.addExercise}
            onRemoveExercise={planner.removeExercise}
            onChangeExercise={planner.changeExercise}
          />
        </div>

        <button
          type="submit"
          disabled={planner.saving}
          className={`w-full py-3.5 flex items-center justify-center gap-2 ${primaryButtonClass}`}
        >
          {planner.saving ? 'Speichere...' : 'Monatsplan an Kunden senden'}
          {!planner.saving && <CheckCircle size={16} />}
        </button>
      </form>
    </SectionCard>
  );
}
