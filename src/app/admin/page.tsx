'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { 
  ShieldCheck, 
  FileText, 
  MapPin, 
  Award, 
  Calendar, 
  Dumbbell, 
  CheckCircle, 
  XCircle,
  Mail,
  ExternalLink
} from 'lucide-react';

type Trainer = {
  id: string;
  name: string;
  email: string;
  bio: string;
  status?: string;
  city?: string;
  service_mode?: string;
  specialties?: string;
  license_number?: string;
  liability_insurance_expiry?: string;
  license_document_path?: string;
  insurance_document_path?: string;
  package_category?: string;
  package_duration?: string;
  package_price?: number;
  availability_status?: string;
};

export default function VerificationPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Sicherheitsprüfung und Laden der Trainer beim Start der Seite
  useEffect(() => {
    async function checkAdminSession() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/admin/login');
        return;
      }

      // Prüfen, ob die Rolle in profiles wirklich admin ist
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        await supabase.auth.signOut();
        router.push('/admin/login');
        return;
      }

      fetchTrainers();
    }

    checkAdminSession();
  }, [router]);

  // Trainer aus Supabase laden
  async function fetchTrainers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('trainers')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error('Fehler beim Laden der Trainer:', error.message);
    } else {
      setTrainers(data || []);
    }
    setLoading(false);
  }

  // Signed URL generieren & PDF-Dokument in neuem Tab öffnen
  async function handleViewDocument(path: string) {
    if (!path) return;

    const { data, error } = await supabase.storage
      .from('verification-docs')
      .createSignedUrl(path, 60); // Link ist 60 Sekunden gültig

    if (error || !data) {
      alert('Dokument konnte nicht geöffnet werden: ' + (error?.message || 'Fehler beim Erstellen des Links'));
      return;
    }

    window.open(data.signedUrl, '_blank');
  }

  // Status eines Trainers aktualisieren (z.B. 'approved' oder 'rejected')
  async function updateTrainerStatus(id: string, newStatus: 'approved' | 'rejected') {
    const { error } = await supabase
      .from('trainers')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      console.error('Fehler beim Aktualisieren des Status:', error.message);
      alert('Fehler beim Speichern.');
    } else {
      // Liste lokal aktualisieren, damit die UI sofort reagiert
      setTrainers(prev =>
        prev.map(t => (t.id === id ? { ...t, status: newStatus } : t))
      );
    }
  }

  // Admin Logout Funktion
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 sm:p-10 selection:bg-emerald-500 selection:text-slate-950">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-emerald-400 tracking-tight">Trainer Verifizierung</h1>
              <p className="text-xs text-slate-400 mt-0.5">Admin Control Center – Dokumentenprüfung & Freigaben</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="text-slate-400 hover:text-white text-xs px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 transition"
            >
              Zur Startseite
            </Link>
            <button
              onClick={handleLogout}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs px-4 py-2 rounded-xl transition cursor-pointer text-slate-300 font-medium"
            >
              Abmelden
            </button>
          </div>
        </div>

        <p className="text-slate-400 text-xs">
          Jeder Trainer auf VeriFit wird manuell geprüft: Lizenz-PDFs, Haftpflichtversicherung, Stammdaten und fachliche Qualifikation.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : trainers.length === 0 ? (
          <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400 text-sm">
            Keine registrierten Trainer gefunden.
          </div>
        ) : (
          <div className="space-y-6">
            {trainers.map((trainer) => {
              const specialtiesList = trainer.specialties 
                ? trainer.specialties.split(',').map(s => s.trim()).filter(Boolean)
                : [];

              return (
                <div 
                  key={trainer.id} 
                  className="p-6 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl space-y-5"
                >
                  {/* Oberer Bereich: Name, Email & Status */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800/80 pb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-white tracking-tight">
                          {trainer.name || 'Unbenannter Trainer'}
                        </h2>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          trainer.status === 'approved' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                            : trainer.status === 'rejected'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {trainer.status === 'approved' ? 'Bestätigt ✓' : trainer.status === 'rejected' ? 'Abgelehnt ✕' : 'Prüfung ausstehend'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1.5">
                          <Mail size={13} className="text-slate-500" /> {trainer.email}
                        </span>
                        {trainer.city && (
                          <span className="flex items-center gap-1.5">
                            <MapPin size={13} className="text-slate-500" /> {trainer.city}
                          </span>
                        )}
                        {trainer.service_mode && (
                          <span className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300">
                            {trainer.service_mode}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Aktions-Buttons oben rechts */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => updateTrainerStatus(trainer.id, 'approved')}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
                      >
                        <CheckCircle size={14} /> Bestätigen
                      </button>
                      <button
                        onClick={() => updateTrainerStatus(trainer.id, 'rejected')}
                        className="px-4 py-2 bg-slate-950 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                      >
                        <XCircle size={14} /> Ablehnen
                      </button>
                    </div>
                  </div>

                  {/* Mitte 1: Lizenzen & Dokumente Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Lizenz-Angaben & PDF */}
                    <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                        <Award size={15} /> Trainerlizenz
                      </div>
                      <div className="text-xs space-y-1">
                        <p className="text-slate-400">
                          Lizenznummer / Info:{' '}
                          <span className="text-slate-200 font-medium">
                            {trainer.license_number || 'Keine Angabe'}
                          </span>
                        </p>
                      </div>

                      {trainer.license_document_path ? (
                        <button
                          type="button"
                          onClick={() => handleViewDocument(trainer.license_document_path!)}
                          className="w-full bg-slate-900 hover:bg-slate-850 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                        >
                          <FileText size={14} /> Lizenz-PDF öffnen <ExternalLink size={12} />
                        </button>
                      ) : (
                        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-2.5 text-center text-xs text-slate-500 italic">
                          Keine Lizenz-PDF hochgeladen
                        </div>
                      )}
                    </div>

                    {/* Versicherungs-Angaben & PDF */}
                    <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                        <Calendar size={15} /> Haftpflichtversicherung
                      </div>
                      <div className="text-xs space-y-1">
                        <p className="text-slate-400">
                          Gültig bis:{' '}
                          <span className="text-slate-200 font-medium">
                            {trainer.liability_insurance_expiry 
                              ? new Date(trainer.liability_insurance_expiry).toLocaleDateString('de-DE') 
                              : 'Keine Angabe'}
                          </span>
                        </p>
                      </div>

                      {trainer.insurance_document_path ? (
                        <button
                          type="button"
                          onClick={() => handleViewDocument(trainer.insurance_document_path!)}
                          className="w-full bg-slate-900 hover:bg-slate-850 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                        >
                          <FileText size={14} /> Versicherungs-PDF öffnen <ExternalLink size={12} />
                        </button>
                      ) : (
                        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-2.5 text-center text-xs text-slate-500 italic">
                          Keine Versicherungs-PDF hochgeladen
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mitte 2: Spezialisierungen & Bio */}
                  <div className="space-y-3">
                    {specialtiesList.length > 0 && (
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                          <Dumbbell size={12} /> Spezialisierungen ({specialtiesList.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {specialtiesList.map((spec, i) => (
                            <span 
                              key={i} 
                              className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg text-xs font-medium"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Bio / Beschreibung:
                      </span>
                      <div className="text-slate-300 bg-slate-950/80 p-3.5 rounded-xl text-xs border border-slate-800/80 whitespace-pre-line leading-relaxed">
                        {trainer.bio || 'Keine Bio angegeben.'}
                      </div>
                    </div>
                  </div>

                  {/* Paket-Info (falls vorhanden) */}
                  {(trainer.package_category || trainer.package_price) && (
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                      <span>Paket: <strong className="text-slate-200">{trainer.package_category || 'Standard'}</strong> ({trainer.package_duration || 'k.A.'})</span>
                      <span className="text-emerald-400 font-bold">{trainer.package_price ? `${trainer.package_price} €` : 'k.A.'}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}