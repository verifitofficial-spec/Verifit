'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ExternalLink, LayoutDashboard, LogOut, Search, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import BrandMark from '@/components/BrandMark';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuthProfile } from '@/lib/useAuthProfile';

type NavItem = { href: string; label: string; icon: LucideIcon; mobile?: boolean };

/** Auf diesen Seiten wird keine Seitenleiste angezeigt. */
const HIDDEN_PREFIXES = [
  '/admin',
  '/login',
  '/register',
  '/client/login',
  '/client/register',
  '/trainer/login',
  '/trainer/register',
  '/forgot-password',
  '/reset-password',
];

/** Neue Menüpunkte später einfach hier ergänzen. */
function getNavItems(role: 'client' | 'trainer', id: string): NavItem[] {
  if (role === 'trainer') {
    return [
      { href: `/trainer/${id}/dashboard`, label: 'Dashboard', icon: LayoutDashboard, mobile: true },
      { href: `/trainer/${id}`, label: 'Öffentliches Profil', icon: ExternalLink, mobile: true },
    ];
  }
  return [
    { href: `/client/${id}/dashboard`, label: 'Dashboard', icon: LayoutDashboard, mobile: true },
    { href: '/quiz', label: 'Trainer-Quiz', icon: Sparkles, mobile: true },
    { href: '/trainer/list', label: 'Trainer finden', icon: Search, mobile: true },
  ];
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuthProfile();

  const hidden = HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const role = auth.role === 'client' || auth.role === 'trainer' ? auth.role : null;
  const showNav = !hidden && !auth.loading && role !== null && auth.userId !== null;
  const items = showNav && role && auth.userId ? getNavItems(role, auth.userId) : [];

  const isActive = (href: string) => !href.includes('#') && pathname === href;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <>
      {showNav && (
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-canvas px-4 py-5 md:flex">
          <BrandMark className="px-2 py-2 text-xl" />
          <p className="px-2 pb-6 pt-1 text-xs font-medium text-ink-muted">{role === 'trainer' ? 'Trainerbereich' : 'Kundenbereich'}</p>

          <nav className="flex-1 space-y-1 overflow-y-auto" aria-label="Bereichsnavigation">
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-11 items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'border-accent bg-accent-soft text-ink'
                      : 'border-transparent text-ink-muted hover:bg-surface-soft hover:text-ink'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-2 border-t border-line pt-4">
            <ThemeToggle className="w-full" />
            {auth.email && <p className="truncate px-2 text-xs text-ink-muted">{auth.email}</p>}
            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-soft hover:text-ink"
            >
              <LogOut size={16} />
              Abmelden
            </button>
          </div>
        </aside>
      )}

      <div className={`flex min-w-0 flex-1 flex-col ${showNav ? 'pb-20 md:pb-0 md:pl-64' : ''}`}>{children}</div>

      {showNav && (
        <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-line bg-canvas px-1 py-1.5 md:hidden" aria-label="Mobile Bereichsnavigation">
          {items
            .filter((item) => item.mobile)
            .map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-xs font-medium ${
                    active ? 'text-accent' : 'text-ink-muted'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={18} />
                  <span className="truncate max-w-full px-1">{item.label}</span>
                </Link>
              );
            })}
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-12 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-medium text-ink-muted"
          >
            <LogOut size={18} />
            Abmelden
          </button>
          <ThemeToggle compact className="min-h-12 flex-1 border-0 bg-transparent px-1 shadow-none" />
        </nav>
      )}
    </>
  );
}
