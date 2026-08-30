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
  /** Pochette réelle (Suno / import créateur) ; null => tuile dégradée. */
  coverImage: string | null;
  plays: number;
  reactions: number;
  isShowcase: boolean;
  durationSec: number | null;
  creatorName: string | null;
  creatorHandle: string | null;
  /** Média pour le mode immersif (feed). */
  audioUrl: string | null;
  lyrics: string | null;
  timing: LyricsTiming | null;
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
  "id,user_id,is_showcase,shared_with_followers,in_explore,title,showcase_title,showcase_artist,sender_name,recipient_name,occasion,music_style,mood,voice,language,lyrics,lyrics_timing,plays_count,status,is_public,cover_url";

type ItemExtras = {
  reactions?: number;
  durationSec?: number | null;
  creatorName?: string | null;
  creatorHandle?: string | null;
  audioUrl?: string | null;
  /** Timing de la version écoutée (peut différer de song.lyrics_timing). */
  timing?: LyricsTiming | null;
};

function toItem(s: Record<string, unknown>, extras: ItemExtras = {}): ExploreItem {
  const song = s as unknown as Song;
  // Chanson partagée avec des abonnés (pas une vitrine) : on n'expose jamais le
  // prénom réel du destinataire — titre neutre basé sur l'occasion.
  const fallbackTitle = song.is_showcase
    ? "Une chanson Muzikii"
    : song.title || song.occasion || "Chanson";
  return {
    id: song.id,
    title: song.showcase_title || fallbackTitle,
    artist: song.showcase_artist || null,
    occasion: song.occasion,
    style: song.music_style,
    cover: `${env.siteUrl}/api/cover/${song.id}`,
    coverImage: song.cover_url ?? null,
    plays: song.plays_count ?? 0,
    reactions: extras.reactions ?? 0,
    isShowcase: song.is_showcase,
    durationSec: extras.durationSec ?? null,
    creatorName: extras.creatorName ?? null,
    creatorHandle: extras.creatorHandle ?? null,
    audioUrl: extras.audioUrl ?? null,
    lyrics: song.lyrics,
    timing: extras.timing ?? song.lyrics_timing,
  };
}

export async function listExplore(filter?: {
  occasion?: string;
  style?: string;
}): Promise<ExploreItem[]> {
  const admin = createAdminClient();
  // Vitrines curées + toutes les chansons des utilisateurs qui n'ont pas retiré
  // leur chanson de la section Inspiration (in_explore, par défaut vrai).
  let q = admin
    .from("songs")
    .select(SELECT)
    .or("is_showcase.eq.true,and(in_explore.eq.true,status.eq.ready)")
    .order("is_showcase", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(80);

  if (filter?.occasion) q = q.eq("occasion", filter.occasion);
  if (filter?.style) q = q.eq("music_style", filter.style);

  const { data } = await q;
  const rows = (data as Record<string, unknown>[]) ?? [];
  const ids = rows.map((r) => String(r.id));
  const userIds = [...new Set(rows.map((r) => String(r.user_id)))];

  const [totals, versions, profiles] = await Promise.all([
    reactionTotals(ids),
    ids.length
      ? admin
          .from("song_versions")
          .select("song_id, audio_url, duration_sec, is_selected, idx, lyrics_timing")
          .in("song_id", ids)
          .order("idx")
      : Promise.resolve({ data: [] }),
    userIds.length
      ? admin.from("profiles").select("id, full_name, handle").in("id", userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const mediaBySong = new Map<
    string,
    { audio: string | null; dur: number | null; timing: LyricsTiming | null }
  >();
  for (const v of (versions.data as {
    song_id: string;
    audio_url: string | null;
    duration_sec: number | null;
    is_selected: boolean;
    lyrics_timing: LyricsTiming | null;
  }[]) ?? []) {
    if (!mediaBySong.has(v.song_id) || v.is_selected) {
      mediaBySong.set(v.song_id, {
        audio: v.audio_url,
        dur: v.duration_sec,
        timing: v.lyrics_timing,
      });
    }
  }
  const profById = new Map(
    ((profiles.data as { id: string; full_name: string | null; handle: string | null }[]) ?? []).map(
      (p) => [p.id, p],
    ),
  );

  return rows.map((r) => {
    const prof = profById.get(String(r.user_id));
    const media = mediaBySong.get(String(r.id));
    return toItem(r, {
      reactions: totals.get(String(r.id)) ?? 0,
      durationSec: media?.dur ?? null,
      audioUrl: media?.audio ?? null,
      timing: media?.timing ?? null,
      creatorName: prof?.full_name ?? null,
      creatorHandle: prof?.handle ?? null,
    });
  });
}

export async function getExploreSong(id: string): Promise<ExploreDetail | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("songs").select(SELECT).eq("id", id).maybeSingle();
  if (!data) return null;
  const s = data as unknown as Song;
  // Publiquement écoutable : vitrine curée, chanson dans « s'inspirer », ou
  // chanson partagée avec les abonnés — et prête.
  const ready = s.status === "ready";
  if (!s.is_showcase && !((s.in_explore || s.shared_with_followers) && ready)) return null;

  const { data: version } = await admin
    .from("song_versions")
    .select("audio_url, duration_sec, lyrics_timing")
    .eq("song_id", id)
    .eq("is_selected", true)
    .maybeSingle();
  const v = version as {
    audio_url?: string;
    duration_sec?: number | null;
    lyrics_timing?: LyricsTiming | null;
  } | null;

  const [summary, { data: prof }] = await Promise.all([
    reactionSummary(id),
    admin.from("profiles").select("full_name, handle").eq("id", s.user_id).maybeSingle(),
  ]);
  const p = prof as { full_name: string | null; handle: string | null } | null;

  return {
    ...toItem(data as Record<string, unknown>, {
      reactions: summary.total,
      durationSec: v?.duration_sec ?? null,
      timing: v?.lyrics_timing ?? null,
      creatorName: p?.full_name ?? null,
      creatorHandle: p?.handle ?? null,
    }),
    audioUrl: v?.audio_url ?? null,
    lyrics: s.lyrics,
    timing: v?.lyrics_timing ?? s.lyrics_timing,
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
    .select(
      "music_style,mood,voice,language,is_showcase,shared_with_followers,in_explore,is_public,status",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const s = data as unknown as Song;
  const ready = s.status === "ready";
  if (!s.is_showcase && !((s.is_public || s.shared_with_followers || s.in_explore) && ready)) {
    return null;
  }
  return {
    music_style: s.music_style,
    mood: s.mood,
    voice: s.voice,
    language: s.language,
  };
}
