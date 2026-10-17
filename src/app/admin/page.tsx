'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import ThemeToggle from '@/components/ThemeToggle';
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

type AdminApiResponse = {
  error?: string;
  signedUrl?: string;
  trainer?: {
    id: string;
    status: 'approved' | 'rejected';
  };
};

export default function VerificationPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Trainer aus Supabase laden (mit useCallback nach oben verschoben)
  const fetchTrainers = useCallback(async () => {
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
  }, []);

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
  }, [router, fetchTrainers]);

  // Signed URL nur nach serverseitiger Admin-Prüfung generieren & PDF-Dokument in neuem Tab öffnen
  async function handleViewDocument(path: string) {
    if (!path) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      alert('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.');
      return;
    }

    const response = await fetch('/api/admin/verification-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ path }),
    });
    const data = (await response.json().catch(() => ({}))) as AdminApiResponse;

    if (!response.ok || !data.signedUrl) {
      alert('Dokument konnte nicht geöffnet werden: ' + (data.error || 'Fehler beim Erstellen des Links'));
      return;
    }

    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  // Status eines Trainers aktualisieren (z.B. 'approved' oder 'rejected')
  async function updateTrainerStatus(id: string, newStatus: 'approved' | 'rejected') {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      alert('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.');
      return;
    }

    const response = await fetch('/api/admin/trainer-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ trainerId: id, status: newStatus }),
    });
    const data = (await response.json().catch(() => ({}))) as AdminApiResponse;

    if (!response.ok || !data.trainer) {
      console.error('Trainerstatus konnte nicht aktualisiert werden');
      alert(data.error || 'Fehler beim Speichern.');
    } else {
      // Liste lokal aktualisieren, damit die UI sofort reagiert
      setTrainers(prev =>
        prev.map(t => (t.id === data.trainer?.id ? { ...t, status: data.trainer.status } : t))
      );
    }
  }

  // Admin Logout Funktion
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  return (
    <main className="min-h-screen bg-canvas text-ink p-6 sm:p-10 selection:bg-accent selection:text-primary-foreground">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-line pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-accent-soft text-accent rounded-2xl border border-accent/35">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-accent tracking-tight">Trainer Verifizierung</h1>
              <p className="text-xs text-ink-muted mt-0.5">Admin Control Center – Dokumentenprüfung & Freigaben</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle compact />
            <Link 
              href="/" 
              className="text-ink-muted hover:text-ink text-xs px-3.5 py-2 rounded-xl border border-line bg-surface transition"
            >
              Zur Startseite
            </Link>
            <button
              onClick={handleLogout}
              className="bg-surface hover:bg-surface-soft border border-line text-xs px-4 py-2 rounded-xl transition cursor-pointer text-ink-soft font-medium"
            >
              Abmelden
            </button>
          </div>
        </div>

        <p className="text-ink-muted text-xs">
          Jeder Trainer auf VeriFit wird manuell geprüft: Lizenz-PDFs, Haftpflichtversicherung, Stammdaten und fachliche Qualifikation.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : trainers.length === 0 ? (
          <div className="p-8 bg-surface border border-line rounded-2xl text-center text-ink-muted text-sm">
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
                  className="p-6 bg-surface/80 backdrop-blur-md border border-line rounded-2xl shadow-xl space-y-5"
                >
                  {/* Oberer Bereich: Name, Email & Status */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-line/80 pb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-ink tracking-tight">
                          {trainer.name || 'Unbenannter Trainer'}
                        </h2>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          trainer.status === 'approved' 
                            ? 'bg-accent-soft text-accent border border-accent/45'
                            : trainer.status === 'rejected'
                            ? 'bg-danger-soft text-danger border border-danger-line'
                            : 'bg-warning-soft text-warning border border-warning-line'
                        }`}>
                          {trainer.status === 'approved' ? 'Bestätigt ✓' : trainer.status === 'rejected' ? 'Abgelehnt ✕' : 'Prüfung ausstehend'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-ink-muted mt-1">
                        <span className="flex items-center gap-1.5">
                          <Mail size={13} className="text-ink-muted" /> {trainer.email}
                        </span>
                        {trainer.city && (
                          <span className="flex items-center gap-1.5">
                            <MapPin size={13} className="text-ink-muted" /> {trainer.city}
                          </span>
                        )}
                        {trainer.service_mode && (
                          <span className="bg-canvas border border-line px-2 py-0.5 rounded text-[11px] text-ink-soft">
                            {trainer.service_mode}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Aktions-Buttons oben rechts */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => updateTrainerStatus(trainer.id, 'approved')}
                        className="px-4 py-2 bg-accent hover:bg-accent-strong text-primary-foreground text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle size={14} /> Bestätigen
                      </button>
                      <button
                        onClick={() => updateTrainerStatus(trainer.id, 'rejected')}
                        className="px-4 py-2 bg-canvas hover:bg-danger-soft text-danger border border-danger-line text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                      >
                        <XCircle size={14} /> Ablehnen
                      </button>
                    </div>
                  </div>

                  {/* Mitte 1: Lizenzen & Dokumente Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Lizenz-Angaben & PDF */}
                    <div className="bg-canvas/80 p-4 rounded-xl border border-line/80 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
                        <Award size={15} /> Trainerlizenz
                      </div>
                      <div className="text-xs space-y-1">
                        <p className="text-ink-muted">
                          Lizenznummer / Info:{' '}
                          <span className="text-ink-soft font-medium">
                            {trainer.license_number || 'Keine Angabe'}
                          </span>
                        </p>
                      </div>

                      {trainer.license_document_path ? (
                        <button
                          type="button"
                          onClick={() => handleViewDocument(trainer.license_document_path!)}
                          className="w-full bg-surface hover:bg-surface-soft border border-accent/45 text-accent px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                        >
                          <FileText size={14} /> Lizenz-PDF öffnen <ExternalLink size={12} />
                        </button>
                      ) : (
                        <div className="bg-surface/50 border border-line/50 rounded-xl p-2.5 text-center text-xs text-ink-muted italic">
                          Keine Lizenz-PDF hochgeladen
                        </div>
                      )}
                    </div>

                    {/* Versicherungs-Angaben & PDF */}
                    <div className="bg-canvas/80 p-4 rounded-xl border border-line/80 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
                        <Calendar size={15} /> Haftpflichtversicherung
                      </div>
                      <div className="text-xs space-y-1">
                        <p className="text-ink-muted">
                          Gültig bis:{' '}
                          <span className="text-ink-soft font-medium">
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
                          className="w-full bg-surface hover:bg-surface-soft border border-accent/45 text-accent px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                        >
                          <FileText size={14} /> Versicherungs-PDF öffnen <ExternalLink size={12} />
                        </button>
                      ) : (
                        <div className="bg-surface/50 border border-line/50 rounded-xl p-2.5 text-center text-xs text-ink-muted italic">
                          Keine Versicherungs-PDF hochgeladen
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mitte 2: Spezialisierungen & Bio */}
                  <div className="space-y-3">
                    {specialtiesList.length > 0 && (
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1.5 flex items-center gap-1">
                          <Dumbbell size={12} /> Spezialisierungen ({specialtiesList.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {specialtiesList.map((spec, i) => (
                            <span 
                              key={i} 
                              className="bg-accent-soft text-accent border border-accent/35 px-2.5 py-0.5 rounded-lg text-xs font-medium"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                        Bio / Beschreibung:
                      </span>
                      <div className="text-ink-soft bg-canvas/80 p-3.5 rounded-xl text-xs border border-line/80 whitespace-pre-line leading-relaxed">
                        {trainer.bio || 'Keine Bio angegeben.'}
                      </div>
                    </div>
                  </div>

                  {/* Paket-Info (falls vorhanden) */}
                  {(trainer.package_category || trainer.package_price) && (
                    <div className="pt-2 border-t border-line/60 flex items-center justify-between text-xs text-ink-muted">
                      <span>Paket: <strong className="text-ink-soft">{trainer.package_category || 'Standard'}</strong> ({trainer.package_duration || 'k.A.'})</span>
                      <span className="text-accent font-bold">{trainer.package_price ? `${trainer.package_price} €` : 'k.A.'}</span>
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
