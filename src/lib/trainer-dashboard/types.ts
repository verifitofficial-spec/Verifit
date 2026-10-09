export type Feedback = { type: 'success' | 'error'; text: string } | null;

export type BookingStatus = 'pending' | 'accepted' | 'confirmed' | 'declined' | 'cancelled' | 'expired';
export type OfferType = 'discovery' | 'paid';
export type SlotStatus = 'free' | 'pending' | 'booked';

export interface TrainerProfile {
  id: string;
  name: string | null;
  email: string | null;
  bio: string | null;
  status: string | null;
  city: string | null;
  service_mode: string | null;
  specialties: string | null;
  license_number: string | null;
  liability_insurance_expiry: string | null;
  license_document_path: string | null;
  insurance_document_path: string | null;
  avatar_url: string | null;
  stripe_account_id: string | null;
  charges_enabled: boolean | null;
}

export interface OfferTemplate {
  id: string;
  title: string;
  type: OfferType;
  duration: number;
  price: number;
  description: string;
}

export interface OfferDraft {
  title: string;
  type: OfferType;
  duration: number;
  price: number;
  description: string;
}

export interface Booking {
  id: string;
  slot_id: string | null;
  client_id: string;
  client_name: string;
  client_email: string;
  offer_title: string;
  offer_type: OfferType;
  duration_minutes: number;
  price: number;
  slot_date: string;
  slot_time: string;
  status: BookingStatus;
  created_at: string;
}

export interface TrainerSlot {
  id: string;
  trainer_id: string;
  slot_date: string;
  slot_time: string;
  status: SlotStatus;
}

export interface ClientOption {
  id: string;
  name: string | null;
  email: string;
}

export interface Food {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface WorkoutExercise {
  exercise: string;
  sets: string;
  reps: string;
  weight: string;
}

export interface WorkoutTemplate {
  templateName: string;
  isDefault: boolean;
  exercises: WorkoutExercise[];
}

export interface MealItem {
  foodId: string;
  foodSearchInput: string;
  grams: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

export interface Meal {
  time: string;
  title: string;
  items: MealItem[];
}

export type MacroField = 'targetCalories' | 'targetProtein' | 'targetCarbs' | 'targetFat' | 'waterIntake';

export interface NutritionTemplate {
  templateName: string;
  isDefault: boolean;
  targetCalories: string;
  targetProtein: string;
  targetCarbs: string;
  targetFat: string;
  waterIntake: string;
  meals: Meal[];
}

/** Datum (YYYY-MM-DD) -> Template-Name. Format wird vom Kunden-Dashboard gelesen. */
export type ScheduleMap = Record<string, string>;

export interface MealActions {
  changeMealField: (mealIndex: number, field: 'time' | 'title', value: string) => void;
  removeMeal: (mealIndex: number) => void;
  addItem: (mealIndex: number) => void;
  removeItem: (mealIndex: number, itemIndex: number) => void;
  changeSearch: (mealIndex: number, itemIndex: number, value: string) => void;
  selectFood: (mealIndex: number, itemIndex: number, food: Food) => void;
  changeGrams: (mealIndex: number, itemIndex: number, value: string) => void;
}
