import { after } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ChevronDown, Music4, Plus } from "lucide-react";
import { StatusBadge } from "@/components/song/status-badge";
import {
  advanceGeneration,
  listSongsWithAudio,
  syncSongAssets,
  type SongListItem,
} from "@/lib/songs";
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
        <ul className="mt-8 space-y-4">
          {active.map((s) => (
            <SongCard key={s.id} song={s} />
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

function SongCard({ song: s }: { song: SongListItem }) {
  return (
    <li className="rounded-3xl border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/mes-chansons/${s.id}`}
            className="font-display text-lg font-bold hover:text-brand-strong"
          >
            {s.recipient_name || "Chanson"}
          </Link>
          <p className="truncate text-sm text-ink-soft">
            {s.occasion || "—"} · {s.music_style || "—"}
          </p>
        </div>
        <StatusBadge status={s.status} />
      </div>

      {s.status === "ready" && s.audio_url && (
        <audio controls preload="none" src={s.audio_url} className="mt-3 w-full">
          <track kind="captions" />
        </audio>
      )}

      {s.lyrics && (
        <details className="group mt-3">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-brand-strong [&::-webkit-details-marker]:hidden">
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
            Paroles
          </summary>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-soft">
            {s.lyrics}
          </pre>
        </details>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs text-ink-soft">
        <span>{new Date(s.created_at).toLocaleDateString("fr-FR")}</span>
        <Link
          href={`/mes-chansons/${s.id}`}
          className="inline-flex items-center gap-1 font-semibold text-brand-strong"
        >
          Ouvrir
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </li>
  );
}
