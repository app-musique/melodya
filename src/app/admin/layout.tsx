import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/credits";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

const TABS = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/tarifs", label: "Tarifs" },
  { href: "/admin/fidelite", label: "Fidélité" },
  { href: "/admin/vitrines", label: "Vitrines" },
  { href: "/admin/commandes", label: "Commandes" },
  { href: "/admin/achats", label: "Achats" },
  { href: "/admin/integrations", label: "Intégrations" },
  { href: "/admin/systeme", label: "Système" },
  { href: "/admin/admins", label: "Admins" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) redirect("/connexion");
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/admin");
  const profile = await getCurrentProfile();
  if (!profile?.is_admin) notFound();

  return (
    <div className="min-h-dvh bg-cream">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="rounded-full bg-plum px-2 py-0.5 text-[11px] font-semibold text-cream">
              ADMIN
            </span>
          </div>
          <Link
            href="/tableau-de-bord"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            Retour à l&apos;app
          </Link>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-5">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-ink-soft hover:text-ink"
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  );
}
