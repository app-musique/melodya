import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import type { LyricsTiming, Song } from "@/lib/domain";

export type ExploreItem = {
  id: string;
  title: string;
  artist: string | null;
  occasion: string | null;
  style: string | null;
  cover: string;
  plays: number;
  isShowcase: boolean;
};

export type ExploreDetail = ExploreItem & {
  audioUrl: string | null;
  lyrics: string | null;
  timing: LyricsTiming | null;
  mood: string | null;
  voice: string | null;
  language: string | null;
};

const SELECT =
  "id,is_showcase,showcase_title,showcase_artist,sender_name,recipient_name,occasion,music_style,mood,voice,language,lyrics,lyrics_timing,plays_count,status,is_public";

function toItem(s: Record<string, unknown>): ExploreItem {
  const song = s as unknown as Song;
  return {
    id: song.id,
    title:
      song.showcase_title ||
      (song.is_showcase ? "Une chanson Melodya" : `Pour ${song.recipient_name ?? "un proche"}`),
    artist: song.showcase_artist || song.sender_name || null,
    occasion: song.occasion,
    style: song.music_style,
    cover: `${env.siteUrl}/api/cover/${song.id}`,
    plays: song.plays_count ?? 0,
    isShowcase: song.is_showcase,
  };
}

export async function listExplore(filter?: {
  occasion?: string;
  style?: string;
}): Promise<ExploreItem[]> {
  const admin = createAdminClient();
  let q = admin
    .from("songs")
    .select(SELECT)
    .or("is_showcase.eq.true,and(is_public.eq.true,status.eq.ready)")
    .order("plays_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);

  if (filter?.occasion) q = q.eq("occasion", filter.occasion);
  if (filter?.style) q = q.eq("music_style", filter.style);

  const { data } = await q;
  return ((data as Record<string, unknown>[]) ?? []).map(toItem);
}

export async function getExploreSong(id: string): Promise<ExploreDetail | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("songs").select(SELECT).eq("id", id).maybeSingle();
  if (!data) return null;
  const s = data as unknown as Song;
  if (!s.is_showcase && !(s.is_public && s.status === "ready")) return null;

  const { data: version } = await admin
    .from("song_versions")
    .select("audio_url")
    .eq("song_id", id)
    .eq("is_selected", true)
    .maybeSingle();

  return {
    ...toItem(data as Record<string, unknown>),
    audioUrl: (version as { audio_url: string } | null)?.audio_url ?? null,
    lyrics: s.lyrics,
    timing: s.lyrics_timing,
    mood: s.mood,
    voice: s.voice,
    language: s.language,
  };
}

export async function bumpCounter(
  songId: string,
  field: "plays_count" | "inspire_count" | "gift_view_count",
): Promise<void> {
  const admin = createAdminClient();
  await admin.rpc("increment_song_counter", { p_song: songId, p_field: field });
}

/** Brief d'inspiration : style / ambiance / voix d'une chanson publique ou vitrine. */
export async function getInspiration(id: string): Promise<{
  music_style: string | null;
  mood: string | null;
  voice: string | null;
  language: string | null;
} | null> {
  const detail = await getExploreSong(id);
  if (!detail) return null;
  return {
    music_style: detail.style,
    mood: detail.mood,
    voice: detail.voice,
    language: detail.language,
  };
}
