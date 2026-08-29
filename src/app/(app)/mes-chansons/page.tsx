import { after } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Music4, Plus } from "lucide-react";
import { SongLibrary } from "@/components/song/song-library";
import { advanceGeneration, listSongsWithAudio, syncSongAssets } from "@/lib/songs";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mes chansons", robots: { index: false } };

export default async function MesChansonsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/mes-chansons");

  const songs = await listSongsWithAudio();

  // Réparation « je reviens plus tard » : fait avancer / re-synchronise en tâche
  // de fond les chansons restées en plan (webhook + cron KO).
  const stuck = songs.filter(
    (s) => s.status === "generating" || (s.status === "ready" && !s.assets_synced_at),
  );
  if (stuck.length) {
    after(async () => {
      for (const s of stuck) {
        if (s.status === "generating") await advanceGeneration(s.id).catch(() => {});
        await syncSongAssets(s.id).catch(() => {});
      }
    });
  }

  const active = songs.filter((s) => s.status !== "draft");
  const drafts = songs.filter((s) => s.status === "draft");

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:py-10">
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
          <p className="mt-1 text-sm text-ink-soft">Lance ta première création.</p>
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
        <div className="mt-8">
          <p className="mb-3 text-sm text-ink-soft">
            Appuie sur une chanson pour l&apos;écouter — les paroles défilent avec la musique.
          </p>
          <SongLibrary songs={active} />
        </div>
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
              Reprendre ma commande{" "}
              {drafts[0].recipient_name ? `pour ${drafts[0].recipient_name}` : ""}
            </span>
            <ArrowRight className="size-4 text-brand-strong" />
          </Link>
        </div>
      )}
    </div>
  );
}
