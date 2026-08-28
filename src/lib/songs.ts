import "server-only";
import { nanoid } from "nanoid";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getMusicProvider } from "@/lib/music";
import { generateLyrics } from "@/lib/lyrics";
import { computeTotal, CURRENCY } from "@/lib/pricing";
import type { Song, SongVersion, SongAsset } from "@/lib/domain";
import { env } from "@/lib/env";

// ------------------------------------------------------------------
// Actions utilisateur (RLS active — client serveur avec session)
// ------------------------------------------------------------------

export async function createDraft(): Promise<Song> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Réutilise un brouillon existant plutôt que d'en empiler.
  const { data: existing } = await supabase
    .from("songs")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing as Song;

  const { data, error } = await supabase
    .from("songs")
    .insert({ user_id: user.id, currency: CURRENCY })
    .select("*")
    .single();
  if (error) throw error;
  return data as Song;
}

export async function getOwnedSong(id: string): Promise<Song | null> {
  const supabase = await createServerClient();
  const { data } = await supabase.from("songs").select("*").eq("id", id).maybeSingle();
  return (data as Song) ?? null;
}

export async function listSongs(): Promise<Song[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("songs")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as Song[]) ?? [];
}

export async function getSongBundle(id: string): Promise<{
  song: Song;
  versions: SongVersion[];
  assets: SongAsset[];
} | null> {
  const supabase = await createServerClient();
  const { data: song } = await supabase.from("songs").select("*").eq("id", id).maybeSingle();
  if (!song) return null;
  const [{ data: versions }, { data: assets }] = await Promise.all([
    supabase.from("song_versions").select("*").eq("song_id", id).order("idx"),
    supabase.from("song_assets").select("*").eq("song_id", id),
  ]);
  return {
    song: song as Song,
    versions: (versions as SongVersion[]) ?? [],
    assets: (assets as SongAsset[]) ?? [],
  };
}

export async function updateDraft(
  id: string,
  patch: Record<string, unknown>,
): Promise<Song> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("songs")
    .update(patch)
    .eq("id", id)
    .in("status", ["draft", "pending_payment"])
    .select("*")
    .single();
  if (error) throw error;
  return data as Song;
}

export async function selectVersion(songId: string, versionId: string): Promise<void> {
  const supabase = await createServerClient();
  // Ownership vérifiée par RLS sur songs ; on met à jour via une jointure implicite.
  const { data: song } = await supabase
    .from("songs")
    .select("id")
    .eq("id", songId)
    .maybeSingle();
  if (!song) throw new Error("Chanson introuvable");

  const admin = createAdminClient();
  await admin.from("song_versions").update({ is_selected: false }).eq("song_id", songId);
  const { error } = await admin
    .from("song_versions")
    .update({ is_selected: true })
    .eq("id", versionId)
    .eq("song_id", songId);
  if (error) throw error;
}

export async function setShare(songId: string, isPublic: boolean): Promise<string | null> {
  const supabase = await createServerClient();
  const { data: song } = await supabase
    .from("songs")
    .select("id, gift_slug")
    .eq("id", songId)
    .maybeSingle();
  if (!song) throw new Error("Chanson introuvable");

  const slug = (song as { gift_slug: string | null }).gift_slug ?? nanoid(12).toLowerCase();
  const { error } = await supabase
    .from("songs")
    .update({ is_public: isPublic, gift_slug: slug })
    .eq("id", songId);
  if (error) throw error;
  return isPublic ? slug : null;
}

// ------------------------------------------------------------------
// Orchestration (service role — appelé par webhook / polling)
// ------------------------------------------------------------------

export async function markPaid(songId: string): Promise<void> {
  const admin = createAdminClient();
  // Transition atomique pending_payment|draft -> paid (idempotent si déjà avancé).
  const { data: claimed } = await admin
    .from("songs")
    .update({ status: "paid" })
    .eq("id", songId)
    .in("status", ["draft", "pending_payment"])
    .select("id")
    .maybeSingle();
  if (!claimed) return; // déjà payée / en génération / prête
  await startGeneration(songId);
}

export async function startGeneration(songId: string): Promise<void> {
  const admin = createAdminClient();

  // Réclame la génération de façon atomique : paid|failed -> generating.
  const { data: claimed } = await admin
    .from("songs")
    .update({ status: "generating", error: null, generation_started_at: new Date().toISOString() })
    .eq("id", songId)
    .in("status", ["paid", "failed"])
    .select("*")
    .maybeSingle();
  if (!claimed) return;
  const song = claimed as Song;

  try {
    let lyrics = song.lyrics?.trim();
    if (!lyrics) {
      const generated = await generateLyrics(song);
      lyrics = generated.lyrics;
      await admin.from("songs").update({ lyrics }).eq("id", songId);
    }

    const provider = getMusicProvider();
    const { jobId } = await provider.createSong({
      songId,
      title: `${song.recipient_name ?? "Melodya"} — ${song.occasion ?? "chanson"}`,
      lyrics,
      style: song.music_style ?? "Afrobeat",
      voice: song.voice ?? "femme",
      mood: song.mood ?? "Émouvante",
      language: song.language,
    });
    await admin
      .from("songs")
      .update({ provider: provider.name, provider_job_id: jobId })
      .eq("id", songId);
  } catch (err) {
    await admin
      .from("songs")
      .update({ status: "failed", error: (err as Error).message })
      .eq("id", songId);
  }
}

export async function advanceGeneration(songId: string): Promise<Song> {
  const admin = createAdminClient();
  const { data } = await admin.from("songs").select("*").eq("id", songId).maybeSingle();
  if (!data) throw new Error("Chanson introuvable");
  const song = data as Song;

  if (song.status !== "generating" || !song.provider_job_id) return song;

  // Garde-fou : au-delà de 10 min, on considère l'échec.
  if (song.generation_started_at) {
    const elapsed = Date.now() - new Date(song.generation_started_at).getTime();
    if (elapsed > 10 * 60 * 1000) {
      const { data: failed } = await admin
        .from("songs")
        .update({ status: "failed", error: "Délai de génération dépassé" })
        .eq("id", songId)
        .select("*")
        .single();
      return failed as Song;
    }
  }

  const provider = getMusicProvider();
  const result = await provider.getResult(song.provider_job_id);

  if (result.status === "pending") return song;

  if (result.status === "failed") {
    const { data: failed } = await admin
      .from("songs")
      .update({ status: "failed", error: result.error })
      .eq("id", songId)
      .select("*")
      .single();
    return failed as Song;
  }

  // ready — on « réclame » la transition de façon atomique pour éviter les
  // insertions en double si deux polls arrivent en même temps.
  const { data: claimed } = await admin
    .from("songs")
    .update({ status: "ready" })
    .eq("id", songId)
    .eq("status", "generating")
    .select("*")
    .maybeSingle();

  if (!claimed) {
    // Un autre poll a déjà fini le travail.
    const { data: current } = await admin.from("songs").select("*").eq("id", songId).single();
    return current as Song;
  }

  const tracks = result.tracks.slice(0, 3);
  await admin.from("song_versions").delete().eq("song_id", songId);
  await admin.from("song_versions").insert(
    tracks.map((t, i) => ({
      song_id: songId,
      idx: i + 1,
      audio_url: t.url,
      duration_sec: t.durationSec,
      is_selected: i === 0,
    })),
  );

  await admin.from("song_assets").delete().eq("song_id", songId).eq("type", "cover");
  await admin.from("song_assets").insert({
    song_id: songId,
    type: "cover",
    url: `${env.siteUrl}/api/cover/${songId}`,
  });

  return claimed as Song;
}

export function recomputePrice(song: Pick<Song, "addons">): number {
  return computeTotal(song.addons ?? []);
}

/** Lecture publique pour la page cadeau (bypass RLS, filtré). */
export async function getPublicGift(slug: string): Promise<{
  song: Song;
  version: SongVersion | null;
  cover: string | null;
} | null> {
  const admin = createAdminClient();
  const { data: song } = await admin
    .from("songs")
    .select("*")
    .eq("gift_slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (!song) return null;

  const s = song as Song;
  const [{ data: version }, { data: cover }] = await Promise.all([
    admin
      .from("song_versions")
      .select("*")
      .eq("song_id", s.id)
      .eq("is_selected", true)
      .maybeSingle(),
    admin.from("song_assets").select("url").eq("song_id", s.id).eq("type", "cover").maybeSingle(),
  ]);

  return {
    song: s,
    version: (version as SongVersion) ?? null,
    cover: (cover as { url: string } | null)?.url ?? null,
  };
}
