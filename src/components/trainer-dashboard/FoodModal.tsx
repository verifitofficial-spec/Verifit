'use client';

import { useState } from 'react';
import type { NewFoodInput } from '@/hooks/trainer-dashboard/useFoodDatabase';
import { ModalShell, primaryButtonClass, smallInputClass } from './ui';

interface Props {
  onClose: () => void;
  onSubmit: (food: NewFoodInput) => Promise<string | null>;
}

const fieldLabel = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5';

export default function FoodModal({ onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !kcal) return;
    setBusy(true);
    setError('');
    const result = await onSubmit({
      name: name.trim(),
      kcal: parseFloat(kcal) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
    });
    setBusy(false);
    if (result) setError(result);
    else onClose();
  }

  return (
    <ModalShell
      title="Neues Lebensmittel anlegen"
      description="Trage die Nährwerte pro 100g ein. Das Lebensmittel wird in deiner Datenbank gespeichert."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-xs text-red-400">{error}</div>
        )}
        <div>
          <label className={fieldLabel}>Name</label>
          <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className={smallInputClass} placeholder="z.B. Apfel (frisch)" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={fieldLabel}>Kcal (pro 100g)</label>
            <input required type="number" step="0.1" min="0" value={kcal} onChange={(e) => setKcal(e.target.value)} className={smallInputClass} />
          </div>
          <div>
            <label className={fieldLabel}>Protein (g)</label>
            <input required type="number" step="0.1" min="0" value={protein} onChange={(e) => setProtein(e.target.value)} className={smallInputClass} />
          </div>
          <div>
            <label className={fieldLabel}>Kohlenhydrate (g)</label>
            <input required type="number" step="0.1" min="0" value={carbs} onChange={(e) => setCarbs(e.target.value)} className={smallInputClass} />
          </div>
          <div>
            <label className={fieldLabel}>Fett (g)</label>
            <input required type="number" step="0.1" min="0" value={fat} onChange={(e) => setFat(e.target.value)} className={smallInputClass} />
          </div>
        </div>
        <button type="submit" disabled={busy} className={`w-full py-2.5 mt-2 ${primaryButtonClass}`}>
          {busy ? 'Speichere...' : 'Lebensmittel speichern'}
        </button>
      </form>
    </ModalShell>
  );
}
