'use client';

import { useEffect, useId, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { XCircle } from 'lucide-react';
import type { Feedback } from '@/lib/trainer-dashboard/types';

export const inputClass =
  'w-full bg-canvas/80 border border-line-strong rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-accent transition shadow-inner';
export const smallInputClass =
  'w-full bg-canvas border border-line-strong rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent';
export const labelClass = 'block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2';
export const primaryButtonClass =
  'bg-accent hover:bg-accent-strong text-primary-foreground font-bold rounded-xl text-sm transition cursor-pointer disabled:opacity-60';
export const navButtonClass =
  'bg-surface hover:bg-surface-soft border border-line text-ink-soft px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer';

export function SectionCard({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <div
      id={id}
      className="border-t border-line py-6 space-y-5 scroll-mt-6 sm:py-7"
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  icon: Icon,
  title,
  description,
  level = 2,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  level?: 1 | 2;
  actions?: React.ReactNode;
}) {
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <div className="text-accent">
          <Icon size={20} />
        </div>
        <div>
          <Heading className="text-lg font-bold text-ink tracking-tight sm:text-xl">{title}</Heading>
          {description && <p className="mt-0.5 text-sm leading-6 text-ink-muted">{description}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}

export function FeedbackBox({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <div
      role={feedback.type === 'error' ? 'alert' : undefined}
      aria-live={feedback.type === 'success' ? 'polite' : undefined}
      className={`p-3.5 rounded-xl text-xs font-medium border ${
        feedback.type === 'error'
          ? 'bg-danger-soft border-danger-line text-danger'
          : 'bg-accent-soft border-accent/40 text-accent'
      }`}
    >
      {feedback.text}
    </div>
  );
}

export function ModalShell({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="bg-surface border border-line rounded-2xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto focus:outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-muted hover:text-ink transition cursor-pointer"
          aria-label="Schließen"
        >
          <XCircle size={20} />
        </button>
        <h3 id={titleId} className="text-lg font-bold text-ink mb-2">{title}</h3>
        <p id={descriptionId} className="text-xs text-ink-muted mb-6">{description}</p>
        {children}
      </div>
    </div>
  );
}
