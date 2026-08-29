import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ClipWorkshop } from "@/components/clip/clip-workshop";
import { getClipEditor } from "@/lib/clip";
import { getCurrentUser } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Studio clip", robots: { index: false } };

type Props = { params: Promise<{ id: string }> };

export default async function StudioSongPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/studio");
  const { id } = await params;

  const editor = await getClipEditor(id);
  if (!editor) notFound();
  if (editor.song.status !== "ready") redirect(`/mes-chansons/${id}`);

  const { song, version, photos, slug } = editor;

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:py-10">
      <Link
        href="/studio"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Studio clip
      </Link>

      <h1 className="font-display text-2xl font-extrabold tracking-tight">
        Clip pour {song.recipient_name || "ta chanson"}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        {song.occasion || "—"} · {song.music_style || "—"}
      </p>

      <div className="mt-8">
        {song.lyrics ? (
          <ClipWorkshop
            songId={song.id}
            initialPhotos={photos}
            initialDedication={song.clip_dedication ?? ""}
            lyrics={song.lyrics}
            timing={song.lyrics_timing}
            audioUrl={version?.audio_url ?? null}
            cover={`${env.siteUrl}/api/cover/${song.id}`}
            recipientName={song.recipient_name}
            occasion={song.occasion}
            initialSlug={slug}
            initialPublic={song.is_public}
          />
        ) : (
          <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
            Cette chanson n&apos;a pas encore de paroles enregistrées.
          </p>
        )}
      </div>
    </div>
  );
}
