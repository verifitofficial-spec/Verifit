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

interface Booking {
  id: string;
  slot_id: string | null;
  client_id: string;
  client_name: string;
  client_email: string;
  offer_title: string;
  offer_type: 'discovery' | 'paid';
  duration_minutes: number;
  price: number;
  slot_date: string;
  slot_time: string;
  status: 'pending' | 'accepted' | 'confirmed' | 'declined' | 'cancelled' | 'expired';
  created_at: string;
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

  // PDF Dokumentspfade & Upload States
  const [licenseDocPath, setLicenseDocPath] = useState('');
  const [insuranceDocPath, setInsuranceDocPath] = useState('');
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [uploadingInsurance, setUploadingInsurance] = useState(false);
  const [docMessage, setDocMessage] = useState('');

  const todayObj = new Date();
  const [currentYear, setCurrentYear] = useState(todayObj.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(todayObj.getMonth());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(
    todayObj.toLocaleDateString('en-CA')
  );

  const [activeCalendarTab, setActiveCalendarTab] = useState<'schedule' | 'offers'>('schedule');
  const [offers, setOffers] = useState<OfferTemplate[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [currentOffer, setCurrentOffer] = useState<Partial<OfferTemplate>>({
    title: '',
    type: 'paid',
    duration: 60,
    price: 90,
    description: ''
  });
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);

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

  // Ernährungsplan Builder & Template States
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

        // Dokumentpfade für Lizenz & Versicherung laden
        setLicenseDocPath(data.license_document_path || '');
        setInsuranceDocPath(data.insurance_document_path || '');

        loadSlots(data.id);
        loadOffers(data.id);
        loadBookings(data.id);
        loadClients();
        loadFoodDatabase();
      }
      setLoading(false);
    }

    loadTrainerData();
  }, [router]);

  async function handleUploadDocument(file: File, type: 'license' | 'insurance') {
    if (!trainer) return;
    if (file.type !== 'application/pdf') {
      setDocMessage('Fehler: Bitte nur PDF-Dateien hochladen.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setDocMessage('Fehler: Die Datei darf maximal 10 MB groß sein.');
      return;
    }
    const setUploading = type === 'license' ? setUploadingLicense : setUploadingInsurance;
    setUploading(true);
    setDocMessage('');
    const filePath = `${trainer.id}/${type}-${Date.now()}.pdf`;

    // Falls schon ein altes Dokument existiert, vorher löschen (verhindert verwaiste Dateien)
    const oldPath = type === 'license' ? licenseDocPath : insuranceDocPath;
    if (oldPath) {
      await supabase.storage.from('verification-docs').remove([oldPath]);
    }

    const { error: uploadError } = await supabase.storage
      .from('verification-docs')
      .upload(filePath, file, { contentType: 'application/pdf', upsert: false });

    if (uploadError) {
      setDocMessage('Fehler beim Hochladen: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const dbField = type === 'license' ? 'license_document_path' : 'insurance_document_path';
    const { error: dbError } = await supabase
      .from('trainers')
      .update({ [dbField]: filePath })
      .eq('id', trainer.id);

    if (dbError) {
      setDocMessage('Fehler beim Speichern des Dokumentpfads: ' + dbError.message);
    } else {
      if (type === 'license') setLicenseDocPath(filePath);
      else setInsuranceDocPath(filePath);
      setDocMessage(type === 'license' ? 'Lizenz-PDF erfolgreich hochgeladen!' : 'Versicherungsnachweis erfolgreich hochgeladen!');
    }
    setUploading(false);
  }

  async function handleDeleteDocument(type: 'license' | 'insurance') {
    if (!trainer) return;
    const path = type === 'license' ? licenseDocPath : insuranceDocPath;
    if (!path) return;
    const { error: removeError } = await supabase.storage.from('verification-docs').remove([path]);
    if (removeError) {
      setDocMessage('Fehler beim Löschen: ' + removeError.message);
      return;
    }
    const dbField = type === 'license' ? 'license_document_path' : 'insurance_document_path';
    await supabase.from('trainers').update({ [dbField]: null }).eq('id', trainer.id);
    if (type === 'license') setLicenseDocPath('');
    else setInsuranceDocPath('');
    setDocMessage('Dokument entfernt.');
  }

  async function handleViewDocument(path: string) {
    const { data, error } = await supabase.storage
      .from('verification-docs')
      .createSignedUrl(path, 60); // Link ist 60 Sekunden gültig
    if (error || !data) {
      alert('Dokument konnte nicht geöffnet werden: ' + error?.message);
      return;
    }
    window.open(data.signedUrl, '_blank');
  }

  async function loadSlots(trainerId: string) {
    const { data } = await supabase
      .from('trainer_slots')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('slot_date', { ascending: true });
    if (data) setSlots(data);
  }

  async function loadOffers(trainerId: string) {
    const { data, error } = await supabase
      .from('trainer_offers')
      .select('*')
      .eq('trainer_id', trainerId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (error) { console.error('Fehler beim Laden der Pakete:', error.message); return; }
    setOffers((data ?? []).map((o: any) => ({
      id: o.id,
      title: o.title,
      type: o.type,
      duration: o.duration_minutes,
      price: Number(o.price),
      description: o.description ?? '',
    })));
  }

  async function loadBookings(trainerId: string) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('slot_date', { ascending: true })
      .order('slot_time', { ascending: true });
    if (error) { console.error('Fehler beim Laden der Anfragen:', error.message); return; }
    setBookings((data ?? []).map((b: any) => ({ ...b, price: Number(b.price) })));
  }

  async function handleRespond(bookingId: string, accept: boolean) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.');
      return;
    }

    const response = await fetch('/api/respond-booking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ bookingId, accept }),
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) { alert(data.error || 'Buchungsantwort konnte nicht gespeichert werden.'); return; }
    if (trainer) await Promise.all([loadBookings(trainer.id), loadSlots(trainer.id)]);
  }

  // Punkt 4: Sauber aus 'clients' auslesen (ohne verwaiste users-Abfragen)
  async function loadClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, email');
      
    if (error) {
      console.error('Fehler beim Laden der Kunden:', error.message);
      return;
    }
    if (data) setClients(data);
  }

  async function loadFoodDatabase() {
    const { data } = await supabase.from('foods').select('*').order('name', { ascending: true });
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

  // ESLint Fix: prefer-const
  function getFirstDayOfMonth(year: number, month: number) {
    const day = new Date(year, month, 1).getDay();
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
    const existingSlot = slots.find(
      (s) => s.slot_date === selectedCalendarDate && s.slot_time.startsWith(timeStr)
    );
    if (existingSlot) {
      if (existingSlot.status !== 'free') {
        alert('Dieser Slot hat eine Anfrage bzw. Buchung und kann nicht entfernt werden.');
        return;
      }
      const { error } = await supabase.from('trainer_slots').delete().eq('id', existingSlot.id);
      if (error) alert('Fehler beim Löschen des Slots: ' + error.message);
      else loadSlots(trainer.id);
    } else {
      const { error } = await supabase.from('trainer_slots').insert({
        trainer_id: trainer.id,
        slot_date: selectedCalendarDate,
        slot_time: `${timeStr}:00`,
        status: 'free',
      });
      if (error) alert('Fehler beim Erstellen des Slots: ' + error.message);
      else loadSlots(trainer.id);
    }
  }

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainer || !currentOffer.title) return;
    const type = currentOffer.type || 'paid';
    const payload = {
      trainer_id: trainer.id,
      title: currentOffer.title,
      type,
      duration_minutes: Number(currentOffer.duration) || 60,
      price: type === 'discovery' ? 0 : Number(currentOffer.price) || 0,
      description: currentOffer.description || null,
    };
    if (type === 'paid' && payload.price <= 0) {
      alert('Bezahlte Angebote brauchen einen Preis größer 0.');
      return;
    }
    const { error } = editingOfferId
      ? await supabase.from('trainer_offers').update(payload).eq('id', editingOfferId)
      : await supabase.from('trainer_offers').insert(payload);
    if (error) { alert('Fehler beim Speichern: ' + error.message); return; }
    setEditingOfferId(null);
    setCurrentOffer({ title: '', type: 'paid', duration: 60, price: 90, description: '' });
    setIsOfferModalOpen(false);
    await loadOffers(trainer.id);
  };
  
  // Soft-Delete: Buchungen behalten ihre Kopie der Paketdaten
  const handleDeleteOffer = async (id: string) => {
    if (!trainer) return;
    const { error } = await supabase.from('trainer_offers').update({ is_active: false }).eq('id', id);
    if (error) { alert('Fehler beim Löschen: ' + error.message); return; }
    await loadOffers(trainer.id);
  };

  const handleEditOffer = (offer: OfferTemplate) => {
    setEditingOfferId(offer.id);
    setCurrentOffer(offer);
    setIsOfferModalOpen(true);
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

  const activeBookings = bookings
    .filter((b) => ['pending', 'accepted', 'confirmed'].includes(b.status))
    .sort((a, b) =>
      (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1) ||
      `${a.slot_date}${a.slot_time}`.localeCompare(`${b.slot_date}${b.slot_time}`)
    );
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const bookingBySlot: Record<string, Booking> = Object.fromEntries(
    activeBookings.filter((b) => b.slot_id).map((b) => [b.slot_id as string, b]));
  const formatDate = (d: string) => d.split('-').reverse().join('.');

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

          {/* PDF Upload Feedback Message */}
          {docMessage && (
            <div className={`p-3.5 rounded-xl text-xs font-medium border ${docMessage.includes('Fehler') ? 'bg-red-500/10 border-red-500/25 text-red-400' : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'}`}>
              {docMessage}
            </div>
          )}

          {/* PDF Upload Buttons & Preview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Lizenz-Upload */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-3">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Trainerlizenz / Zertifikat (PDF)
              </label>
              {licenseDocPath ? (
                <div className="flex items-center justify-between bg-slate-900 border border-emerald-500/30 rounded-xl p-3">
                  <button
                    type="button"
                    onClick={() => handleViewDocument(licenseDocPath)}
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-2 cursor-pointer"
                  >
                    📄 Dokument ansehen
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDocument('license')}
                    className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    Entfernen
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Noch kein Dokument hochgeladen.</p>
              )}
              <label className={`block w-full text-center text-xs font-semibold py-2.5 rounded-xl border cursor-pointer transition ${
                uploadingLicense
                  ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-900 border-slate-700 text-emerald-400 hover:border-emerald-500/50'
              }`}>
                {uploadingLicense ? 'Lade hoch...' : licenseDocPath ? 'Ersetzen' : 'PDF hochladen'}
                <input
                  type="file"
                  accept="application/pdf"
                  disabled={uploadingLicense}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadDocument(file, 'license');
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {/* Versicherungsnachweis-Upload */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-3">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Berufshaftpflicht-Nachweis (PDF)
              </label>
              {insuranceDocPath ? (
                <div className="flex items-center justify-between bg-slate-900 border border-emerald-500/30 rounded-xl p-3">
                  <button
                    type="button"
                    onClick={() => handleViewDocument(insuranceDocPath)}
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-2 cursor-pointer"
                  >
                    📄 Dokument ansehen
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDocument('insurance')}
                    className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    Entfernen
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Noch kein Dokument hochgeladen.</p>
              )}
              <label className={`block w-full text-center text-xs font-semibold py-2.5 rounded-xl border cursor-pointer transition ${
                uploadingInsurance
                  ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-900 border-slate-700 text-emerald-400 hover:border-emerald-500/50'
              }`}>
                {uploadingInsurance ? 'Lade hoch...' : insuranceDocPath ? 'Ersetzen' : 'PDF hochladen'}
                <input
                  type="file"
                  accept="application/pdf"
                  disabled={uploadingInsurance}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadDocument(file, 'insurance');
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>
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
              <CalendarIcon size={14} /> Anfragen & Termine
              {pendingCount > 0 && (
                <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {pendingCount} neu
                </span>
              )}
            </button>
          </div>

          {activeCalendarTab === 'schedule' && (
            <div className="space-y-4">
              {activeBookings.length === 0 ? (
                <div className="text-center py-10 bg-slate-950/60 rounded-2xl border border-slate-800/80">
                  <CalendarIcon className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                  <p className="text-slate-400 text-xs">Noch keine Anfragen oder Termine.</p>
                </div>
              ) : (
                activeBookings.map((b) => (
                  <div
                    key={b.id}
                    className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          b.offer_type === 'discovery'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {b.offer_type === 'discovery' ? 'Kostenlos' : 'Kostenpflichtig'}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                          b.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400'
                          : b.status === 'accepted' ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-green-500/10 text-green-400'
                        }`}>
                          {b.status === 'pending' ? 'Neue Anfrage'
                            : b.status === 'accepted' ? 'Wartet auf Zahlung'
                            : b.price > 0 ? 'Bezahlt ✓' : 'Bestätigt ✓'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white">{b.offer_title}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                        <span className="flex items-center gap-1 text-emerald-300 font-medium">
                          <User size={12} /> {b.client_name}
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <CalendarIcon size={12} /> {formatDate(b.slot_date)}, {b.slot_time.slice(0, 5)} Uhr
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock size={12} /> {b.duration_minutes} Min.
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-emerald-400">
                          <DollarSign size={12} /> {b.price > 0 ? `${b.price} €` : '0 €'}
                        </span>
                      </div>
                    </div>
                    {b.status === 'pending' && (
                      <div className="flex items-center gap-2 self-end md:self-center">
                        <button
                          onClick={() => handleRespond(b.id, true)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                        >
                          <CheckCircle size={12} /> Annehmen
                        </button>
                        <button
                          onClick={() => handleRespond(b.id, false)}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                        >
                          <XCircle size={12} /> Ablehnen
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Verfügbarkeiten & Slots Block */}
          <div className="space-y-6 pt-6 border-t border-slate-800/80">
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
                  const booking = slotMatch ? bookingBySlot[slotMatch.id] : undefined;

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
                      {booking && (
                        <div className="w-full text-center text-[9px] text-slate-300 truncate" title={`${booking.client_name} · ${booking.offer_title}`}>
                          {booking.client_name} · {booking.offer_title}
                        </div>
                      )}
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
                      <button
                        key={`default-${dIdx}`}
                        type="button"
                        onClick={() => handleSelectDefaultTemplate(dt)}
                        className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        {dt.templateName}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-4 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                      <Dumbbell size={14} /> Eigene Templates (Drag & Drop fähig):
                    </span>
                    <button
                      type="button"
                      onClick={handleAddCustomWorkoutTemplate}
                      className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} /> Neues Template
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {customTemplates.map((ct: any, cIdx: number) => (
                      <div
                        key={`custom-${cIdx}`}
                        draggable
                        onDragStart={(e) => handleDragStartTemplate(e, ct.templateName)}
                        className={`group flex items-center bg-slate-950/80 border rounded-lg overflow-hidden transition cursor-grab active:cursor-grabbing ${
                          cIdx === activeTemplateIndex ? 'border-emerald-500 shadow-md shadow-emerald-500/10' : 'border-slate-800'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveTemplateIndex(cIdx)}
                          className={`px-3 py-1.5 text-xs font-bold transition ${
                            cIdx === activeTemplateIndex ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {ct.templateName}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomWorkoutTemplate(cIdx)}
                          className="px-2 py-1.5 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                          title="Template löschen"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 sm:p-5 space-y-4 relative">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Template-Name (erscheint im Kalender)</label>
                    <input
                      type="text"
                      value={activeTemplate?.templateName || ''}
                      onChange={(e) => handleTemplateNameChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="hidden sm:grid grid-cols-12 gap-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <div className="col-span-6">Übung</div>
                      <div className="col-span-2">Sätze</div>
                      <div className="col-span-2">Wdh.</div>
                      <div className="col-span-2">Gew. (kg)</div>
                    </div>
                    {activeTemplate?.exercises.map((ex: any, exIdx: number) => (
                      <div key={exIdx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-950/50 p-2 sm:p-1 rounded-lg sm:bg-transparent">
                        <div className="sm:col-span-6 relative">
                          <label className="sm:hidden block text-[9px] font-bold text-slate-500 uppercase mb-1">Übung</label>
                          <select
                            value={ex.exercise}
                            onChange={(e) => handleExerciseChangeInActiveTemplate(exIdx, 'exercise', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 appearance-none"
                          >
                            <option value="">Übung wählen...</option>
                            {EXERCISE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </div>
                        <div className="sm:col-span-2 flex items-center gap-2 sm:block">
                          <label className="sm:hidden w-16 text-[9px] font-bold text-slate-500 uppercase">Sätze</label>
                          <input
                            type="text"
                            value={ex.sets}
                            onChange={(e) => handleExerciseChangeInActiveTemplate(exIdx, 'sets', e.target.value)}
                            placeholder="Sätze"
                            className="w-full bg-slate-900 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-center text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="sm:col-span-2 flex items-center gap-2 sm:block">
                          <label className="sm:hidden w-16 text-[9px] font-bold text-slate-500 uppercase">Wdh.</label>
                          <input
                            type="text"
                            value={ex.reps}
                            onChange={(e) => handleExerciseChangeInActiveTemplate(exIdx, 'reps', e.target.value)}
                            placeholder="Wdh."
                            className="w-full bg-slate-900 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-center text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="sm:col-span-2 flex items-center gap-2">
                          <label className="sm:hidden w-16 text-[9px] font-bold text-slate-500 uppercase">Gewicht</label>
                          <input
                            type="text"
                            value={ex.weight}
                            onChange={(e) => handleExerciseChangeInActiveTemplate(exIdx, 'weight', e.target.value)}
                            placeholder="kg"
                            className="w-full bg-slate-900 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-center text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveExerciseFromActiveTemplate(exIdx)}
                            className="sm:absolute sm:-right-6 text-slate-500 hover:text-red-400 p-1 transition cursor-pointer"
                            title="Übung entfernen"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddExerciseToActiveTemplate}
                      className="w-full bg-slate-900/50 hover:bg-slate-900 border border-slate-800 border-dashed text-slate-400 hover:text-emerald-400 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                    >
                      <Plus size={14} /> Übung hinzufügen
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={workoutSaving}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3.5 rounded-xl text-sm transition shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2"
              >
                {workoutSaving ? 'Speichere...' : 'Monatsplan an Kunden senden'}
                {!workoutSaving && <CheckCircle size={16} />}
              </button>
            </form>
          </div>

          {/* Ernährungsplaner */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <Utensils size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Ernährungsplaner</h2>
                  <p className="text-slate-400 text-xs">Makros tracken, Templates erstellen und per Drag & Drop planen.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFoodModalOpen(true)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition cursor-pointer shadow-sm"
              >
                <Plus size={14} /> Neues Lebensmittel in DB
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
                      <option key={`nut-${c.id}`} value={c.id}>{c.name || c.email}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Gesamt-Titel des Plans</label>
                  <input
                    type="text"
                    placeholder="z.B. 4-Wochen Definitionsphase"
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

              {/* Kalender Grid (Nutrition) */}
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
                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const assignedTemplate = nutritionScheduleMap[dateStr];
                    return (
                      <div
                        key={`n-${dateStr}`}
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
                              className="bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold transition cursor-pointer"
                            >
                              &times;
                            </button>
                          )}
                        </div>
                        <div className="overflow-hidden">
                          {assignedTemplate ? (
                            <span className="block text-[9px] font-semibold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded truncate" title={assignedTemplate}>
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

              {/* Templates Leiste & Editor (Nutrition) */}
              <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 space-y-4">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vorgaben (Klick zum Überschreiben des Editors):</span>
                  <div className="flex flex-wrap gap-2">
                    {defaultNutritionTemplates.map((dt: any, dIdx: number) => (
                      <button
                        key={`ndef-${dIdx}`}
                        type="button"
                        onClick={() => handleSelectDefaultNutritionTemplate(dt)}
                        className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        {dt.templateName}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-4 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                      <Utensils size={14} /> Eigene Ernährungs-Tage (Drag & Drop fähig):
                    </span>
                    <button
                      type="button"
                      onClick={handleAddCustomNutritionTemplate}
                      className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} /> Neuer Tag
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {customNutritionTemplates.map((ct: any, cIdx: number) => (
                      <div
                        key={`ncustom-${cIdx}`}
                        draggable
                        onDragStart={(e) => handleDragStartNutritionTemplate(e, ct.templateName)}
                        className={`group flex items-center bg-slate-950/80 border rounded-lg overflow-hidden transition cursor-grab active:cursor-grabbing ${
                          cIdx === activeNutritionTemplateIndex ? 'border-emerald-500 shadow-md shadow-emerald-500/10' : 'border-slate-800'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveNutritionTemplateIndex(cIdx)}
                          className={`px-3 py-1.5 text-xs font-bold transition ${
                            cIdx === activeNutritionTemplateIndex ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {ct.templateName}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomNutritionTemplate(cIdx)}
                          className="px-2 py-1.5 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                          title="Tag löschen"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 sm:p-5 space-y-6 relative">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Template-Name (erscheint im Kalender)</label>
                    <input
                      type="text"
                      value={activeNutritionTemplate?.templateName || ''}
                      onChange={(e) => handleNutritionTemplateNameChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Tagesziele & Makros Header */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                    <div>
                      <span className="block text-[9px] font-bold text-slate-500 uppercase">Kcal Ziel</span>
                      <div className="flex items-center gap-1">
                        <input type="text" value={activeNutritionTemplate?.targetCalories || ''} onChange={(e) => handleNutritionMacroChange('targetCalories', e.target.value)} className="w-full bg-transparent border-b border-slate-700 text-emerald-400 font-black text-sm focus:outline-none focus:border-emerald-500" />
                      </div>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-slate-500 uppercase">Protein (g)</span>
                      <div className="flex items-center gap-1">
                        <input type="text" value={activeNutritionTemplate?.targetProtein || ''} onChange={(e) => handleNutritionMacroChange('targetProtein', e.target.value)} className="w-full bg-transparent border-b border-slate-700 text-white font-bold text-sm focus:outline-none focus:border-slate-500" />
                      </div>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-slate-500 uppercase">Kohlenhydrate (g)</span>
                      <div className="flex items-center gap-1">
                        <input type="text" value={activeNutritionTemplate?.targetCarbs || ''} onChange={(e) => handleNutritionMacroChange('targetCarbs', e.target.value)} className="w-full bg-transparent border-b border-slate-700 text-white font-bold text-sm focus:outline-none focus:border-slate-500" />
                      </div>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-slate-500 uppercase">Fett (g)</span>
                      <div className="flex items-center gap-1">
                        <input type="text" value={activeNutritionTemplate?.targetFat || ''} onChange={(e) => handleNutritionMacroChange('targetFat', e.target.value)} className="w-full bg-transparent border-b border-slate-700 text-white font-bold text-sm focus:outline-none focus:border-slate-500" />
                      </div>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-slate-500 uppercase">Wasser (L)</span>
                      <div className="flex items-center gap-1">
                        <input type="text" value={activeNutritionTemplate?.waterIntake || ''} onChange={(e) => handleNutritionMacroChange('waterIntake', e.target.value)} className="w-full bg-transparent border-b border-slate-700 text-blue-400 font-bold text-sm focus:outline-none focus:border-blue-500" />
                      </div>
                    </div>
                  </div>

                  {/* Mahlzeiten & Lebensmittel */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Mahlzeiten</h4>
                    {activeNutritionTemplate?.meals.map((meal: any, mIdx: number) => {
                      const mealTotalKcal = meal.items.reduce((sum: number, item: any) => sum + (parseFloat(item.calories) || 0), 0);
                      const mealTotalP = meal.items.reduce((sum: number, item: any) => sum + (parseFloat(item.protein) || 0), 0);
                      const mealTotalC = meal.items.reduce((sum: number, item: any) => sum + (parseFloat(item.carbs) || 0), 0);
                      const mealTotalF = meal.items.reduce((sum: number, item: any) => sum + (parseFloat(item.fat) || 0), 0);

                      return (
                        <div key={`m-${mIdx}`} className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                          {/* Meal Header */}
                          <div className="bg-slate-900/80 px-4 py-3 flex flex-wrap gap-3 justify-between items-center border-b border-slate-800">
                            <div className="flex items-center gap-3 flex-1">
                              <input 
                                type="time" 
                                value={meal.time} 
                                onChange={(e) => handleMealHeaderChange(mIdx, 'time', e.target.value)}
                                className="bg-slate-950 border border-slate-700 rounded text-xs px-2 py-1 text-slate-300 focus:outline-none focus:border-emerald-500"
                              />
                              <input 
                                type="text" 
                                value={meal.title} 
                                onChange={(e) => handleMealHeaderChange(mIdx, 'title', e.target.value)}
                                placeholder="Mahlzeit Name..."
                                className="bg-transparent font-bold text-sm text-emerald-400 focus:outline-none placeholder:text-slate-600 flex-1"
                              />
                            </div>
                            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                              <span className="text-emerald-400">{mealTotalKcal} kcal</span>
                              <span>P: {mealTotalP.toFixed(1)}g</span>
                              <span>C: {mealTotalC.toFixed(1)}g</span>
                              <span>F: {mealTotalF.toFixed(1)}g</span>
                              <button type="button" onClick={() => handleRemoveMealRow(mIdx)} className="ml-2 text-slate-500 hover:text-red-400 transition" title="Mahlzeit löschen"><Trash2 size={12} /></button>
                            </div>
                          </div>

                          {/* Meal Items */}
                          <div className="p-3 space-y-2">
                            <div className="hidden sm:grid grid-cols-12 gap-2 px-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                              <div className="col-span-5">Lebensmittel-Suche</div>
                              <div className="col-span-2">Menge (g)</div>
                              <div className="col-span-1 text-right">Kcal</div>
                              <div className="col-span-1 text-right">P</div>
                              <div className="col-span-1 text-right">C</div>
                              <div className="col-span-1 text-right">F</div>
                              <div className="col-span-1 text-center">Aktion</div>
                            </div>

                            {meal.items.map((item: any, iIdx: number) => {
                              const searchVal = item.foodSearchInput?.toLowerCase() || '';
                              const showDropdown = searchVal.length > 0 && !item.foodId;
                              const filteredFoods = showDropdown ? foodDatabase.filter((f: any) => f.name.toLowerCase().includes(searchVal)) : [];

                              return (
                                <div key={`item-${mIdx}-${iIdx}`} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-900/50 p-2 rounded-lg relative">
                                  <div className="sm:col-span-5 relative">
                                    <label className="sm:hidden block text-[9px] font-bold text-slate-500 uppercase mb-1">Lebensmittel</label>
                                    <input
                                      type="text"
                                      value={item.foodSearchInput || ''}
                                      onChange={(e) => handleFoodSearchInputChange(mIdx, iIdx, e.target.value)}
                                      placeholder="Suchen... (z.B. Haferflocken)"
                                      className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                                    />
                                    {showDropdown && filteredFoods.length > 0 && (
                                      <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-xl max-h-40 overflow-y-auto">
                                        {filteredFoods.map((f: any) => (
                                          <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => handleSelectFoodItem(mIdx, iIdx, f)}
                                            className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-500/20 hover:text-emerald-300 border-b border-slate-700/50 last:border-0"
                                          >
                                            {f.name} <span className="text-[10px] text-slate-400">({f.kcal} kcal/100g)</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="sm:col-span-2 flex items-center gap-2">
                                    <label className="sm:hidden w-16 text-[9px] font-bold text-slate-500 uppercase">Menge (g)</label>
                                    <input
                                      type="number"
                                      value={item.grams}
                                      onChange={(e) => handleGramsChange(mIdx, iIdx, e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-center text-white focus:outline-none focus:border-emerald-500"
                                    />
                                  </div>
                                  <div className="sm:col-span-1 flex justify-between sm:block text-right">
                                    <span className="sm:hidden text-[9px] font-bold text-slate-500 uppercase">Kcal</span>
                                    <span className="text-xs font-bold text-emerald-400">{item.calories || 0}</span>
                                  </div>
                                  <div className="sm:col-span-1 flex justify-between sm:block text-right">
                                    <span className="sm:hidden text-[9px] font-bold text-slate-500 uppercase">Protein</span>
                                    <span className="text-xs text-slate-300">{item.protein || 0}</span>
                                  </div>
                                  <div className="sm:col-span-1 flex justify-between sm:block text-right">
                                    <span className="sm:hidden text-[9px] font-bold text-slate-500 uppercase">Carbs</span>
                                    <span className="text-xs text-slate-300">{item.carbs || 0}</span>
                                  </div>
                                  <div className="sm:col-span-1 flex justify-between sm:block text-right">
                                    <span className="sm:hidden text-[9px] font-bold text-slate-500 uppercase">Fett</span>
                                    <span className="text-xs text-slate-300">{item.fat || 0}</span>
                                  </div>
                                  <div className="sm:col-span-1 flex justify-end sm:justify-center">
                                    <button type="button" onClick={() => handleRemoveFoodItemFromMeal(mIdx, iIdx)} className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"><Trash2 size={14} /></button>
                                  </div>
                                </div>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => handleAddFoodItemToMeal(mIdx)}
                              className="w-full bg-slate-900/50 hover:bg-slate-900 border border-slate-800 border-dashed text-slate-400 hover:text-emerald-400 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                            >
                              <Plus size={12} /> Zutat hinzufügen
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={handleAddMealRow}
                      className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer mt-4"
                    >
                      <Plus size={14} /> Neue Mahlzeit-Box hinzufügen
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={nutritionSaving}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3.5 rounded-xl text-sm transition shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2"
              >
                {nutritionSaving ? 'Speichere...' : 'Ernährungsplan an Kunden senden'}
                {!nutritionSaving && <CheckCircle size={16} />}
              </button>
            </form>
          </div>
        </div>

      </section>

      {/* Lebensmittel Hinzufügen Modal */}
      {isFoodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setIsFoodModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <XCircle size={20} />
            </button>
            <h3 className="text-lg font-bold text-white mb-2">Neues Lebensmittel anlegen</h3>
            <p className="text-xs text-slate-400 mb-6">Trage die Nährwerte pro 100g ein. Das Lebensmittel wird in deiner Datenbank gespeichert.</p>

            <form onSubmit={handleAddNewFood} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Name</label>
                <input required type="text" value={newFoodName} onChange={(e) => setNewFoodName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500" placeholder="z.B. Apfel (frisch)" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Kcal (pro 100g)</label>
                  <input required type="number" step="0.1" value={newFoodKcal} onChange={(e) => setNewFoodKcal(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Protein (g)</label>
                  <input required type="number" step="0.1" value={newFoodProtein} onChange={(e) => setNewFoodProtein(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Kohlenhydrate (g)</label>
                  <input required type="number" step="0.1" value={newFoodCarbs} onChange={(e) => setNewFoodCarbs(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Fett (g)</label>
                  <input required type="number" step="0.1" value={newFoodFat} onChange={(e) => setNewFoodFat(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500" />
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-xl text-sm transition mt-2">
                Lebensmittel speichern
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Offer Modal */}
      {isOfferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setIsOfferModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <XCircle size={20} />
            </button>
            <h3 className="text-lg font-bold text-white mb-2">{editingOfferId ? 'Angebot bearbeiten' : 'Neues Angebot erstellen'}</h3>
            <p className="text-xs text-slate-400 mb-6">Definiere Titel, Dauer und Preis für dein Trainer-Paket.</p>

            <form onSubmit={handleSaveOffer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Typ</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentOffer({ ...currentOffer, type: 'discovery', price: 0 })}
                    className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      currentOffer.type === 'discovery' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Kostenloses Erstgespräch
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentOffer({ ...currentOffer, type: 'paid' })}
                    className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      currentOffer.type === 'paid' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Kostenpflichtiges Paket
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Titel des Angebots</label>
                <input 
                  required 
                  type="text" 
                  value={currentOffer.title} 
                  onChange={(e) => setCurrentOffer({ ...currentOffer, title: e.target.value })} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500" 
                  placeholder="z.B. 10er Karte Personal Training" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Dauer (Minuten)</label>
                  <input 
                    required 
                    type="number" 
                    value={currentOffer.duration} 
                    onChange={(e) => setCurrentOffer({ ...currentOffer, duration: Number(e.target.value) })} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Preis (€)</label>
                  <input 
                    required 
                    type="number" 
                    disabled={currentOffer.type === 'discovery'}
                    value={currentOffer.type === 'discovery' ? 0 : currentOffer.price} 
                    onChange={(e) => setCurrentOffer({ ...currentOffer, price: Number(e.target.value) })} 
                    className={`w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 ${currentOffer.type === 'discovery' ? 'opacity-50 cursor-not-allowed' : ''}`} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Beschreibung</label>
                <textarea
                  value={currentOffer.description}
                  onChange={(e) => setCurrentOffer({ ...currentOffer, description: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 resize-none"
                  placeholder="Kurze Beschreibung der Leistung..."
                />
              </div>

              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-xl text-sm transition mt-2 cursor-pointer">
                {editingOfferId ? 'Änderungen speichern' : 'Angebot anlegen'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
