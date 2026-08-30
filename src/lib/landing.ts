import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type LandingExample = {
  order: number;
  songId: string;
  audioUrl: string | null;
  coverImage: string | null;
  durationSec: number | null;
};

/**
 * Chansons vitrines épinglées sur la landing (`songs.landing_order`), prêtes.
 * Lecture via le client admin : la page d'accueil est publique, les fichiers
 * audio sont sur un bucket Storage public → jouables sans compte.
 */
export async function getLandingExamples(): Promise<LandingExample[]> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("songs")
    .select("id, landing_order, status")
    .not("landing_order", "is", null)
    .eq("status", "ready")
    .order("landing_order");

  const rows = (data as { id: string; landing_order: number }[]) ?? [];
  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const { data: versions } = await admin
    .from("song_versions")
    .select("song_id, audio_url, duration_sec, is_selected, idx")
    .in("song_id", ids)
    .order("idx");

  const media = new Map<string, { audio: string | null; dur: number | null }>();
  for (const v of (versions as {
    song_id: string;
    audio_url: string | null;
    duration_sec: number | null;
    is_selected: boolean;
  }[]) ?? []) {
    if (!media.has(v.song_id) || v.is_selected) {
      media.set(v.song_id, { audio: v.audio_url, dur: v.duration_sec });
    }
  }

  const { data: covers } = await admin
    .from("songs")
    .select("id, cover_url")
    .in("id", ids);
  const coverById = new Map(
    ((covers as { id: string; cover_url: string | null }[]) ?? []).map((c) => [c.id, c.cover_url]),
  );

  return rows.map((r) => ({
    order: r.landing_order,
    songId: r.id,
    audioUrl: media.get(r.id)?.audio ?? null,
    coverImage: coverById.get(r.id) ?? null,
    durationSec: media.get(r.id)?.dur ?? null,
  }));
}
