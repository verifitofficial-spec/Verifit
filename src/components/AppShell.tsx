'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ExternalLink, LayoutDashboard, LogOut, MessageSquare, Search, Sparkles, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
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
      { href: `/trainer/${id}/clients`, label: 'Meine Kunden', icon: Users, mobile: true },
      { href: `/trainer/${id}`, label: 'Öffentliches Profil', icon: ExternalLink, mobile: true },
    ];
  }
  return [
    { href: `/client/${id}/dashboard`, label: 'Dashboard', icon: LayoutDashboard, mobile: true },
    { href: `/client/${id}/dashboard#buchungen`, label: 'Buchungen', icon: Users },
    { href: `/client/${id}/dashboard#tracking`, label: 'Tracking', icon: Sparkles },
    { href: `/client/${id}/dashboard#chat`, label: 'Nachrichten', icon: MessageSquare, mobile: true },
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
        <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col bg-slate-950 border-r border-slate-900 z-30 p-4">
          <Link href="/" className="text-xl font-black tracking-wider text-emerald-400 px-2 py-3">
            VERIFIT<span className="text-white">.</span>
          </Link>
          <p className="px-2 pb-4 text-[11px] text-slate-500">{role === 'trainer' ? 'Expert Hub' : 'Kunden-Portal'}</p>

          <nav className="flex-1 space-y-1 overflow-y-auto">
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    active
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-900 pt-3 space-y-2">
            {auth.email && <p className="px-2 text-[11px] text-slate-500 truncate">{auth.email}</p>}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition cursor-pointer"
            >
              <LogOut size={16} />
              Abmelden
            </button>
          </div>
        </aside>
      )}

      <div className={`flex flex-1 flex-col min-w-0 ${showNav ? 'md:pl-60 pb-20 md:pb-0' : ''}`}>{children}</div>

      {showNav && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-950/95 backdrop-blur border-t border-slate-900 flex items-stretch justify-around px-1 py-1.5">
          {items
            .filter((item) => item.mobile)
            .map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium ${
                    active ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  <Icon size={18} />
                  <span className="truncate max-w-full px-1">{item.label}</span>
                </Link>
              );
            })}
          <button
            type="button"
            onClick={handleLogout}
            className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium text-slate-400 cursor-pointer"
          >
            <LogOut size={18} />
            Abmelden
          </button>
        </nav>
      )}
    </>
  );
}
