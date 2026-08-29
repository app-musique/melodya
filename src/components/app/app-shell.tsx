"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarHeart,
  Clapperboard,
  Coins,
  Compass,
  Home,
  Menu,
  Music4,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { AccountNav } from "@/components/account-nav";
import { NotificationsBell } from "@/components/app/notifications-bell";
import type { Profile } from "@/lib/domain";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  soon?: boolean;
};

const NAV: NavItem[] = [
  { href: "/tableau-de-bord", label: "Accueil", icon: Home },
  { href: "/commander", label: "Créer", icon: Sparkles },
  { href: "/explorer", label: "Explorer", icon: Compass },
  { href: "/mes-chansons", label: "Mes chansons", icon: Music4 },
  { href: "/occasions", label: "Occasions", icon: CalendarHeart },
  { href: "/studio", label: "Studio clip", icon: Clapperboard, soon: true },
  { href: "/profil", label: "Profil", icon: UserRound },
];

export function AppShell({
  profile,
  email,
  unread,
  children,
}: {
  profile: Profile;
  email: string;
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  // Restaure la préférence de repli (API navigateur — pas dispo au SSR).
  useEffect(() => {
    try {
      if (localStorage.getItem("mel_sidebar_collapsed") === "1") setCollapsed(true);
    } catch {}
  }, []);

  // Ferme le tiroir mobile à chaque changement de page.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function toggleCollapsed() {
    setCollapsed((v) => {
      try {
        localStorage.setItem("mel_sidebar_collapsed", v ? "0" : "1");
      } catch {}
      return !v;
    });
  }

  const items = [...NAV];
  if (profile.is_admin) {
    items.push({ href: "/admin", label: "Admin", icon: ShieldCheck });
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {items.map((it) => {
        const active = isActive(it.href);
        const content = (
          <>
            <it.icon className="size-5 shrink-0" />
            {!collapsed && <span className="truncate">{it.label}</span>}
            {!collapsed && it.soon && (
              <span className="ml-auto rounded-full bg-line/70 px-1.5 py-0.5 text-[10px] font-semibold text-ink-soft">
                Bientôt
              </span>
            )}
          </>
        );
        const cls = `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          active ? "bg-brand/10 text-brand-strong" : "text-ink-soft hover:bg-cream-deep hover:text-ink"
        } ${it.soon ? "cursor-not-allowed opacity-55" : ""}`;

        return it.soon ? (
          <span key={it.href} className={cls} title="Bientôt disponible">
            {content}
          </span>
        ) : (
          <Link key={it.href} href={it.href} className={cls}>
            {content}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarInner = (mobile: boolean) => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-4">
        {collapsed && !mobile ? (
          <span className="grid size-9 place-items-center rounded-xl gradient-brand text-white">
            <Music4 className="size-4.5" />
          </span>
        ) : (
          <Link href="/tableau-de-bord">
            <Logo />
          </Link>
        )}
        {mobile ? (
          <button onClick={() => setMobileOpen(false)} aria-label="Fermer">
            <X className="size-5" />
          </button>
        ) : (
          <button
            onClick={toggleCollapsed}
            className="hidden text-ink-soft hover:text-ink md:block"
            aria-label={collapsed ? "Déplier" : "Replier"}
          >
            {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </button>
        )}
      </div>

      {nav}

      <div className="border-t border-line p-3">
        <div
          className={`flex items-center gap-3 rounded-xl px-2 py-2 ${collapsed && !mobile ? "justify-center" : ""}`}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full gradient-brand text-xs font-semibold text-white">
            {(profile.full_name || email).charAt(0).toUpperCase()}
          </span>
          {(!collapsed || mobile) && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{profile.full_name || "Mon compte"}</p>
              <p className="truncate text-xs text-ink-soft">{email}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-cream">
      {/* Sidebar desktop */}
      <aside
        className={`sticky top-0 hidden h-dvh shrink-0 border-r border-line bg-white transition-[width] md:block ${
          collapsed ? "w-[4.5rem]" : "w-64"
        }`}
      >
        {sidebarInner(false)}
      </aside>

      {/* Drawer mobile */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink/40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-line bg-white md:hidden">
            {sidebarInner(true)}
          </aside>
        </>
      )}

      {/* Colonne principale */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-cream/90 px-4 backdrop-blur-md sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="grid size-9 place-items-center rounded-lg border border-line md:hidden"
            aria-label="Menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="hidden md:block" />

          <div className="flex items-center gap-3">
            <Link
              href="/credits"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-cream-deep"
            >
              <Coins className="size-4 text-gold" />
              {profile.credit_balance}
              <span className="hidden text-ink-soft sm:inline">
                crédit{profile.credit_balance === 1 ? "" : "s"}
              </span>
              <Plus className="size-3.5 text-brand-strong" />
            </Link>
            <NotificationsBell initialUnread={unread} />
            <AccountNav email={email} />
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
