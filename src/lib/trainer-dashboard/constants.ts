import type { Food, Meal, MealItem, NutritionTemplate, WorkoutExercise, WorkoutTemplate } from './types';

export const EXERCISE_OPTIONS = [
  'Langhantel-Bankdrücken',
  'Schrägbankdrücken (Kurzhantel)',
  'Kniebeugen (Barbell Squat)',
  'Rumänisches Kreuzheben (RDL)',
  'Klassisches Kreuzheben',
  'Klimmzüge (Pull-ups)',
  'Latziehen am Kabel',
  'Vorgebeugtes Langhantelrudern',
  'Sitzendes Rudern am Kabel',
  'Military Press (Schulterdrücken)',
  'Seitenheben (Dumbbell Lateral Raise)',
  'Bizepscurls (Kabel oder Kurzhantel)',
  'Trizepsdrücken am Kabel',
  'Beinpresse (Leg Press)',
  'Beinstrecker (Leg Extension)',
  'Beinbeuger (Leg Curl)',
  'Wadenheben stehend',
  'Crunches / Bauchpresse',
].sort((a, b) => a.localeCompare(b, 'de'));

export const SLOT_HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
];

export const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

export const DURATION_OPTIONS = ['2 Wochen', '4 Wochen (1 Monat)', '8 Wochen (2 Monate)', '12 Wochen (3 Monate)'];

export const SERVICE_MODE_OPTIONS = ['Vor Ort & Online', 'Vor Ort', 'Online'];

export const DEFAULT_WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    templateName: 'Push (Brust, Schultern, Trizeps)',
    isDefault: true,
    exercises: [
      { exercise: 'Langhantel-Bankdrücken', sets: '3', reps: '8-10', weight: '75' },
      { exercise: 'Military Press (Schulterdrücken)', sets: '3', reps: '8-10', weight: '50' },
      { exercise: 'Seitenheben (Dumbbell Lateral Raise)', sets: '3', reps: '12-15', weight: '12' },
      { exercise: 'Trizepsdrücken am Kabel', sets: '3', reps: '10-12', weight: '35' },
    ],
  },
  {
    templateName: 'Pull (Rücken, Bizeps, Hintere Schulter)',
    isDefault: true,
    exercises: [
      { exercise: 'Klimmzüge (Pull-ups)', sets: '3', reps: '8-10', weight: '0' },
      { exercise: 'Vorgebeugtes Langhantelrudern', sets: '3', reps: '8-10', weight: '60' },
      { exercise: 'Latziehen am Kabel', sets: '3', reps: '10-12', weight: '55' },
      { exercise: 'Bizepscurls (Kabel oder Kurzhantel)', sets: '3', reps: '10-12', weight: '15' },
    ],
  },
  {
    templateName: 'Leg Day (Quads, Hamstrings, Waden)',
    isDefault: true,
    exercises: [
      { exercise: 'Kniebeugen (Barbell Squat)', sets: '4', reps: '6-8', weight: '100' },
      { exercise: 'Beinpresse (Leg Press)', sets: '3', reps: '10-12', weight: '180' },
      { exercise: 'Beinstrecker (Leg Extension)', sets: '3', reps: '12-15', weight: '60' },
      { exercise: 'Beinbeuger (Leg Curl)', sets: '3', reps: '12-15', weight: '45' },
      { exercise: 'Wadenheben stehend', sets: '4', reps: '12-15', weight: '70' },
    ],
  },
];

export const DEFAULT_NUTRITION_TEMPLATES: NutritionTemplate[] = [
  {
    templateName: 'High-Carb Trainingstag',
    isDefault: true,
    targetCalories: '2800',
    targetProtein: '190',
    targetCarbs: '350',
    targetFat: '65',
    waterIntake: '4.0',
    meals: [
      {
        time: '08:00',
        title: 'Frühstück',
        items: [
          { foodId: '1', foodSearchInput: 'Haferflocken', grams: '100', calories: '370', protein: '13.5', carbs: '58.7', fat: '7.0' },
        ],
      },
    ],
  },
  {
    templateName: 'Low-Carb / Rest Day',
    isDefault: true,
    targetCalories: '2200',
    targetProtein: '200',
    targetCarbs: '150',
    targetFat: '85',
    waterIntake: '3.5',
    meals: [
      {
        time: '08:00',
        title: 'Frühstück',
        items: [
          { foodId: '2', foodSearchInput: 'Hähnchenbrust (roh)', grams: '150', calories: '158', protein: '34.5', carbs: '0.0', fat: '1.8' },
        ],
      },
    ],
  },
];

/** Wird nur genutzt, solange die foods-Tabelle leer ist. */
export const FALLBACK_FOODS: Food[] = [
  { id: '1', name: 'Haferflocken', kcal: 370, protein: 13.5, carbs: 58.7, fat: 7.0 },
  { id: '2', name: 'Hähnchenbrust (roh)', kcal: 105, protein: 23.0, carbs: 0.0, fat: 1.2 },
  { id: '3', name: 'Reis (langkorn, roh)', kcal: 350, protein: 7.0, carbs: 78.0, fat: 0.6 },
  { id: '4', name: 'Banane', kcal: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
  { id: '5', name: 'Magerquark', kcal: 67, protein: 12.0, carbs: 4.0, fat: 0.2 },
  { id: '6', name: 'Erdnussbutter', kcal: 588, protein: 25.0, carbs: 16.0, fat: 50.0 },
  { id: '7', name: 'Lachs (roh)', kcal: 206, protein: 20.0, carbs: 0.0, fat: 13.5 },
  { id: '8', name: 'Kartoffeln (gekocht)', kcal: 86, protein: 2.0, carbs: 18.5, fat: 0.1 },
  { id: '9', name: 'Avocado', kcal: 160, protein: 2.0, carbs: 0.4, fat: 15.0 },
  { id: '10', name: 'Brokkoli', kcal: 34, protein: 3.7, carbs: 3.0, fat: 0.4 },
];

export const createExercise = (): WorkoutExercise => ({
  exercise: 'Langhantel-Bankdrücken',
  sets: '3',
  reps: '10',
  weight: '50',
});

export const createMealItem = (): MealItem => ({
  foodId: '',
  foodSearchInput: '',
  grams: '100',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
});

export const createMeal = (time = '12:00', title = 'Zwischenmahlzeit'): Meal => ({
  time,
  title,
  items: [createMealItem()],
});

export const createWorkoutTemplate = (name: string): WorkoutTemplate => ({
  templateName: name,
  isDefault: false,
  exercises: [createExercise()],
});

export const createNutritionTemplate = (name: string, firstMealTime = '07:00'): NutritionTemplate => ({
  templateName: name,
  isDefault: false,
  targetCalories: '2500',
  targetProtein: '180',
  targetCarbs: '250',
  targetFat: '70',
  waterIntake: '3.5',
  meals: [createMeal(firstMealTime, 'Frühstück')],
});
