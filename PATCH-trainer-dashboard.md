# Patch: `src/app/trainer/[id]/dashboard/page.tsx`

Die Datei hat ca. 1.500 Zeilen. Es sind nur **5 klar abgegrenzte Änderungen** nötig. Alles andere bleibt unverändert.

## 1) Imports ersetzen

**Suchen:**
```ts
import { AVAILABLE_SPECIALTIES } from '@/lib/constants';
```

**Ersetzen durch:**
```ts
import { normalizeSpecialties } from '@/lib/constants';
import SpecialtyPicker from '@/components/SpecialtyPicker';
import DeleteAccountCard from '@/components/DeleteAccountCard';
import StripeReturnSync from '@/components/StripeReturnSync';
```

## 2) Fachgebiete beim Laden normalisieren (alte Namen werden auf die Quiz-Kategorien abgebildet)

**Suchen:**
```ts
        if (data.specialties) {
          setSelectedSpecialties(
            data.specialties.split(',').map((s: string) => s.trim()).filter(Boolean)
          );
        }
```

**Ersetzen durch:**
```ts
        setSelectedSpecialties(normalizeSpecialties(data.specialties));
```

## 3) Block „Kompetenzgebiete" ersetzen

Lösche **alles** von der Zeile `{/* 2. Kompetenzgebiete */}` bis **einschließlich** des schließenden `</div>` direkt vor der Zeile `{/* 3. Lizenzen, Ausweis & Verifizierungs-Bereich */}` und füge stattdessen ein:

```tsx
        {/* 2. Kompetenzgebiete */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Dumbbell size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Kompetenzgebiete (Fachgebiete, Trainingsform)</h2>
              <p className="text-slate-400 text-xs">
                Es werden genau die Kategorien aus dem Matching-Quiz angezeigt. Deine Auswahl bestimmt, bei welchen Quiz-Zielen Kunden dich finden.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Trainingsform</label>
            <select
              value={serviceMode}
              onChange={async (e) => {
                const value = e.target.value;
                setServiceMode(value);
                if (trainer) {
                  const { error } = await supabase.from('trainers').update({ service_mode: value }).eq('id', trainer.id);
                  if (error) console.error('Fehler beim Speichern der Trainingsform:', error.message);
                }
              }}
              className="w-full max-w-sm bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition shadow-inner"
            >
              <option value="Vor Ort & Online">Vor Ort & Online (Hybrid)</option>
              <option value="Vor Ort">Nur vor Ort</option>
              <option value="Online">Nur online</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Spezialisierungen</label>
            <SpecialtyPicker selected={selectedSpecialties} onToggle={toggleSpecialty} />
          </div>
        </div>

```

## 4) Stripe-Statusabgleich einfügen

**Suchen** die Zeile:
```tsx
        {/* 1. Persönliche Angaben */}
```

**Direkt davor einfügen:**
```tsx
        <StripeReturnSync />

```

## 5) „Konto löschen" einfügen

**Suchen** die Zeile (steht nach dem schließenden `</section>`):
```tsx
      {/* Lebensmittel Hinzufügen Modal */}
```

**Direkt davor einfügen:**
```tsx
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-10 w-full">
        <DeleteAccountCard role="trainer" />
      </section>

```

Danach `npm run lint` ausführen: Der Import `AVAILABLE_SPECIALTIES` darf nirgends mehr im Dashboard vorkommen (er wird nach Schritt 1 und 3 nicht mehr gebraucht).
