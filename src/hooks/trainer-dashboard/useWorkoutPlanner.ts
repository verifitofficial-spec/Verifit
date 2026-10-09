'use client';

import { useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import {
  DEFAULT_WORKOUT_TEMPLATES,
  DURATION_OPTIONS,
  createExercise,
  createWorkoutTemplate,
} from '@/lib/trainer-dashboard/constants';
import { hasDuplicates, removeFromSchedule, renameInSchedule } from '@/lib/trainer-dashboard/utils';
import type { Feedback, ScheduleMap, WorkoutExercise, WorkoutTemplate } from '@/lib/trainer-dashboard/types';

export function useWorkoutPlanner(trainerId: string) {
  const [clientId, setClientId] = useState('');
  const [mainTitle, setMainTitle] = useState('');
  const [duration, setDuration] = useState(DURATION_OPTIONS[1]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(() => [
    createWorkoutTemplate('Push (Brust, Schultern, Trizeps)'),
  ]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [schedule, setSchedule] = useState<ScheduleMap>({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const activeTemplate = templates[activeIndex] ?? templates[0];

  const updateActive = (fn: (t: WorkoutTemplate) => WorkoutTemplate) =>
    setTemplates((prev) => prev.map((t, i) => (i === activeIndex ? fn(t) : t)));

  function addTemplate() {
    setTemplates((prev) => [...prev, createWorkoutTemplate(`Eigenes Custom Template ${prev.length + 1}`)]);
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
    const source = DEFAULT_WORKOUT_TEMPLATES[index];
    if (!source) return;
    const oldName = activeTemplate?.templateName;
    updateActive(() => ({
      templateName: source.templateName,
      isDefault: false,
      exercises: source.exercises.map((ex) => ({ ...ex })),
    }));
    if (oldName) setSchedule((prev) => renameInSchedule(prev, oldName, source.templateName));
  }

  function addExercise() {
    updateActive((t) => ({ ...t, exercises: [...t.exercises, createExercise()] }));
  }

  function removeExercise(exIndex: number) {
    updateActive((t) => ({ ...t, exercises: t.exercises.filter((_, i) => i !== exIndex) }));
  }

  function changeExercise(exIndex: number, field: keyof WorkoutExercise, value: string) {
    updateActive((t) => ({
      ...t,
      exercises: t.exercises.map((ex, i) => (i === exIndex ? { ...ex, [field]: value } : ex)),
    }));
  }

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

  async function submit() {
    setFeedback(null);

    if (!clientId || !mainTitle.trim()) {
      setFeedback({ type: 'error', text: 'Bitte wähle einen Kunden und einen Gesamt-Namen für den Monatsplan aus.' });
      return;
    }
    const names = templates.map((t) => t.templateName);
    if (hasDuplicates(names)) {
      setFeedback({ type: 'error', text: 'Zwei Templates haben denselben Namen. Bitte benenne sie eindeutig.' });
      return;
    }
    if (Object.keys(schedule).length === 0) {
      setFeedback({ type: 'error', text: 'Bitte ziehe mindestens ein Template auf einen Kalendertag.' });
      return;
    }
    if (Object.values(schedule).some((name) => !names.includes(name))) {
      setFeedback({ type: 'error', text: 'Im Kalender ist ein Template eingetragen, das es nicht mehr gibt.' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('client_plans').insert({
      trainer_id: trainerId,
      user_id: clientId,
      plan_type: 'workout',
      title: `${mainTitle.trim()} (${duration})`,
      content: JSON.stringify({ duration_period: duration, days: templates, schedule }),
    });
    setSaving(false);

    if (error) {
      setFeedback({ type: 'error', text: 'Fehler beim Speichern des Monatsplans: ' + error.message });
      return;
    }
    setFeedback({ type: 'success', text: 'Monats- & Zeitraumplan erfolgreich für den Kunden übertragen!' });
    setMainTitle('');
  }

  return {
    clientId, setClientId,
    mainTitle, setMainTitle,
    duration, setDuration,
    templates, activeIndex, setActiveIndex, activeTemplate,
    schedule, saving, feedback,
    addTemplate, removeTemplate, renameActive, applyDefault,
    addExercise, removeExercise, changeExercise,
    assignDate, unassignDate, submit,
  };
}
