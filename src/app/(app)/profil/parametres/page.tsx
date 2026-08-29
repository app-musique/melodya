import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Bell, FileText, Globe, LifeBuoy, LogOut, Shield, Trash2 } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Réglages", robots: { index: false } };

export default async function ParametresPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  const rows = [
    { icon: Globe, label: "Langue", value: "Français", soon: true },
    { icon: Bell, label: "Notifications", value: "Gérer les alertes", soon: true },
    { icon: Shield, label: "Confidentialité des créations", value: "Privé par défaut", soon: true },
    { icon: LifeBuoy, label: "Aide & support", value: "FAQ et contact", href: "/#faq" },
    { icon: FileText, label: "Conditions d'utilisation", value: "", href: "/#" },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:py-10">
      <Link
        href="/profil"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Profil
      </Link>
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Réglages</h1>

      <ul className="mt-6 divide-y divide-line rounded-3xl border border-line bg-white">
        {rows.map((r) => {
          const inner = (
            <>
              <span className="flex items-center gap-3">
                <r.icon className="size-4 text-ink-soft" />
                <span className="text-sm font-medium">{r.label}</span>
              </span>
              <span className="text-xs text-ink-soft">
                {r.soon ? "Bientôt" : r.value}
              </span>
            </>
          );
          return (
            <li key={r.label}>
              {r.href ? (
                <Link
                  href={r.href}
                  className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-cream-deep"
                >
                  {inner}
                </Link>
              ) : (
                <div className="flex items-center justify-between gap-3 px-5 py-4 opacity-70">
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 divide-y divide-line rounded-3xl border border-line bg-white">
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-5 py-4 text-sm font-medium text-ink hover:bg-cream-deep"
          >
            <LogOut className="size-4" />
            Se déconnecter
          </button>
        </form>
        <div className="flex items-center gap-3 px-5 py-4 text-sm font-medium text-brand-strong opacity-70">
          <Trash2 className="size-4" />
          Supprimer mon compte <span className="ml-auto text-xs">Bientôt</span>
        </div>
      </div>
    </div>
  );
}
