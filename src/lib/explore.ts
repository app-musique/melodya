import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { reactionSummary, reactionTotals, type ReactionSummary } from "@/lib/reactions";
import type { LyricsTiming, Song } from "@/lib/domain";

export type ExploreItem = {
  id: string;
  title: string;
  artist: string | null;
  occasion: string | null;
  style: string | null;
  cover: string;
  plays: number;
  reactions: number;
  isShowcase: boolean;
};

export type ExploreDetail = ExploreItem & {
  audioUrl: string | null;
  lyrics: string | null;
  timing: LyricsTiming | null;
  mood: string | null;
  voice: string | null;
  language: string | null;
  reactionsByEmoji: ReactionSummary["byEmoji"];
  creatorId: string;
};

const SELECT =
  "id,user_id,is_showcase,shared_with_followers,showcase_title,showcase_artist,sender_name,recipient_name,occasion,music_style,mood,voice,language,lyrics,lyrics_timing,plays_count,status,is_public";

function toItem(s: Record<string, unknown>, reactions = 0): ExploreItem {
  const song = s as unknown as Song;
  // Chanson partagée avec des abonnés (pas une vitrine) : on n'expose jamais le
  // prénom réel du destinataire — titre neutre basé sur l'occasion.
  const fallbackTitle = song.is_showcase
    ? "Une chanson Muzikii"
    : song.occasion || "Chanson";
  return {
    id: song.id,
    title: song.showcase_title || fallbackTitle,
    artist: song.showcase_artist || null,
    occasion: song.occasion,
    style: song.music_style,
    cover: `${env.siteUrl}/api/cover/${song.id}`,
    plays: song.plays_count ?? 0,
    reactions,
    isShowcase: song.is_showcase,
  };
}

export async function listExplore(filter?: {
  occasion?: string;
  style?: string;
}): Promise<ExploreItem[]> {
  const admin = createAdminClient();
  // Galerie curée : uniquement les vitrines (is_showcase). Le partage de
  // créations par la communauté sera une fonctionnalité dédiée (modération).
  let q = admin
    .from("songs")
    .select(SELECT)
    .eq("is_showcase", true)
    .order("plays_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);

  if (filter?.occasion) q = q.eq("occasion", filter.occasion);
  if (filter?.style) q = q.eq("music_style", filter.style);

  const { data } = await q;
  const rows = (data as Record<string, unknown>[]) ?? [];
  const totals = await reactionTotals(rows.map((r) => String(r.id)));
  return rows.map((r) => toItem(r, totals.get(String(r.id)) ?? 0));
}

export async function getExploreSong(id: string): Promise<ExploreDetail | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("songs").select(SELECT).eq("id", id).maybeSingle();
  if (!data) return null;
  const s = data as unknown as Song;
  // Publiquement écoutable : vitrine curée OU chanson partagée avec les abonnés.
  if (!s.is_showcase && !(s.shared_with_followers && s.status === "ready")) return null;

  const { data: version } = await admin
    .from("song_versions")
    .select("audio_url")
    .eq("song_id", id)
    .eq("is_selected", true)
    .maybeSingle();

  const summary = await reactionSummary(id);

  return {
    ...toItem(data as Record<string, unknown>, summary.total),
    audioUrl: (version as { audio_url: string } | null)?.audio_url ?? null,
    lyrics: s.lyrics,
    timing: s.lyrics_timing,
    mood: s.mood,
    voice: s.voice,
    language: s.language,
    reactionsByEmoji: summary.byEmoji,
    creatorId: s.user_id,
  };
}

export async function bumpCounter(
  songId: string,
  field: "plays_count" | "inspire_count" | "gift_view_count",
): Promise<void> {
  const admin = createAdminClient();
  await admin.rpc("increment_song_counter", { p_song: songId, p_field: field });
}

/** Brief d'inspiration : style / ambiance / voix d'une vitrine ou d'une chanson
 * publique (utilisé par /commander?inspire= et le CTA des pages cadeau). */
export async function getInspiration(id: string): Promise<{
  music_style: string | null;
  mood: string | null;
  voice: string | null;
  language: string | null;
} | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("songs")
    .select("music_style,mood,voice,language,is_showcase,shared_with_followers,is_public,status")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const s = data as unknown as Song;
  const ready = s.status === "ready";
  if (!s.is_showcase && !((s.is_public || s.shared_with_followers) && ready)) return null;
  return {
    music_style: s.music_style,
    mood: s.mood,
    voice: s.voice,
    language: s.language,
  };
}
