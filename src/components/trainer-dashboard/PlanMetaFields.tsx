import { DURATION_OPTIONS } from '@/lib/trainer-dashboard/constants';
import type { ClientOption } from '@/lib/trainer-dashboard/types';
import { inputClass, labelClass } from './ui';

interface Props {
  clients: ClientOption[];
  clientId: string;
  onClientChange: (value: string) => void;
  title: string;
  onTitleChange: (value: string) => void;
  titlePlaceholder: string;
  duration: string;
  onDurationChange: (value: string) => void;
}

export default function PlanMetaFields({
  clients,
  clientId,
  onClientChange,
  title,
  onTitleChange,
  titlePlaceholder,
  duration,
  onDurationChange,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className={labelClass}>Kunde auswählen</label>
        <select value={clientId} onChange={(e) => onClientChange(e.target.value)} className={inputClass} required>
          <option value="">Kunde wählen...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name || c.email}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Gesamt-Titel des Plans</label>
        <input
          type="text"
          placeholder={titlePlaceholder}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className={inputClass}
          required
        />
      </div>

      <div>
        <label className={labelClass}>Zeitraum / Dauer</label>
        <select value={duration} onChange={(e) => onDurationChange(e.target.value)} className={inputClass}>
          {DURATION_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
