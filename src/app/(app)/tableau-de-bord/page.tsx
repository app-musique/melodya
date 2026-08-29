import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarHeart, Coins, Sparkles } from "lucide-react";
import { StatusBadge } from "@/components/song/status-badge";
import { getCurrentUser } from "@/lib/supabase/server";
import { getBalance, getCurrentProfile } from "@/lib/credits";
import { listSongs } from "@/lib/songs";
import { upcomingOccasions } from "@/lib/occasions";

export const metadata: Metadata = { title: "Accueil", robots: { index: false } };

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "Bonne nuit";
  if (h < 18) return "Bonjour";
  return "Bonsoir";
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  const [profile, balance, songs, occasions] = await Promise.all([
    getCurrentProfile(),
    getBalance(user.id),
    listSongs(),
    upcomingOccasions(user.id, 60),
  ]);

  const firstName = (profile?.full_name || "").split(" ")[0];
  const draft = songs.find((s) => s.status === "draft");
  const recent = songs.filter((s) => s.status !== "draft").slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:py-10">
      <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
        {greeting()}{firstName ? `, ${firstName}` : ""} 👋
      </h1>
      <p className="mt-1 text-sm text-ink-soft">Ton tableau de bord Muzikii.</p>

      {/* CTA principale */}
      <Link
        href="/commander"
        className="mt-6 flex items-center gap-4 rounded-3xl border border-brand/30 bg-white p-5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl gradient-brand text-white">
          <Sparkles className="size-5" />
        </span>
        <span className="flex-1">
          <span className="block font-display text-lg font-bold">
            {draft ? "Reprendre ma commande" : "Créer une chanson"}
          </span>
          <span className="block text-sm text-ink-soft">
            {draft
              ? `Brouillon${draft.recipient_name ? ` pour ${draft.recipient_name}` : ""} en cours`
              : "Anniversaire, mariage, dot, hommage… en 5 minutes"}
          </span>
        </span>
        <ArrowRight className="size-5 text-brand-strong" />
      </Link>

      {/* Solde + occasions */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-line bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Coins className="size-4 text-gold" />
            Mes crédits
          </div>
          <p className="mt-2 font-display text-3xl font-extrabold">{balance}</p>
          <p className="text-xs text-ink-soft">1 chanson = 1 crédit</p>
          <Link
            href="/credits"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong"
          >
            Acheter des crédits
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="rounded-3xl border border-line bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <CalendarHeart className="size-4 text-brand-strong" />
              Occasions à venir
            </span>
            <Link href="/occasions" className="text-xs font-medium text-ink-soft hover:text-ink">
              Gérer
            </Link>
          </div>
          {occasions.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">
              Ajoute les dates à ne pas oublier —{" "}
              <Link href="/occasions" className="font-semibold text-brand-strong">
                ajouter une date
              </Link>
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {occasions.slice(0, 3).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    {o.label}
                    {o.person_name ? ` · ${o.person_name}` : ""}
                    <span className="text-ink-soft">
                      {" "}
                      — {o.daysUntil === 0 ? "aujourd'hui" : `dans ${o.daysUntil} j`}
                    </span>
                  </span>
                  <a
                    href={`/commander?occasion=${encodeURIComponent(o.label)}${
                      o.person_name ? `&recipient=${encodeURIComponent(o.person_name)}` : ""
                    }`}
                    className="shrink-0 text-xs font-semibold text-brand-strong"
                  >
                    Créer
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Chansons récentes */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Mes chansons récentes</h2>
          {recent.length > 0 && (
            <Link href="/mes-chansons" className="text-sm font-medium text-ink-soft hover:text-ink">
              Tout voir
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-line bg-white p-6 text-center text-sm text-ink-soft">
            Aucune chanson pour l&apos;instant.
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {recent.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/mes-chansons/${s.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 transition-colors hover:bg-cream-deep"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {s.recipient_name || "Chanson"}
                    </span>
                    <span className="block truncate text-xs text-ink-soft">
                      {s.occasion || "—"} · {s.music_style || "—"}
                    </span>
                  </span>
                  <StatusBadge status={s.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
