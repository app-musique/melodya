import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { MAX_CLIP_PHOTOS, type LyricsTiming, type Song, type SongPhoto, type SongVersion } from "@/lib/domain";

const BUCKET = "renders";

export type ClipData = {
  song: Song;
  audioUrl: string | null;
  timing: LyricsTiming | null;
  cover: string;
  photos: string[];
  dedication: string | null;
  ownerReferralCode: string | null;
};

/** Données publiques du clip — page `/cadeau/[slug]/clip`. */
export async function getPublicClip(slug: string): Promise<ClipData | null> {
  const admin = createAdminClient();
  const { data: song } = await admin
    .from("songs")
    .select("*")
    .eq("gift_slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (!song) return null;
  const s = song as Song;

  const [{ data: version }, { data: photos }, { data: owner }] = await Promise.all([
    admin
      .from("song_versions")
      .select("*")
      .eq("song_id", s.id)
      .eq("is_selected", true)
      .maybeSingle(),
    admin
      .from("song_photos")
      .select("*")
      .eq("song_id", s.id)
      .order("sort_order")
      .order("created_at"),
    admin.from("profiles").select("referral_code").eq("id", s.user_id).maybeSingle(),
  ]);

  return {
    song: s,
    audioUrl: (version as SongVersion | null)?.audio_url ?? null,
    timing: s.lyrics_timing,
    cover: `${env.siteUrl}/api/cover/${s.id}`,
    photos: ((photos as SongPhoto[]) ?? []).map((p) => p.url),
    dedication: s.clip_dedication,
    ownerReferralCode:
      (owner as { referral_code: string | null } | null)?.referral_code ?? null,
  };
}

export type ClipEditor = {
  song: Song;
  version: SongVersion | null;
  photos: SongPhoto[];
  slug: string | null;
};

/** Données d'édition — propriétaire uniquement (RLS). */
export async function getClipEditor(songId: string): Promise<ClipEditor | null> {
  const supabase = await createServerClient();
  const { data: song } = await supabase
    .from("songs")
    .select("*")
    .eq("id", songId)
    .maybeSingle();
  if (!song) return null;
  const s = song as Song;

  const [{ data: version }, { data: photos }] = await Promise.all([
    supabase
      .from("song_versions")
      .select("*")
      .eq("song_id", songId)
      .eq("is_selected", true)
      .maybeSingle(),
    supabase
      .from("song_photos")
      .select("*")
      .eq("song_id", songId)
      .order("sort_order")
      .order("created_at"),
  ]);

  return {
    song: s,
    version: (version as SongVersion) ?? null,
    photos: (photos as SongPhoto[]) ?? [],
    slug: s.gift_slug,
  };
}

/** Vérifie la propriété d'une chanson (service role). */
export async function ownsSong(userId: string, songId: string): Promise<Song | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("songs")
    .select("*")
    .eq("id", songId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as Song) ?? null;
}

export async function addPhoto(
  songId: string,
  bytes: Buffer,
  contentType: string,
): Promise<SongPhoto | { error: string }> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("song_photos")
    .select("id", { count: "exact", head: true })
    .eq("song_id", songId);
  if ((count ?? 0) >= MAX_CLIP_PHOTOS) {
    return { error: `Maximum ${MAX_CLIP_PHOTOS} photos.` };
  }

  const ext = contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
      ? "webp"
      : "jpg";
  const path = `${songId}/photos/${randomUUID()}.${ext}`;

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (upErr) return { error: upErr.message };

  const url = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { data, error } = await admin
    .from("song_photos")
    .insert({ song_id: songId, url, sort_order: count ?? 0 })
    .select("*")
    .single();
  if (error) return { error: error.message };
  return data as SongPhoto;
}

export async function deletePhoto(songId: string, photoId: string): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("song_photos")
    .select("url")
    .eq("id", photoId)
    .eq("song_id", songId)
    .maybeSingle();

  await admin.from("song_photos").delete().eq("id", photoId).eq("song_id", songId);

  const url = (data as { url: string } | null)?.url;
  const m = url?.match(/\/object\/public\/renders\/(.+)$/);
  if (m) await admin.storage.from(BUCKET).remove([m[1]]).catch(() => {});
}

export async function setDedication(songId: string, text: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("songs")
    .update({ clip_dedication: text.trim() || null })
    .eq("id", songId);
}
