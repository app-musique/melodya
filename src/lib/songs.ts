import "server-only";
import { nanoid } from "nanoid";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getMusicProvider } from "@/lib/music";
import { generateLyrics } from "@/lib/lyrics";
import { CURRENCY } from "@/lib/pricing";
import { getCreditsPerSong, spendCreditForSong } from "@/lib/credits";
import { notify } from "@/lib/notifications";
import type { GiftReaction, Song, SongVersion, SongAsset } from "@/lib/domain";
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
  reactions: GiftReaction[];
} | null> {
  const supabase = await createServerClient();
  const { data: song } = await supabase.from("songs").select("*").eq("id", id).maybeSingle();
  if (!song) return null;
  const [{ data: versions }, { data: assets }, { data: reactions }] = await Promise.all([
    supabase.from("song_versions").select("*").eq("song_id", id).order("idx"),
    supabase.from("song_assets").select("*").eq("song_id", id),
    supabase
      .from("gift_reactions")
      .select("*")
      .eq("song_id", id)
      .order("created_at", { ascending: false }),
  ]);
  return {
    song: song as Song,
    versions: (versions as SongVersion[]) ?? [],
    assets: (assets as SongAsset[]) ?? [],
    reactions: (reactions as GiftReaction[]) ?? [],
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
    .eq("status", "draft")
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
// Lancement d'une chanson : débite 1 crédit puis génère
// ------------------------------------------------------------------

export type CreateResult =
  | { ok: true }
  | { ok: false; reason: "insufficient" | "not_ready" | "error"; message?: string };

export async function createSongFromCredits(songId: string): Promise<CreateResult> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "error", message: "Non authentifié" };

  const { data: song } = await supabase.from("songs").select("*").eq("id", songId).maybeSingle();
  if (!song) return { ok: false, reason: "error", message: "Chanson introuvable" };
  const s = song as Song;

  if (s.status !== "draft") return { ok: true }; // déjà lancée
  if (!s.lyrics_approved) return { ok: false, reason: "not_ready" };

  const cost = await getCreditsPerSong();
  const admin = createAdminClient();

  // Réserve la chanson (atomique) avant de dépenser, pour éviter le double débit.
  const { data: claimed } = await admin
    .from("songs")
    .update({ status: "paid", credits_cost: cost })
    .eq("id", songId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (!claimed) return { ok: true };

  const spend = await spendCreditForSong(user.id, songId, cost);
  if (!spend.ok) {
    // Remet en brouillon : l'utilisateur pourra acheter des crédits et réessayer.
    await admin.from("songs").update({ status: "draft" }).eq("id", songId).eq("status", "paid");
    return {
      ok: false,
      reason: spend.reason === "insufficient" ? "insufficient" : "error",
      message: spend.message,
    };
  }

  await startGeneration(songId);
  return { ok: true };
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
    await notify(song.user_id, {
      type: "song_failed",
      title: "La création de ta chanson a échoué",
      body: "Ouvre la chanson pour la relancer — aucun crédit n'est reperdu.",
      link: `/mes-chansons/${songId}`,
      dedupeKey: `song_failed:${songId}`,
    });
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

  await notify((claimed as Song).user_id, {
    type: "song_ready",
    title: "Ta chanson est prête 🎉",
    body: `${(claimed as Song).recipient_name ?? "Ta chanson"} — écoute les 3 versions et choisis ta préférée.`,
    link: `/mes-chansons/${songId}`,
    dedupeKey: `song_ready:${songId}`,
  });

  return claimed as Song;
}

/** Lecture publique pour la page cadeau (bypass RLS, filtré). */
export async function getPublicGift(slug: string): Promise<{
  song: Song;
  version: SongVersion | null;
  cover: string | null;
  reactions: GiftReaction[];
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
  const [{ data: version }, { data: cover }, { data: reactions }] = await Promise.all([
    admin
      .from("song_versions")
      .select("*")
      .eq("song_id", s.id)
      .eq("is_selected", true)
      .maybeSingle(),
    admin.from("song_assets").select("url").eq("song_id", s.id).eq("type", "cover").maybeSingle(),
    admin
      .from("gift_reactions")
      .select("*")
      .eq("song_id", s.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return {
    song: s,
    version: (version as SongVersion) ?? null,
    cover: (cover as { url: string } | null)?.url ?? null,
    reactions: (reactions as GiftReaction[]) ?? [],
  };
}

/** Enregistre une ouverture de la page cadeau + notifie le propriétaire (throttle appelant). */
export async function registerGiftView(songId: string, ownerId: string, recipient: string | null) {
  const admin = createAdminClient();
  await admin.rpc("increment_song_counter", { p_song: songId, p_field: "gift_view_count" });
  const day = new Date().toISOString().slice(0, 10);
  await notify(ownerId, {
    type: "gift_viewed",
    title: `${recipient ?? "Quelqu'un"} a ouvert ton cadeau`,
    body: "Ta page cadeau vient d'être consultée.",
    link: `/mes-chansons/${songId}`,
    dedupeKey: `gift_viewed:${songId}:${day}`,
  });
}
