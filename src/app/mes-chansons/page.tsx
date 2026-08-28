import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Music4, Plus } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { StatusBadge } from "@/components/song/status-badge";
import { listSongs } from "@/lib/songs";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { formatXOF } from "@/lib/pricing";

export const metadata: Metadata = { title: "Mes chansons", robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function MesChansonsPage() {
  if (!isSupabaseConfigured) redirect("/connexion");
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/mes-chansons");

  const songs = await listSongs();
  const active = songs.filter((s) => s.status !== "draft");
  const drafts = songs.filter((s) => s.status === "draft");

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Mes chansons
          </h1>
          <Link
            href="/commander"
            className="inline-flex items-center gap-2 rounded-full gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-float)]"
          >
            <Plus className="size-4" />
            Nouvelle chanson
          </Link>
        </div>

        {active.length === 0 && drafts.length === 0 && (
          <div className="mt-10 rounded-3xl border border-dashed border-line bg-white p-10 text-center">
            <Music4 className="mx-auto size-8 text-brand" />
            <p className="mt-3 font-semibold">Aucune chanson pour l&apos;instant</p>
            <p className="mt-1 text-sm text-ink-soft">
              Lance ta première création, elle est prête en 24h.
            </p>
            <Link
              href="/commander"
              className="mt-5 inline-flex items-center gap-2 rounded-full gradient-brand px-6 py-3 text-sm font-semibold text-white"
            >
              Créer ma chanson
              <ArrowRight className="size-4" />
            </Link>
          </div>
        )}

        {active.length > 0 && (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {active.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/mes-chansons/${s.id}`}
                  className="block rounded-3xl border border-line bg-white p-5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-display text-lg font-bold">
                        {s.recipient_name || "Chanson"}
                      </p>
                      <p className="text-sm text-ink-soft">
                        {s.occasion || "—"} · {s.music_style || "—"}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="mt-4 text-xs text-ink-soft">
                    {new Date(s.created_at).toLocaleDateString("fr-FR")} · {formatXOF(s.price_total)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {drafts.length > 0 && (
          <div className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
              Brouillon en cours
            </h2>
            <Link
              href="/commander"
              className="mt-3 flex items-center justify-between rounded-2xl border border-line bg-white p-5"
            >
              <span className="text-sm font-medium">
                Reprendre ma commande {drafts[0].recipient_name ? `pour ${drafts[0].recipient_name}` : ""}
              </span>
              <ArrowRight className="size-4 text-brand-strong" />
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
