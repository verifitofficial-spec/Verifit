'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import Chat from '@/components/Chat';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  User, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Briefcase, 
  Trash2, 
  Edit3,
  CalendarDays,
  ShieldCheck,
  Dumbbell,
  Utensils
} from 'lucide-react';

const AVAILABLE_SPECIALTIES = [
  'Athletiktraining',
  'Ernährungsberatung',
  'Fettabbau',
  'Functional Training',
  'Gewichtsmanagement',
  'Ganzkörpertraining',
  'Gesundheitsorientiertes Krafttraining',
  'HIIT & Cardio',
  'Hypertrophie',
  'Körperhaltung & Core',
  'Leistungsdiagnostik',
  'Lauftraining & Ausdauer',
  'Mobility & Stretching',
  'Muskelaufbau',
  'Postnatales Training',
  'Pränatales Training',
  'Reha & Prävention',
  'Rückentraining',
  'Seniorenfitness',
  'Stoffwechseloptimierung',
  'Stressabbau & Entspannung',
  'Sportartspezifisches Training',
  'Transformation',
  'Yogalates & Core'
].sort((a, b) => a.localeCompare(b, 'de'));

const EXERCISE_OPTIONS = [
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
  'Crunches / Bauchpresse'
].sort((a, b) => a.localeCompare(b, 'de'));

const SWIMMING_POOL_HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', 
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const DEFAULT_WORKOUT_TEMPLATES = [
  {
    templateName: 'Push (Brust, Schultern, Trizeps)',
    isDefault: true,
    exercises: [
      { exercise: 'Langhantel-Bankdrücken', sets: '3', reps: '8-10', weight: '75' },
      { exercise: 'Military Press (Schulterdrücken)', sets: '3', reps: '8-10', weight: '50' },
      { exercise: 'Seitenheben (Dumbbell Lateral Raise)', sets: '3', reps: '12-15', weight: '12' },
      { exercise: 'Trizepsdrücken am Kabel', sets: '3', reps: '10-12', weight: '35' }
    ]
  },
  {
    templateName: 'Pull (Rücken, Bizeps, Hintere Schulter)',
    isDefault: true,
    exercises: [
      { exercise: 'Klimmzüge (Pull-ups)', sets: '3', reps: '8-10', weight: '0' },
      { exercise: 'Vorgebeugtes Langhantelrudern', sets: '3', reps: '8-10', weight: '60' },
      { exercise: 'Latziehen am Kabel', sets: '3', reps: '10-12', weight: '55' },
      { exercise: 'Bizepscurls (Kabel oder Kurzhantel)', sets: '3', reps: '10-12', weight: '15' }
    ]
  },
  {
    templateName: 'Leg Day (Quads, Hamstrings, Waden)',
    isDefault: true,
    exercises: [
      { exercise: 'Kniebeugen (Barbell Squat)', sets: '4', reps: '6-8', weight: '100' },
      { exercise: 'Beinpresse (Leg Press)', sets: '3', reps: '10-12', weight: '180' },
      { exercise: 'Beinstrecker (Leg Extension)', sets: '3', reps: '12-15', weight: '60' },
      { exercise: 'Beinbeuger (Leg Curl)', sets: '3', reps: '12-15', weight: '45' },
      { exercise: 'Wadenheben stehend', sets: '4', reps: '12-15', weight: '70' }
    ]
  }
];

const DEFAULT_NUTRITION_TEMPLATES = [
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
        items: [{ foodId: '1', foodSearchInput: 'Haferflocken', grams: '100', calories: '370', protein: '13.5', carbs: '58.7', fat: '7.0' }] 
      }
    ]
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
        items: [{ foodId: '2', foodSearchInput: 'Hähnchenbrust (roh)', grams: '150', calories: '158', protein: '34.5', carbs: '0.0', fat: '1.8' }] 
      }
    ]
  }
];

interface OfferTemplate {
  id: string;
  title: string;
  type: 'discovery' | 'paid';
  duration: number;
  price: number;
  description: string;
}

interface Appointment {
  id: string;
  title: string;
  clientName: string;
  clientEmail: string;
  date: string;
  time: string;
  duration: number;
  type: 'discovery' | 'paid';
  price: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  location: string;
}

export default function TrainerDashboard() {
  const [trainer, setTrainer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [serviceMode, setServiceMode] = useState('Vor Ort & Online');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [packageCategory, setPackageCategory] = useState('');
  const [packageDuration, setPackageDuration] = useState('');
  const [packagePrice, setPackagePrice] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState('available');

  const todayObj = new Date();
  const [currentYear, setCurrentYear] = useState(todayObj.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(todayObj.getMonth());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(
    todayObj.toISOString().split('T')[0]
  );

  const [activeCalendarTab, setActiveCalendarTab] = useState<'schedule' | 'offers'>('schedule');
  const [offers, setOffers] = useState<OfferTemplate[]>([
    {
      id: '1',
      title: '0€ Discovery Call (Erstgespräch)',
      type: 'discovery',
      duration: 30,
      price: 0,
      description: 'Kostenloses 30-minütiges Kennenlernen zur Analyse deiner Ziele.'
    },
    {
      id: '2',
      title: '1:1 Personal Training Session',
      type: 'paid',
      duration: 60,
      price: 90,
      description: 'Intensives 60-minütiges Einzeltraining vor Ort oder online.'
    }
  ]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [currentOffer, setCurrentOffer] = useState<Partial<OfferTemplate>>({
    title: '',
    type: 'paid',
    duration: 60,
    price: 90,
    description: ''
  });
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);

  const [selectedOfferForBooking, setSelectedOfferForBooking] = useState<OfferTemplate | null>(null);
  const [bookingClientName, setBookingClientName] = useState('');
  const [bookingClientEmail, setBookingClientEmail] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');

  const [slotTitle, setSlotTitle] = useState('Discovery-Call / Erstgespräch');
  const [slotPrice, setSlotPrice] = useState('0');
  const [slots, setSlots] = useState<any[]>([]);

  const [clients, setClients] = useState<any[]>([]);

  // Supabase Lebensmittel-Datenbank States
  const [foodDatabase, setFoodDatabase] = useState<any[]>([]);
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [newFoodName, setNewFoodName] = useState('');
  const [newFoodKcal, setNewFoodKcal] = useState('');
  const [newFoodProtein, setNewFoodProtein] = useState('');
  const [newFoodCarbs, setNewFoodCarbs] = useState('');
  const [newFoodFat, setNewFoodFat] = useState('');

  // Ernährungsplan Builder & Template States (Analog zum Kraftplan)
  const [nutritionClientId, setNutritionClientId] = useState('');
  const [nutritionMainTitle, setNutritionMainTitle] = useState('');
  const [nutritionDurationWeeks, setNutritionDurationWeeks] = useState('4 Wochen (1 Monat)');

  const [defaultNutritionTemplates] = useState(DEFAULT_NUTRITION_TEMPLATES);
  const [customNutritionTemplates, setCustomNutritionTemplates] = useState<any[]>([
    {
      templateName: 'Standard Ernährungs-Tag',
      isDefault: false,
      targetCalories: '2500',
      targetProtein: '180',
      targetCarbs: '250',
      targetFat: '70',
      waterIntake: '3.5',
      meals: [
        { 
          time: '07:00', 
          title: 'Frühstück', 
          items: [
            { foodId: '', foodSearchInput: '', grams: '100', calories: '', protein: '', carbs: '', fat: '' }
          ] 
        }
      ]
    }
  ]);

  const [activeNutritionTemplateIndex, setActiveNutritionTemplateIndex] = useState(0);
  const [nutritionScheduleMap, setNutritionScheduleMap] = useState<{ [dateStr: string]: string }>({});
  const [draggedNutritionTemplateName, setDraggedNutritionTemplateName] = useState<string | null>(null);

  const [nutritionSaving, setNutritionSaving] = useState(false);
  const [nutritionMessage, setNutritionMessage] = useState('');

  const [workoutClientId, setWorkoutClientId] = useState('');
  const [planMainTitle, setPlanMainTitle] = useState('');
  const [planDurationWeeks, setPlanDurationWeeks] = useState('4 Wochen (1 Monat)');
  
  const [defaultTemplates] = useState(DEFAULT_WORKOUT_TEMPLATES);
  const [customTemplates, setCustomTemplates] = useState<any[]>([
    {
      templateName: 'Push (Brust, Schultern, Trizeps)',
      isDefault: false,
      exercises: [
        { exercise: 'Langhantel-Bankdrücken', sets: '3', reps: '10', weight: '50' }
      ]
    }
  ]);

  const [activeTemplateIndex, setActiveTemplateIndex] = useState(0);
  const [workoutScheduleMap, setWorkoutScheduleMap] = useState<{ [dateStr: string]: string }>({});
  const [draggedTemplateName, setDraggedTemplateName] = useState<string | null>(null);

  const [workoutSaving, setWorkoutSaving] = useState(false);
  const [workoutMessage, setWorkoutMessage] = useState('');

  useEffect(() => {
    async function loadTrainerData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data } = await supabase
        .from('trainers')
        .select('*')
        .eq('email', user.email)
        .single();

      if (data) {
        setTrainer(data);
        setName(data.name || '');
        setBio(data.bio || '');
        setCity(data.city || '');
        setServiceMode(data.service_mode || 'Vor Ort & Online');
        
        if (data.specialties) {
          setSelectedSpecialties(
            data.specialties.split(',').map((s: string) => s.trim()).filter(Boolean)
          );
        }

        setLicenseNumber(data.license_number || '');
        setInsuranceExpiry(data.liability_insurance_expiry || '');
        setPackageCategory(data.package_category || '');
        setPackageDuration(data.package_duration || '');
        setPackagePrice(data.package_price ? String(data.package_price) : '');
        setAvailabilityStatus(data.availability_status || 'available');

        loadSlots(data.id);
        loadBookingRequests(data.id);
        loadClients();
        loadFoodDatabase();
      }
      setLoading(false);
    }

    loadTrainerData();
  }, [router]);

  async function loadSlots(trainerId: string) {
    const { data } = await supabase
      .from('trainer_slots')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('slot_date', { ascending: true });
    if (data) setSlots(data);
  }

  async function loadBookingRequests(trainerId: string) {
    const { data } = await supabase
      .from('trainer_slots')
      .select('*, users(name, email)')
      .eq('trainer_id', trainerId)
      .in('status', ['pending', 'booked'])
      .order('slot_date', { ascending: true });
    if (data) {}
  }

  async function loadClients() {
    const { data } = await supabase.from('users').select('*');
    if (data) setClients(data);
  }

  async function loadFoodDatabase() {
    const { data, error } = await supabase.from('foods').select('*').order('name', { ascending: true });
    if (data && data.length > 0) {
      setFoodDatabase(data);
    } else {
      setFoodDatabase([
        { id: '1', name: 'Haferflocken', kcal: 370, protein: 13.5, carbs: 58.7, fat: 7.0 },
        { id: '2', name: 'Hähnchenbrust (roh)', kcal: 105, protein: 23.0, carbs: 0.0, fat: 1.2 },
        { id: '3', name: 'Reis (langkorn, roh)', kcal: 350, protein: 7.0, carbs: 78.0, fat: 0.6 },
        { id: '4', name: 'Banane', kcal: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
        { id: '5', name: 'Magerquark', kcal: 67, protein: 12.0, carbs: 4.0, fat: 0.2 },
        { id: '6', name: 'Erdnussbutter', kcal: 588, protein: 25.0, carbs: 16.0, fat: 50.0 },
        { id: '7', name: 'Lachs (roh)', kcal: 206, protein: 20.0, carbs: 0.0, fat: 13.5 },
        { id: '8', name: 'Kartoffeln (gekocht)', kcal: 86, protein: 2.0, carbs: 18.5, fat: 0.1 },
        { id: '9', name: 'Avocado', kcal: 160, protein: 2.0, carbs: 0.4, fat: 15.0 },
        { id: '10', name: 'Brokkoli', kcal: 34, protein: 3.7, carbs: 3.0, fat: 0.4 }
      ]);
    }
  }

  // Aktives Ernährungs-Template Helfer
  const activeNutritionTemplate = customNutritionTemplates[activeNutritionTemplateIndex] || customNutritionTemplates[0];

  function handleAddMealRow() {
    const updated = [...customNutritionTemplates];
    updated[activeNutritionTemplateIndex].meals.push({
      time: '12:00',
      title: 'Zwischenmahlzeit',
      items: [
        { foodId: '', foodSearchInput: '', grams: '100', calories: '', protein: '', carbs: '', fat: '' }
      ]
    });
    setCustomNutritionTemplates(updated);
  }

  function handleRemoveMealRow(mealIndex: number) {
    const updated = [...customNutritionTemplates];
    updated[activeNutritionTemplateIndex].meals = updated[activeNutritionTemplateIndex].meals.filter((_: any, i: number) => i !== mealIndex);
    setCustomNutritionTemplates(updated);
  }

  function handleMealHeaderChange(mealIndex: number, field: string, value: string) {
    const updated = [...customNutritionTemplates];
    updated[activeNutritionTemplateIndex].meals[mealIndex] = { 
      ...updated[activeNutritionTemplateIndex].meals[mealIndex], 
      [field]: value 
    };
    setCustomNutritionTemplates(updated);
  }

  function handleAddFoodItemToMeal(mealIndex: number) {
    const updated = [...customNutritionTemplates];
    updated[activeNutritionTemplateIndex].meals[mealIndex].items.push({
      foodId: '',
      foodSearchInput: '',
      grams: '100',
      calories: '',
      protein: '',
      carbs: '',
      fat: ''
    });
    setCustomNutritionTemplates(updated);
  }

  function handleRemoveFoodItemFromMeal(mealIndex: number, itemIndex: number) {
    const updated = [...customNutritionTemplates];
    updated[activeNutritionTemplateIndex].meals[mealIndex].items = updated[activeNutritionTemplateIndex].meals[mealIndex].items.filter((_: any, i: number) => i !== itemIndex);
    setCustomNutritionTemplates(updated);
  }

  function handleSelectFoodItem(mealIndex: number, itemIndex: number, food: any) {
    const updated = [...customNutritionTemplates];
    const currentGrams = parseFloat(updated[activeNutritionTemplateIndex].meals[mealIndex].items[itemIndex].grams) || 100;
    const factor = currentGrams / 100;

    updated[activeNutritionTemplateIndex].meals[mealIndex].items[itemIndex] = {
      ...updated[activeNutritionTemplateIndex].meals[mealIndex].items[itemIndex],
      foodId: food.id,
      foodSearchInput: food.name,
      calories: Math.round((food.kcal || 0) * factor).toString(),
      protein: ((food.protein || 0) * factor).toFixed(1),
      carbs: ((food.carbs || 0) * factor).toFixed(1),
      fat: ((food.fat || 0) * factor).toFixed(1),
    };
    setCustomNutritionTemplates(updated);
  }

  function handleFoodSearchInputChange(mealIndex: number, itemIndex: number, val: string) {
    const updated = [...customNutritionTemplates];
    const foundFood = foodDatabase.find(f => f.name.toLowerCase() === val.toLowerCase());
    const currentGrams = parseFloat(updated[activeNutritionTemplateIndex].meals[mealIndex].items[itemIndex].grams) || 100;
    const factor = currentGrams / 100;

    updated[activeNutritionTemplateIndex].meals[mealIndex].items[itemIndex] = {
      ...updated[activeNutritionTemplateIndex].meals[mealIndex].items[itemIndex],
      foodSearchInput: val,
      foodId: foundFood ? foundFood.id : '',
      calories: foundFood ? Math.round((foundFood.kcal || 0) * factor).toString() : updated[activeNutritionTemplateIndex].meals[mealIndex].items[itemIndex].calories,
      protein: foundFood ? ((foundFood.protein || 0) * factor).toFixed(1) : updated[activeNutritionTemplateIndex].meals[mealIndex].items[itemIndex].protein,
      carbs: foundFood ? ((foundFood.carbs || 0) * factor).toFixed(1) : updated[activeNutritionTemplateIndex].meals[mealIndex].items[itemIndex].carbs,
      fat: foundFood ? ((foundFood.fat || 0) * factor).toFixed(1) : updated[activeNutritionTemplateIndex].meals[mealIndex].items[itemIndex].fat,
    };
    setCustomNutritionTemplates(updated);
  }

  function handleGramsChange(mealIndex: number, itemIndex: number, newGramsStr: string) {
    const updated = [...customNutritionTemplates];
    updated[activeNutritionTemplateIndex].meals[mealIndex].items[itemIndex].grams = newGramsStr;

    const currentFoodId = updated[activeNutritionTemplateIndex].meals[mealIndex].items[itemIndex].foodId;
    const currentSearch = updated[activeNutritionTemplateIndex].meals[mealIndex].items[itemIndex].foodSearchInput;
    
    const foundFood = foodDatabase.find(f => f.id === currentFoodId || f.name.toLowerCase() === currentSearch.toLowerCase());
    if (foundFood) {
      const grams = parseFloat(newGramsStr) || 0;
      const factor = grams / 100;

      updated[activeNutritionTemplateIndex].meals[mealIndex].items[itemIndex].foodId = foundFood.id;
      updated[activeNutritionTemplateIndex].meals[mealIndex].items[itemIndex].calories = Math.round((foundFood.kcal || 0) * factor).toString();
      updated[activeNutritionTemplateIndex].meals[mealIndex].items[itemIndex].protein = ((foundFood.protein || 0) * factor).toFixed(1);
      updated[activeNutritionTemplateIndex].meals[mealIndex].items[itemIndex].carbs = ((foundFood.carbs || 0) * factor).toFixed(1);
      updated[activeNutritionTemplateIndex].meals[mealIndex].items[itemIndex].fat = ((foundFood.fat || 0) * factor).toFixed(1);
    }
    setCustomNutritionTemplates(updated);
  }

  function handleSelectDefaultNutritionTemplate(dt: any) {
    const clonedMeals = JSON.parse(JSON.stringify(dt.meals));
    const updatedCustoms = [...customNutritionTemplates];
    updatedCustoms[activeNutritionTemplateIndex] = {
      templateName: dt.templateName,
      isDefault: false,
      targetCalories: dt.targetCalories,
      targetProtein: dt.targetProtein,
      targetCarbs: dt.targetCarbs,
      targetFat: dt.targetFat,
      waterIntake: dt.waterIntake,
      meals: clonedMeals
    };
    setCustomNutritionTemplates(updatedCustoms);
  }

  function handleAddCustomNutritionTemplate() {
    const nextNum = customNutritionTemplates.length + 1;
    const newTemplates = [
      ...customNutritionTemplates,
      {
        templateName: `Eigenes Ernährungs-Template ${nextNum}`,
        isDefault: false,
        targetCalories: '2500',
        targetProtein: '180',
        targetCarbs: '250',
        targetFat: '70',
        waterIntake: '3.5',
        meals: [
          { time: '08:00', title: 'Frühstück', items: [{ foodId: '', foodSearchInput: '', grams: '100', calories: '', protein: '', carbs: '', fat: '' }] }
        ]
      }
    ];
    setCustomNutritionTemplates(newTemplates);
    setActiveNutritionTemplateIndex(newTemplates.length - 1);
  }

  function handleRemoveCustomNutritionTemplate(index: number) {
    if (customNutritionTemplates.length <= 1) {
      alert('Du musst mindestens ein eigenes Template behalten.');
      return;
    }
    const removedName = customNutritionTemplates[index].templateName;
    const updated = customNutritionTemplates.filter((_, i) => i !== index);
    setCustomNutritionTemplates(updated);
    setActiveNutritionTemplateIndex(Math.max(0, index - 1));

    const updatedMap = { ...nutritionScheduleMap };
    Object.keys(updatedMap).forEach((dateKey) => {
      if (updatedMap[dateKey] === removedName) {
        delete updatedMap[dateKey];
      }
    });
    setNutritionScheduleMap(updatedMap);
  }

  function handleNutritionTemplateNameChange(value: string) {
    const oldName = customNutritionTemplates[activeNutritionTemplateIndex]?.templateName;
    const updated = [...customNutritionTemplates];
    updated[activeNutritionTemplateIndex].templateName = value;
    setCustomNutritionTemplates(updated);

    if (oldName) {
      const updatedMap = { ...nutritionScheduleMap };
      Object.keys(updatedMap).forEach((dateKey) => {
        if (updatedMap[dateKey] === oldName) {
          updatedMap[dateKey] = value;
        }
      });
      setNutritionScheduleMap(updatedMap);
    }
  }

  function handleNutritionMacroChange(field: string, value: string) {
    const updated = [...customNutritionTemplates];
    updated[activeNutritionTemplateIndex][field] = value;
    setCustomNutritionTemplates(updated);
  }

  function handleDragStartNutritionTemplate(e: React.DragEvent, templateName: string) {
    setDraggedNutritionTemplateName(templateName);
    e.dataTransfer.setData('text/plain', templateName);
  }

  function handleDropOnNutritionDate(e: React.DragEvent, dateStr: string) {
    e.preventDefault();
    const templateToAssign = draggedNutritionTemplateName || e.dataTransfer.getData('text/plain');
    if (templateToAssign) {
      setNutritionScheduleMap({
        ...nutritionScheduleMap,
        [dateStr]: templateToAssign
      });
    }
    setDraggedNutritionTemplateName(null);
  }

  function handleRemoveNutritionTemplateFromDateDirect(dateStr: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = { ...nutritionScheduleMap };
    delete updated[dateStr];
    setNutritionScheduleMap(updated);
  }

  async function handleAddNewFood(e: React.FormEvent) {
    e.preventDefault();
    if (!newFoodName || !newFoodKcal) return;

    const payload = {
      name: newFoodName,
      kcal: parseFloat(newFoodKcal) || 0,
      protein: parseFloat(newFoodProtein) || 0,
      carbs: parseFloat(newFoodCarbs) || 0,
      fat: parseFloat(newFoodFat) || 0
    };

    const { data, error } = await supabase.from('foods').insert(payload).select().single();

    if (error) {
      alert('Fehler beim Hinzufügen des Lebensmittels: ' + error.message);
    } else if (data) {
      setFoodDatabase([...foodDatabase, data].sort((a, b) => a.name.localeCompare(b.name, 'de')));
      setNewFoodName('');
      setNewFoodKcal('');
      setNewFoodProtein('');
      setNewFoodCarbs('');
      setNewFoodFat('');
      setIsFoodModalOpen(false);
    }
  }

  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfMonth(year: number, month: number) {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  }

  function handlePrevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }

  function handleNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }

  async function handleToggleHourSlot(timeStr: string) {
    if (!trainer || !selectedCalendarDate) return;

    const formattedTime = timeStr.length === 5 ? timeStr + ':00' : timeStr;
    const existingSlot = slots.find(
      (s) => s.slot_date === selectedCalendarDate && s.slot_time.startsWith(timeStr)
    );

    if (existingSlot) {
      const { error } = await supabase.from('trainer_slots').delete().eq('id', existingSlot.id);
      if (error) {
        alert('Fehler beim Löschen des Slots: ' + error.message);
      } else {
        loadSlots(trainer.id);
        loadBookingRequests(trainer.id);
      }
    } else {
      const payload = {
        trainer_id: trainer.id,
        slot_date: selectedCalendarDate,
        slot_time: formattedTime,
        title: slotTitle,
        price: slotPrice ? parseFloat(slotPrice) : 0,
        status: 'free'
      };

      const { error } = await supabase.from('trainer_slots').insert(payload);
      if (error) {
        alert('Fehler beim Erstellen des Slots: ' + error.message);
      } else {
        loadSlots(trainer.id);
        loadBookingRequests(trainer.id);
      }
    }
  }

  const handleSaveOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOffer.title) return;

    if (editingOfferId) {
      setOffers(offers.map(o => o.id === editingOfferId ? { ...o, ...currentOffer } as OfferTemplate : o));
      setEditingOfferId(null);
    } else {
      const newOffer: OfferTemplate = {
        id: Date.now().toString(),
        title: currentOffer.title || 'Neues Angebot',
        type: currentOffer.type || 'paid',
        duration: Number(currentOffer.duration) || 60,
        price: currentOffer.type === 'discovery' ? 0 : Number(currentOffer.price) || 0,
        description: currentOffer.description || ''
      };
      setOffers([...offers, newOffer]);
    }

    setCurrentOffer({ title: '', type: 'paid', duration: 60, price: 90, description: '' });
    setIsOfferModalOpen(false);
  };

  const handleEditOffer = (offer: OfferTemplate) => {
    setEditingOfferId(offer.id);
    setCurrentOffer(offer);
    setIsOfferModalOpen(true);
  };

  const handleDeleteOffer = (id: string) => {
    setOffers(offers.filter(o => o.id !== id));
  };

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfferForBooking || !bookingClientName || !bookingDate || !bookingTime) return;

    const newAppointment: Appointment = {
      id: Date.now().toString(),
      title: selectedOfferForBooking.title,
      clientName: bookingClientName,
      clientEmail: bookingClientEmail,
      date: bookingDate,
      time: bookingTime,
      duration: selectedOfferForBooking.duration,
      type: selectedOfferForBooking.type,
      price: selectedOfferForBooking.price,
      status: selectedOfferForBooking.type === 'discovery' ? 'confirmed' : 'pending',
      location: 'Video Call (Zoom)'
    };

    setAppointments([...appointments, newAppointment]);
    setIsBookingModalOpen(false);
    setSelectedOfferForBooking(null);
    setBookingClientName('');
    setBookingClientEmail('');
    setBookingDate('');
    setBookingTime('');
  };

  const handleUpdateAppointmentStatus = (id: string, status: 'confirmed' | 'cancelled') => {
    setAppointments(appointments.map(app => app.id === id ? { ...app, status } : app));
  };

  function handleDragStartTemplate(e: React.DragEvent, templateName: string) {
    setDraggedTemplateName(templateName);
    e.dataTransfer.setData('text/plain', templateName);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDropOnDate(e: React.DragEvent, dateStr: string) {
    e.preventDefault();
    const templateToAssign = draggedTemplateName || e.dataTransfer.getData('text/plain');
    if (templateToAssign) {
      setWorkoutScheduleMap({
        ...workoutScheduleMap,
        [dateStr]: templateToAssign
      });
    }
    setDraggedTemplateName(null);
  }

  function handleRemoveTemplateFromDateDirect(dateStr: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = { ...workoutScheduleMap };
    delete updated[dateStr];
    setWorkoutScheduleMap(updated);
  }

  async function handleCreateWorkoutPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!workoutClientId || !planMainTitle || !trainer) {
      setWorkoutMessage('Bitte wähle einen Kunden und einen Gesamt-Namen für den Monatsplan aus.');
      return;
    }

    setWorkoutSaving(true);
    setWorkoutMessage('');

    const completePlanPayload = {
      duration_period: planDurationWeeks,
      days: customTemplates,
      schedule: workoutScheduleMap
    };

    const payload = {
      trainer_id: trainer.id,
      user_id: workoutClientId,
      plan_type: 'workout',
      title: `${planMainTitle} (${planDurationWeeks})`,
      content: JSON.stringify(completePlanPayload),
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('client_plans').insert(payload);

    if (error) {
      setWorkoutMessage('Fehler beim Speichern des Monatsplans: ' + error.message);
    } else {
      setWorkoutMessage('Monats- & Zeitraumplan erfolgreich für den Kunden übertragen!');
      setPlanMainTitle('');
    }
    setWorkoutSaving(false);
  }

  function handleSelectDefaultTemplate(dt: any) {
    const clonedExercises = dt.exercises.map((ex: any) => ({ ...ex }));
    const updatedCustoms = [...customTemplates];
    updatedCustoms[activeTemplateIndex] = {
      templateName: dt.templateName,
      isDefault: false,
      exercises: clonedExercises
    };
    setCustomTemplates(updatedCustoms);
  }

  function handleAddCustomWorkoutTemplate() {
    const nextTemplateNum = customTemplates.length + 1;
    const newTemplates = [
      ...customTemplates,
      {
        templateName: `Eigenes Custom Template ${nextTemplateNum}`,
        isDefault: false,
        exercises: [{ exercise: 'Langhantel-Bankdrücken', sets: '3', reps: '10', weight: '50' }]
      }
    ];
    setCustomTemplates(newTemplates);
    setActiveTemplateIndex(newTemplates.length - 1);
  }

  function handleRemoveCustomWorkoutTemplate(index: number) {
    if (customTemplates.length <= 1) {
      alert('Du musst mindestens ein eigenes Template behalten.');
      return;
    }
    const removedName = customTemplates[index].templateName;
    const updated = customTemplates.filter((_, i) => i !== index);
    setCustomTemplates(updated);
    setActiveTemplateIndex(Math.max(0, index - 1));

    const updatedMap = { ...workoutScheduleMap };
    Object.keys(updatedMap).forEach((dateKey) => {
      if (updatedMap[dateKey] === removedName) {
        delete updatedMap[dateKey];
      }
    });
    setWorkoutScheduleMap(updatedMap);
  }

  function handleTemplateNameChange(value: string) {
    const oldName = customTemplates[activeTemplateIndex]?.templateName;
    const updated = [...customTemplates];
    updated[activeTemplateIndex].templateName = value;
    setCustomTemplates(updated);

    if (oldName) {
      const updatedMap = { ...workoutScheduleMap };
      Object.keys(updatedMap).forEach((dateKey) => {
        if (updatedMap[dateKey] === oldName) {
          updatedMap[dateKey] = value;
        }
      });
      setWorkoutScheduleMap(updatedMap);
    }
  }

  function handleAddExerciseToActiveTemplate() {
    const updated = [...customTemplates];
    updated[activeTemplateIndex].exercises.push({
      exercise: 'Langhantel-Bankdrücken',
      sets: '3',
      reps: '10',
      weight: '50'
    });
    setCustomTemplates(updated);
  }

  function handleRemoveExerciseFromActiveTemplate(exIndex: number) {
    const updated = [...customTemplates];
    updated[activeTemplateIndex].exercises = updated[activeTemplateIndex].exercises.filter(
      (_: any, i: number) => i !== exIndex
    );
    setCustomTemplates(updated);
  }

  function handleExerciseChangeInActiveTemplate(exIndex: number, field: string, value: string) {
    const updated = [...customTemplates];
    updated[activeTemplateIndex].exercises[exIndex] = {
      ...updated[activeTemplateIndex].exercises[exIndex],
      [field]: value
    };
    setCustomTemplates(updated);
  }

  async function handleCreateNutritionPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!nutritionClientId || !nutritionMainTitle || !trainer) {
      setNutritionMessage('Bitte wähle einen Kunden und einen Gesamt-Namen für den Ernährungsplan aus.');
      return;
    }

    setNutritionSaving(true);
    setNutritionMessage('');

    const completeNutritionPlanPayload = {
      duration_period: nutritionDurationWeeks,
      days: customNutritionTemplates,
      schedule: nutritionScheduleMap
    };

    const payload = {
      trainer_id: trainer.id,
      user_id: nutritionClientId,
      plan_type: 'nutrition',
      title: `${nutritionMainTitle} (${nutritionDurationWeeks})`,
      content: JSON.stringify(completeNutritionPlanPayload),
      created_at: new Date().toISOString()
    };

    const { error: insertError } = await supabase.from('client_plans').insert(payload);

    if (insertError) {
      setNutritionMessage('Fehler beim Speichern des Ernährungsplans: ' + insertError.message);
    } else {
      setNutritionMessage('Ernährungs-Monatsplan erfolgreich in das Kunden-Dashboard übertragen!');
      setNutritionMainTitle('');
    }
    setNutritionSaving(false);
  }

  async function toggleSpecialty(spec: string) {
    let updatedSpecialties: string[];
    
    if (selectedSpecialties.includes(spec)) {
      updatedSpecialties = selectedSpecialties.filter((s) => s !== spec);
    } else {
      updatedSpecialties = [...selectedSpecialties, spec];
    }

    setSelectedSpecialties(updatedSpecialties);

    if (trainer) {
      const specialtiesString = updatedSpecialties.join(', ');
      const { error } = await supabase
        .from('trainers')
        .update({ specialties: specialtiesString })
        .eq('id', trainer.id);

      if (error) {
        console.error('Fehler beim Speichern der Spezialisierungen:', error.message);
      }
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const specialtiesString = selectedSpecialties.join(', ');

    const { error } = await supabase
      .from('trainers')
      .update({
        name,
        bio,
        city,
        service_mode: serviceMode,
        specialties: specialtiesString,
        license_number: licenseNumber,
        liability_insurance_expiry: insuranceExpiry || null,
        package_category: packageCategory,
        package_duration: packageDuration,
        package_price: packagePrice ? parseFloat(packagePrice) : null,
        availability_status: availabilityStatus,
      })
      .eq('id', trainer.id);

    if (error) {
      setMessage('Fehler beim Speichern: ' + error.message);
    } else {
      setMessage('Profil erfolgreich aktualisiert!');
      
      const { data: updatedTrainer } = await supabase
        .from('trainers')
        .select('*')
        .eq('id', trainer.id)
        .single();
        
      if (updatedTrainer) {
        setTrainer(updatedTrainer);
      }
    }
    setSaving(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">Lade VeriFit Expert Hub...</p>
        </div>
      </div>
    );
  }

  const activeTemplate = customTemplates[activeTemplateIndex] || customTemplates[0];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-black tracking-wider text-emerald-400 flex items-center gap-2">
            VERIFIT<span className="text-white">.</span> 
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-semibold">Expert Hub</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex text-xs bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-full text-slate-300 shadow-inner">
              Status: <strong className={`ml-1.5 ${trainer?.status === 'approved' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {trainer?.status === 'approved' ? 'Verifiziert ✓' : 'Prüfung ausstehend'}
              </strong>
            </span>
            <button
              onClick={handleLogout}
              className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white px-4 py-2 rounded-xl transition font-medium border border-slate-800 cursor-pointer shadow-sm"
            >
              Abmelden
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Sections */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 w-full flex-1 space-y-10">
        
        {/* 1. Persönliche Angaben */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Persönliche Angaben (Profilbild, Stammdaten, Name, etc.)</h1>
              <p className="text-slate-400 text-xs">Pflege deinen vollständigen Namen, Standort und deine Kurzbeschreibung.</p>
            </div>
          </div>

          {message && (
            <div className={`p-3.5 rounded-xl text-xs font-medium border ${message.includes('Fehler') ? 'bg-red-500/10 border-red-500/25 text-red-400' : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Vollständiger Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition shadow-inner"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Standort (Stadt)</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Bio / Über mich</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition shadow-inner resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3.5 rounded-xl text-sm transition shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              {saving ? 'Speichere...' : 'Profil aktualisieren'}
            </button>
          </form>
        </div>

        {/* 2. Kompetenzgebiete */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Dumbbell size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Kompetenzgebiete (Fachgebiete, Trainingsphilosophie)</h2>
              <p className="text-slate-400 text-xs">Wähle deine spezifischen Fachgebiete und Trainingsausrichtungen aus.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Spezialisierungen</label>
            
            {selectedSpecialties.length > 0 && (
              <div className="mb-3 p-3.5 bg-slate-950/80 rounded-xl border border-emerald-500/30 space-y-2">
                <span className="block text-[10px] uppercase tracking-wider font-bold text-emerald-400">
                  Bereits ausgewählt ({selectedSpecialties.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSpecialties.map((spec: string) => (
                    <span
                      key={`selected-${spec}`}
                      className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-lg text-xs font-medium"
                    >
                      {spec}
                      <button
                        type="button"
                        onClick={() => toggleSpecialty(spec)}
                        className="hover:text-white font-bold text-sm leading-none cursor-pointer"
                        title="Entfernen"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              {AVAILABLE_SPECIALTIES.map((spec: string) => {
                const isSelected = selectedSpecialties.includes(spec);
                return (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => toggleSpecialty(spec)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span>{spec}</span>
                    {isSelected && <span className="text-[10px] text-emerald-400 font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. Lizenzen, Ausweis & Verifizierungs-Bereich */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Lizenzen, Ausweis & Verifizierungs-Bereich</h2>
              <p className="text-slate-400 text-xs">Uploads und Status für amtlichen Ausweis, Berufshaftpflicht und Trainerlizenzen für die Admin-Prüfung.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Lizenznummer / Zertifikat</label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="z.B. A-Lizenz Fitness"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Haftpflichtversicherung gültig bis</label>
              <input
                type="date"
                value={insuranceExpiry}
                onChange={(e) => setInsuranceExpiry(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* 4. Angebots-Ersteller */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <Briefcase size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Angebots-Ersteller</h2>
                <p className="text-slate-400 text-xs">Erstellung und Verwaltung von Trainer-Paketen und Coaching-Angeboten.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  setEditingOfferId(null);
                  setCurrentOffer({ title: '', type: 'paid', duration: 60, price: 90, description: '' });
                  setIsOfferModalOpen(true);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition cursor-pointer shadow-sm"
              >
                <Plus size={14} /> Angebot erstellen
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {offers.map((offer) => (
              <div key={offer.id} className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      offer.type === 'discovery' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}>
                      {offer.type === 'discovery' ? 'Kostenlos (0€)' : 'Bezahlt'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEditOffer(offer)} className="text-slate-400 hover:text-white p-1 cursor-pointer" title="Bearbeiten">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDeleteOffer(offer.id)} className="text-slate-400 hover:text-red-400 p-1 cursor-pointer" title="Löschen">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">{offer.title}</h3>
                  <p className="text-slate-400 text-xs mb-4">{offer.description}</p>
                </div>
                <div className="pt-3 border-t border-slate-900 flex items-center justify-between">
                  <div className="text-xs text-slate-300 flex items-center gap-1">
                    <Clock size={12} className="text-slate-400" /> {offer.duration} Min.
                  </div>
                  <div className="text-sm font-bold text-emerald-400">
                    {offer.price === 0 ? '0,00 €' : `${offer.price} €`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Terminkalender */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <CalendarDays size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Terminkalender</h2>
                <p className="text-slate-400 text-xs">Verwaltung freier Termine, Verfügbarkeiten und Auslastung.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsBookingModalOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <CalendarIcon size={14} /> Termin eintragen
              </button>
            </div>
          </div>

          <div className="flex gap-4 border-b border-slate-800/80">
            <button
              onClick={() => setActiveCalendarTab('schedule')}
              className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-2 cursor-pointer ${
                activeCalendarTab === 'schedule' 
                  ? 'border-emerald-400 text-emerald-400' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarIcon size={14} /> Termine ({appointments.length})
            </button>
          </div>

          {activeCalendarTab === 'schedule' && (
            <div className="space-y-4">
              {appointments.length === 0 ? (
                <div className="text-center py-10 bg-slate-950/60 rounded-2xl border border-slate-800/80">
                  <CalendarIcon className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                  <p className="text-slate-400 text-xs">Keine Termine vorhanden.</p>
                </div>
              ) : (
                appointments.map((app) => (
                  <div 
                    key={app.id} 
                    className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          app.type === 'discovery' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {app.type === 'discovery' ? '0€ Discovery Call' : 'Kostenpflichtig'}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                          app.status === 'confirmed' ? 'bg-green-500/10 text-green-400' :
                          app.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {app.status === 'confirmed' ? 'Bestätigt' : app.status === 'pending' ? 'Ausstehend' : 'Storniert'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white">{app.title}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                        <span className="flex items-center gap-1 text-emerald-300 font-medium">
                          <User size={12} /> {app.clientName}
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <CalendarIcon size={12} /> {app.date} ({app.time})
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-emerald-400">
                          <DollarSign size={12} /> {app.price} €
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      {app.status === 'pending' && (
                        <button 
                          onClick={() => handleUpdateAppointmentStatus(app.id, 'confirmed')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                        >
                          <CheckCircle size={12} /> Bestätigen
                        </button>
                      )}
                      {app.status !== 'cancelled' && (
                        <button 
                          onClick={() => handleUpdateAppointmentStatus(app.id, 'cancelled')}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                        >
                          <XCircle size={12} /> Absagen
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Verfügbarkeiten & Slots Block */}
          <div className="space-y-6 pt-6 border-t border-slate-800/80">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Standard-Titel für Slots</label>
                <input
                  type="text"
                  value={slotTitle}
                  onChange={(e) => setSlotTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Preis pro Slot (€)</label>
                <input
                  type="number"
                  value={slotPrice}
                  onChange={(e) => setSlotPrice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800/80 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold tracking-wide text-white">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    &larr; Zurück
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Weiter &rarr;
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-500 uppercase tracking-wider py-1 border-b border-slate-800/80">
                <div>Mo</div><div>Di</div><div>Mi</div><div>Do</div><div>Fr</div><div>Sa</div><div>So</div>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: getFirstDayOfMonth(currentYear, currentMonth) }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-12 bg-transparent" />
                ))}

                {Array.from({ length: getDaysInMonth(currentYear, currentMonth) }).map((_, i) => {
                  const dayNum = i + 1;
                  const formattedDay = String(dayNum).padStart(2, '0');
                  const formattedMonthNum = String(currentMonth + 1).padStart(2, '0');
                  const dateStr = `${currentYear}-${formattedMonthNum}-${formattedDay}`;

                  const isSelected = selectedCalendarDate === dateStr;
                  const hasSlotsOnThisDay = slots.some((s: any) => s.slot_date === dateStr);

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => setSelectedCalendarDate(dateStr)}
                      className={`h-12 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-lg shadow-emerald-500/20 scale-105 z-10'
                          : hasSlotsOnThisDay
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:border-emerald-500/60'
                          : 'bg-slate-900 text-slate-300 border-slate-800/80 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <span>{dayNum}</span>
                      {hasSlotsOnThisDay && !isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800/80 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Stunden für: <span className="text-emerald-400">{selectedCalendarDate}</span>
                </span>
                <span className="text-[11px] text-slate-500">Klicke auf eine Stunde zum Freigeben</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                {SWIMMING_POOL_HOURS.map((hour: string) => {
                  const slotMatch = slots.find(
                    (s: any) => s.slot_date === selectedCalendarDate && s.slot_time.startsWith(hour)
                  );
                  const isFree = slotMatch?.status === 'free';
                  const isPending = slotMatch?.status === 'pending';
                  const isBooked = slotMatch?.status === 'booked';

                  return (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => handleToggleHourSlot(hour)}
                      className={`p-3 rounded-xl text-xs transition border flex flex-col items-center justify-between gap-1 cursor-pointer ${
                        isBooked
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : isPending
                          ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                          : isFree
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-bold">{hour} Uhr</span>
                        <span>{slotMatch ? '✓' : '+'}</span>
                      </div>
                      <div className="w-full text-center">
                        <span className="text-[9px] uppercase font-semibold">
                          {isBooked ? 'Gebucht' : isPending ? 'Angefragt' : isFree ? 'Frei' : 'Inaktiv'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 6. Kundenchat */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Kundenchat</h2>
              <p className="text-slate-400 text-xs">Direkter Kommunikationskanal zu den betreuten Kunden.</p>
            </div>
          </div>
          {trainer && <Chat currentUserId={trainer.id} />}
        </div>

        {/* 7. Tools: Ernährungsplaner & Krafttrainingsplaner */}
        <div className="space-y-10">
          {/* Krafttrainingsplaner */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <Dumbbell size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Krafttrainingsplaner</h2>
                <p className="text-slate-400 text-xs">Templates per Drag & Drop auf Kalendertage ziehen oder per Klick in den Editor laden.</p>
              </div>
            </div>

            {workoutMessage && (
              <div className={`p-3.5 rounded-xl text-xs font-medium border ${workoutMessage.includes('Fehler') ? 'bg-red-500/10 border-red-500/25 text-red-400' : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'}`}>
                {workoutMessage}
              </div>
            )}

            <form onSubmit={handleCreateWorkoutPlan} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Kunde auswählen</label>
                  <select
                    value={workoutClientId}
                    onChange={(e) => setWorkoutClientId(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition shadow-inner"
                    required
                  >
                    <option value="">Kunde wählen...</option>
                    {clients.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name || c.email}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Gesamt-Titel des Plans</label>
                  <input
                    type="text"
                    placeholder="z.B. 4-Wochen Hypertrophie-Plan"
                    value={planMainTitle}
                    onChange={(e) => setPlanMainTitle(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition shadow-inner"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Zeitraum / Dauer</label>
                  <select
                    value={planDurationWeeks}
                    onChange={(e) => setPlanDurationWeeks(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition shadow-inner"
                  >
                    <option value="2 Wochen">2 Wochen</option>
                    <option value="4 Wochen (1 Monat)">4 Wochen (1 Monat)</option>
                    <option value="8 Wochen (2 Monate)">8 Wochen (2 Monate)</option>
                    <option value="12 Wochen (3 Monate)">12 Wochen (3 Monate)</option>
                  </select>
                </div>
              </div>

              {/* Kalender Grid */}
              <div className="bg-slate-950/60 p-5 sm:p-6 rounded-2xl border border-slate-800/80 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold tracking-wide text-white">
                      Monatsplan Kalender: {MONTH_NAMES[currentMonth]} {currentYear}
                    </h3>
                    <p className="text-[11px] text-slate-400">Ziehe ein Template aus der Leiste auf den gewünschten Tag.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      &larr; Zurück
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      Weiter &rarr;
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-500 uppercase tracking-wider py-1 border-b border-slate-800/80">
                  <div>Mo</div><div>Di</div><div>Mi</div><div>Do</div><div>Fr</div><div>Sa</div><div>So</div>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: getFirstDayOfMonth(currentYear, currentMonth) }).map((_, i) => (
                    <div key={`w-empty-${i}`} className="h-20 bg-transparent" />
                  ))}

                  {Array.from({ length: getDaysInMonth(currentYear, currentMonth) }).map((_, i) => {
                    const dayNum = i + 1;
                    const formattedDay = String(dayNum).padStart(2, '0');
                    const formattedMonthNum = String(currentMonth + 1).padStart(2, '0');
                    const dateStr = `${currentYear}-${formattedMonthNum}-${formattedDay}`;

                    const assignedTemplate = workoutScheduleMap[dateStr];

                    return (
                      <div
                        key={dateStr}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnDate(e, dateStr)}
                        className={`h-20 rounded-xl p-2 text-xs transition flex flex-col justify-between border text-left ${
                          assignedTemplate
                            ? 'bg-emerald-500/15 border-emerald-500/50 shadow-inner'
                            : 'bg-slate-900/50 border-slate-800/70 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-bold text-slate-300">{dayNum}</span>
                          {assignedTemplate && (
                            <button
                              type="button"
                              onClick={(e) => handleRemoveTemplateFromDateDirect(dateStr, e)}
                              title="Template entfernen"
                              className="bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold transition cursor-pointer"
                            >
                              &times;
                            </button>
                          )}
                        </div>
                        <div className="overflow-hidden">
                          {assignedTemplate ? (
                            <span className="block text-[9px] font-semibold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded truncate">
                              {assignedTemplate}
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-600 italic">Hierher ziehen</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Templates Leiste & Editor */}
              <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 space-y-4">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vorgaben (Klick zum Überschreiben des Editors):</span>
                  <div className="flex flex-wrap gap-2">
                    {defaultTemplates.map((dt: any, dIdx: number) => (
                      <div
                        key={dIdx}
                        draggable
                        onDragStart={(e) => handleDragStartTemplate(e, dt.templateName)}
                        onClick={() => handleSelectDefaultTemplate(dt)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold cursor-grab active:cursor-grabbing transition border flex items-center gap-2 select-none bg-slate-900 text-slate-300 border-slate-800 hover:border-emerald-500/50 hover:text-white shadow-sm"
                      >
                        <span>⚡ {dt.templateName}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-800/80">
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Eigene Templates:</span>
                    <button
                      type="button"
                      onClick={handleAddCustomWorkoutTemplate}
                      className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition"
                    >
                      + Template erstellen
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {customTemplates.map((ct: any, cIdx: number) => (
                      <div
                        key={cIdx}
                        draggable
                        onDragStart={(e) => handleDragStartTemplate(e, ct.templateName)}
                        onClick={() => setActiveTemplateIndex(cIdx)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-grab active:cursor-grabbing transition border flex items-center gap-2 select-none shadow-sm ${
                          activeTemplateIndex === cIdx
                            ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-bold'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span>⠿ {ct.templateName}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 space-y-4">
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="w-full md:w-1/2">
                      <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                        Name des aktiven Templates
                      </label>
                      <input
                        type="text"
                        value={activeTemplate?.templateName || ''}
                        onChange={(e) => handleTemplateNameChange(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    {customTemplates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomWorkoutTemplate(activeTemplateIndex)}
                        className="bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 px-3.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition self-end md:self-auto"
                      >
                        Template löschen
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Übungen für &quot;{activeTemplate?.templateName}&quot;
                      </h3>
                      <button
                        type="button"
                        onClick={handleAddExerciseToActiveTemplate}
                        className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition"
                      >
                        + Übung hinzufügen
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {activeTemplate?.exercises.map((item: any, index: number) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2.5 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 items-center">
                          <div className="md:col-span-5">
                            <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">Übung</label>
                            <select
                              value={item.exercise}
                              onChange={(e) => handleExerciseChangeInActiveTemplate(index, 'exercise', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                            >
                              {EXERCISE_OPTIONS.map((ex: string) => (
                                <option key={ex} value={ex}>{ex}</option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">Sets</label>
                            <input
                              type="text"
                              value={item.sets}
                              onChange={(e) => handleExerciseChangeInActiveTemplate(index, 'sets', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">Reps</label>
                            <input
                              type="text"
                              value={item.reps}
                              onChange={(e) => handleExerciseChangeInActiveTemplate(index, 'reps', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">Gewicht</label>
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                value={item.weight}
                                onChange={(e) => handleExerciseChangeInActiveTemplate(index, 'weight', e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-7 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                              />
                              <span className="absolute right-2 text-xs text-slate-400 font-medium pointer-events-none">kg</span>
                            </div>
                          </div>
                          <div className="md:col-span-1 flex justify-end items-end pt-2 md:pt-0">
                            {activeTemplate.exercises.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveExerciseFromActiveTemplate(index)}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 p-2 rounded-lg text-xs cursor-pointer transition w-full text-center font-bold"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={workoutSaving}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3.5 rounded-xl text-sm transition shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                {workoutSaving ? 'Übertrage Monatsplan...' : 'Gesamten Monats- & Zeitraumplan übertragen'}
              </button>
            </form>
          </div>

          {/* Ernährungsplaner */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6 relative overflow-visible">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <Utensils size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Ernährungsplaner (Mifflin-St. Jeor Makro-Berechnung)</h2>
                  <p className="text-slate-400 text-xs">Erstelle Tages-Templates, ziehe sie in den Kalender und übertrage den Monatsplan.</p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setIsFoodModalOpen(true)}
                className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
              >
                <Plus size={14} /> Lebensmittel zur DB hinzufügen
              </button>
            </div>

            {nutritionMessage && (
              <div className={`p-3.5 rounded-xl text-xs font-medium border ${nutritionMessage.includes('Fehler') ? 'bg-red-500/10 border-red-500/25 text-red-400' : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'}`}>
                {nutritionMessage}
              </div>
            )}

            <form onSubmit={handleCreateNutritionPlan} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Kunde auswählen</label>
                  <select
                    value={nutritionClientId}
                    onChange={(e) => setNutritionClientId(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition shadow-inner"
                    required
                  >
                    <option value="">Kunde wählen...</option>
                    {clients.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name || c.email}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Gesamt-Titel des Plans</label>
                  <input
                    type="text"
                    placeholder="z.B. Definitionsphase Ernährungsplan"
                    value={nutritionMainTitle}
                    onChange={(e) => setNutritionMainTitle(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition shadow-inner"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Zeitraum / Dauer</label>
                  <select
                    value={nutritionDurationWeeks}
                    onChange={(e) => setNutritionDurationWeeks(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition shadow-inner"
                  >
                    <option value="2 Wochen">2 Wochen</option>
                    <option value="4 Wochen (1 Monat)">4 Wochen (1 Monat)</option>
                    <option value="8 Wochen (2 Monate)">8 Wochen (2 Monate)</option>
                    <option value="12 Wochen (3 Monate)">12 Wochen (3 Monate)</option>
                  </select>
                </div>
              </div>

              {/* Kalender Grid für Ernährung */}
              <div className="bg-slate-950/60 p-5 sm:p-6 rounded-2xl border border-slate-800/80 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold tracking-wide text-white">
                      Ernährungs-Kalender: {MONTH_NAMES[currentMonth]} {currentYear}
                    </h3>
                    <p className="text-[11px] text-slate-400">Ziehe ein Ernährungs-Template auf den gewünschten Tag.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      &larr; Zurück
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      Weiter &rarr;
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-500 uppercase tracking-wider py-1 border-b border-slate-800/80">
                  <div>Mo</div><div>Di</div><div>Mi</div><div>Do</div><div>Fr</div><div>Sa</div><div>So</div>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: getFirstDayOfMonth(currentYear, currentMonth) }).map((_, i) => (
                    <div key={`n-empty-${i}`} className="h-20 bg-transparent" />
                  ))}

                  {Array.from({ length: getDaysInMonth(currentYear, currentMonth) }).map((_, i) => {
                    const dayNum = i + 1;
                    const formattedDay = String(dayNum).padStart(2, '0');
                    const formattedMonthNum = String(currentMonth + 1).padStart(2, '0');
                    const dateStr = `${currentYear}-${formattedMonthNum}-${formattedDay}`;

                    const assignedTemplate = nutritionScheduleMap[dateStr];

                    return (
                      <div
                        key={dateStr}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnNutritionDate(e, dateStr)}
                        className={`h-20 rounded-xl p-2 text-xs transition flex flex-col justify-between border text-left ${
                          assignedTemplate
                            ? 'bg-emerald-500/15 border-emerald-500/50 shadow-inner'
                            : 'bg-slate-900/50 border-slate-800/70 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-bold text-slate-300">{dayNum}</span>
                          {assignedTemplate && (
                            <button
                              type="button"
                              onClick={(e) => handleRemoveNutritionTemplateFromDateDirect(dateStr, e)}
                              title="Template entfernen"
                              className="bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold transition cursor-pointer"
                            >
                              &times;
                            </button>
                          )}
                        </div>
                        <div className="overflow-hidden">
                          {assignedTemplate ? (
                            <span className="block text-[9px] font-semibold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded truncate">
                              {assignedTemplate}
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-600 italic">Hierher ziehen</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ernährungs-Templates Leiste & Editor */}
              <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 space-y-4">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vorgaben (Klick zum Überschreiben des Editors):</span>
                  <div className="flex flex-wrap gap-2">
                    {defaultNutritionTemplates.map((dt: any, dIdx: number) => (
                      <div
                        key={dIdx}
                        draggable
                        onDragStart={(e) => handleDragStartNutritionTemplate(e, dt.templateName)}
                        onClick={() => handleSelectDefaultNutritionTemplate(dt)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold cursor-grab active:cursor-grabbing transition border flex items-center gap-2 select-none bg-slate-900 text-slate-300 border-slate-800 hover:border-emerald-500/50 hover:text-white shadow-sm"
                      >
                        <span>⚡ {dt.templateName}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-800/80">
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Eigene Ernährungs-Templates:</span>
                    <button
                      type="button"
                      onClick={handleAddCustomNutritionTemplate}
                      className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition"
                    >
                      + Template erstellen
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {customNutritionTemplates.map((ct: any, cIdx: number) => (
                      <div
                        key={cIdx}
                        draggable
                        onDragStart={(e) => handleDragStartNutritionTemplate(e, ct.templateName)}
                        onClick={() => setActiveNutritionTemplateIndex(cIdx)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-grab active:cursor-grabbing transition border flex items-center gap-2 select-none shadow-sm ${
                          activeNutritionTemplateIndex === cIdx
                            ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-bold'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span>🥗 {ct.templateName}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 space-y-4">
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="w-full md:w-1/2">
                      <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                        Name des aktiven Templates
                      </label>
                      <input
                        type="text"
                        value={activeNutritionTemplate?.templateName || ''}
                        onChange={(e) => handleNutritionTemplateNameChange(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    {customNutritionTemplates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomNutritionTemplate(activeNutritionTemplateIndex)}
                        className="bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 px-3.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition self-end md:self-auto"
                      >
                        Template löschen
                      </button>
                    )}
                  </div>

                  {/* Tägliche Makro- & Kalorienziele für das aktive Template */}
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Tägliche Zielvorgaben für &quot;{activeNutritionTemplate?.templateName}&quot;</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">Ziel-kcal</label>
                        <input
                          type="text"
                          value={activeNutritionTemplate?.targetCalories || ''}
                          onChange={(e) => handleNutritionMacroChange('targetCalories', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">Protein (g)</label>
                        <input
                          type="text"
                          value={activeNutritionTemplate?.targetProtein || ''}
                          onChange={(e) => handleNutritionMacroChange('targetProtein', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">Kohlenh. (g)</label>
                        <input
                          type="text"
                          value={activeNutritionTemplate?.targetCarbs || ''}
                          onChange={(e) => handleNutritionMacroChange('targetCarbs', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">Fett (g)</label>
                        <input
                          type="text"
                          value={activeNutritionTemplate?.targetFat || ''}
                          onChange={(e) => handleNutritionMacroChange('targetFat', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">Wasser (L)</label>
                        <input
                          type="text"
                          value={activeNutritionTemplate?.waterIntake || ''}
                          onChange={(e) => handleNutritionMacroChange('waterIntake', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mahlzeiten im aktiven Template */}
                  <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Mahlzeiten für &quot;{activeNutritionTemplate?.templateName}&quot;
                      </h3>
                      <button
                        type="button"
                        onClick={handleAddMealRow}
                        className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition"
                      >
                        + Mahlzeit hinzufügen
                      </button>
                    </div>

                    <div className="space-y-4">
                      {activeNutritionTemplate?.meals.map((meal: any, mealIndex: number) => (
                        <div key={mealIndex} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 overflow-visible">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-800/80">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                              <div className="w-24">
                                <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-1">Uhrzeit</label>
                                <input
                                  type="text"
                                  value={meal.time}
                                  onChange={(e) => handleMealHeaderChange(mealIndex, 'time', e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                              <div className="flex-1 sm:w-48">
                                <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-1">Mahlzeiten-Titel</label>
                                <input
                                  type="text"
                                  value={meal.title}
                                  onChange={(e) => handleMealHeaderChange(mealIndex, 'title', e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <button
                                type="button"
                                onClick={() => handleAddFoodItemToMeal(mealIndex)}
                                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                              >
                                + Lebensmittel hinzufügen
                              </button>
                              {activeNutritionTemplate.meals.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMealRow(mealIndex)}
                                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                                >
                                  Mahlzeit löschen
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3 overflow-visible">
                            {meal.items.map((item: any, itemIndex: number) => {
                              const searchTerm = (item.foodSearchInput || '').toLowerCase();
                              const filteredFoods = foodDatabase
                                .slice()
                                .sort((a, b) => a.name.localeCompare(b.name, 'de'))
                                .filter(f => f.name.toLowerCase().includes(searchTerm));

                              return (
                                <div key={itemIndex} className="grid grid-cols-1 md:grid-cols-12 gap-2.5 bg-slate-950/90 p-3 rounded-xl border border-slate-800 items-center relative overflow-visible">
                                  <div className="md:col-span-4 space-y-1 relative">
                                    <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">Lebensmittel-Suche</label>
                                    <input
                                      type="text"
                                      placeholder="z.B. Hafer, Hähnchen..."
                                      value={item.foodSearchInput || ''}
                                      onChange={(e) => handleFoodSearchInputChange(mealIndex, itemIndex, e.target.value)}
                                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                                    />

                                    {/* REPARIERTE SUCHLEISTE: Bedingung !item.foodId entfernt, damit das Dropdown bei Eingabe immer erscheint */}
                                    {item.foodSearchInput && filteredFoods.length > 0 && (
                                      <div className="absolute left-0 right-0 top-full mt-1 bg-slate-950 border border-emerald-500/50 rounded-xl shadow-2xl z-[9999] max-h-56 overflow-y-auto">
                                        {filteredFoods.map((f: any) => (
                                          <div
                                            key={f.id}
                                            onClick={() => handleSelectFoodItem(mealIndex, itemIndex, f)}
                                            className="px-3.5 py-2.5 text-xs text-slate-200 hover:bg-emerald-500/20 hover:text-emerald-300 cursor-pointer border-b border-slate-800/80 flex justify-between items-center transition"
                                          >
                                            <span className="font-semibold">{f.name}</span>
                                            <span className="text-emerald-400 text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded">{f.kcal} kcal / 100g</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <div className="md:col-span-2 space-y-1">
                                    <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">Gramm</label>
                                    <input
                                      type="number"
                                      value={item.grams}
                                      onChange={(e) => handleGramsChange(mealIndex, itemIndex, e.target.value)}
                                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 text-center font-bold"
                                    />
                                  </div>

                                  <div className="md:col-span-1">
                                    <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">kcal</label>
                                    <input
                                      type="text"
                                      readOnly
                                      value={item.calories}
                                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-xs text-emerald-400 font-bold text-center"
                                    />
                                  </div>

                                  <div className="md:col-span-1">
                                    <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">Protein</label>
                                    <input
                                      type="text"
                                      readOnly
                                      value={item.protein}
                                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-xs text-white text-center"
                                    />
                                  </div>

                                  <div className="md:col-span-1">
                                    <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">Carbs</label>
                                    <input
                                      type="text"
                                      readOnly
                                      value={item.carbs}
                                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-xs text-white text-center"
                                    />
                                  </div>

                                  <div className="md:col-span-1">
                                    <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-0.5">Fett</label>
                                    <input
                                      type="text"
                                      readOnly
                                      value={item.fat}
                                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-xs text-white text-center"
                                    />
                                  </div>

                                  <div className="md:col-span-2 flex justify-end items-end pt-1 md:pt-0">
                                    {meal.items.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveFoodItemFromMeal(mealIndex, itemIndex)}
                                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 p-2 rounded-lg text-xs cursor-pointer transition w-full text-center font-bold"
                                      >
                                        &times; Entfernen
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={nutritionSaving}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3.5 rounded-xl text-sm transition shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                {nutritionSaving ? 'Übertrage Ernährungs-Monatsplan...' : 'Gesamten Ernährungs-Monatsplan übertragen'}
              </button>
            </form>
          </div>
        </div>

      </section>

      {/* Modal zum Hinzufügen neuer Lebensmittel */}
      {isFoodModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Utensils size={18} className="text-emerald-400" /> Neues Lebensmittel zur Datenbank hinzufügen
            </h2>
            <p className="text-xs text-slate-400">Trage die Nährwerte bezogen auf 100g ein.</p>

            <form onSubmit={handleAddNewFood} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Name des Lebensmittels</label>
                <input 
                  type="text" 
                  required
                  placeholder="z.B. Haferflocken"
                  value={newFoodName}
                  onChange={(e) => setNewFoodName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Kalorien (kcal / 100g)</label>
                  <input 
                    type="number" 
                    required
                    placeholder="370"
                    value={newFoodKcal}
                    onChange={(e) => setNewFoodKcal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Protein (g / 100g)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    placeholder="13.5"
                    value={newFoodProtein}
                    onChange={(e) => setNewFoodProtein(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Kohlenhydrate (g / 100g)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    placeholder="58.7"
                    value={newFoodCarbs}
                    onChange={(e) => setNewFoodCarbs(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Fett (g / 100g)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    placeholder="7.0"
                    value={newFoodFat}
                    onChange={(e) => setNewFoodFat(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsFoodModalOpen(false)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-medium cursor-pointer">Abbrechen</button>
                <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">In DB speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals für Angebote und Buchungen */}
      {isOfferModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-white">
              {editingOfferId ? 'Angebot bearbeiten' : 'Neues Angebot erstellen'}
            </h2>
            <form onSubmit={handleSaveOffer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Titel des Angebots</label>
                <input 
                  type="text" 
                  required
                  value={currentOffer.title || ''}
                  onChange={(e) => setCurrentOffer({ ...currentOffer, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Typ</label>
                  <select 
                    value={currentOffer.type}
                    onChange={(e) => {
                      const type = e.target.value as 'discovery' | 'paid';
                      setCurrentOffer({ ...currentOffer, type, price: type === 'discovery' ? 0 : currentOffer.price });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="discovery">0€ Discovery Call</option>
                    <option value="paid">Bezahltes Angebot</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Dauer (Min.)</label>
                  <input 
                    type="number" 
                    required
                    value={currentOffer.duration || 60}
                    onChange={(e) => setCurrentOffer({ ...currentOffer, duration: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              {currentOffer.type === 'paid' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Preis (€)</label>
                  <input 
                    type="number" 
                    required
                    value={currentOffer.price || 0}
                    onChange={(e) => setCurrentOffer({ ...currentOffer, price: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Beschreibung</label>
                <textarea 
                  rows={3}
                  value={currentOffer.description || ''}
                  onChange={(e) => setCurrentOffer({ ...currentOffer, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsOfferModalOpen(false)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-medium cursor-pointer">Abbrechen</button>
                <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">Speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-white">Termin manuell eintragen</h2>
            <form onSubmit={handleCreateBooking} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Angebot wählen</label>
                <select
                  required
                  value={selectedOfferForBooking?.id || ''}
                  onChange={(e) => {
                    const offer = offers.find(o => o.id === e.target.value);
                    setSelectedOfferForBooking(offer || null);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Angebot auswählen...</option>
                  {offers.map(o => (
                    <option key={o.id} value={o.id}>{o.title} ({o.price} €)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Kundenname</label>
                <input
                  type="text"
                  required
                  value={bookingClientName}
                  onChange={(e) => setBookingClientName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Kunden-E-Mail</label>
                <input
                  type="email"
                  required
                  value={bookingClientEmail}
                  onChange={(e) => setBookingClientEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Datum</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Uhrzeit</label>
                  <input
                    type="time"
                    required
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsBookingModalOpen(false)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-medium cursor-pointer">Abbrechen</button>
                <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">Eintragen</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}