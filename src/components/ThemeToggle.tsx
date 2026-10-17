'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export default function ThemeToggle({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  const label = dark ? 'Helles Design aktivieren' : 'Dunkles Design aktivieren';
  const Icon = dark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink-soft shadow-sm transition-colors hover:border-line-strong hover:bg-surface-soft hover:text-ink ${className}`}
      aria-label={label}
      title={label}
    >
      <Icon size={17} aria-hidden="true" />
      {!compact && <span>{dark ? 'Hell' : 'Dunkel'}</span>}
    </button>
  );
}
