'use client';

import { Plus, Trash2 } from 'lucide-react';
import { EXERCISE_OPTIONS } from '@/lib/trainer-dashboard/constants';
import type { WorkoutExercise, WorkoutTemplate } from '@/lib/trainer-dashboard/types';
import { smallInputClass } from './ui';

interface Props {
  template: WorkoutTemplate;
  onRename: (value: string) => void;
  onAddExercise: () => void;
  onRemoveExercise: (index: number) => void;
  onChangeExercise: (index: number, field: keyof WorkoutExercise, value: string) => void;
}

const cellInput =
  'w-full bg-slate-900 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-center text-white focus:outline-none focus:border-emerald-500';

export default function WorkoutTemplateEditor({
  template,
  onRename,
  onAddExercise,
  onRemoveExercise,
  onChangeExercise,
}: Props) {
  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 sm:p-5 space-y-4 relative">
      <div>
        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Template-Name (erscheint im Kalender)
        </label>
        <input
          type="text"
          value={template.templateName}
          onChange={(e) => onRename(e.target.value)}
          className={smallInputClass}
        />
      </div>

      <div className="space-y-2">
        <div className="hidden sm:grid grid-cols-12 gap-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          <div className="col-span-6">Übung</div>
          <div className="col-span-2">Sätze</div>
          <div className="col-span-2">Wdh.</div>
          <div className="col-span-2">Gew. (kg)</div>
        </div>

        {template.exercises.map((ex, index) => (
          <div
            key={index}
            className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-950/50 p-2 sm:p-1 rounded-lg sm:bg-transparent"
          >
            <div className="sm:col-span-6">
              <label className="sm:hidden block text-[9px] font-bold text-slate-500 uppercase mb-1">Übung</label>
              <select
                value={ex.exercise}
                onChange={(e) => onChangeExercise(index, 'exercise', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 appearance-none"
              >
                <option value="">Übung wählen...</option>
                {EXERCISE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 flex items-center gap-2 sm:block">
              <label className="sm:hidden w-16 text-[9px] font-bold text-slate-500 uppercase">Sätze</label>
              <input
                type="text"
                value={ex.sets}
                onChange={(e) => onChangeExercise(index, 'sets', e.target.value)}
                placeholder="Sätze"
                className={cellInput}
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-2 sm:block">
              <label className="sm:hidden w-16 text-[9px] font-bold text-slate-500 uppercase">Wdh.</label>
              <input
                type="text"
                value={ex.reps}
                onChange={(e) => onChangeExercise(index, 'reps', e.target.value)}
                placeholder="Wdh."
                className={cellInput}
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-2">
              <label className="sm:hidden w-16 text-[9px] font-bold text-slate-500 uppercase">Gewicht</label>
              <input
                type="text"
                value={ex.weight}
                onChange={(e) => onChangeExercise(index, 'weight', e.target.value)}
                placeholder="kg"
                className={`${cellInput} text-emerald-400 font-bold`}
              />
              <button
                type="button"
                onClick={() => onRemoveExercise(index)}
                className="text-slate-500 hover:text-red-400 p-1 transition cursor-pointer"
                title="Übung entfernen"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={onAddExercise}
          className="w-full bg-slate-900/50 hover:bg-slate-900 border border-slate-800 border-dashed text-slate-400 hover:text-emerald-400 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
        >
          <Plus size={14} /> Übung hinzufügen
        </button>
      </div>
    </div>
  );
}
