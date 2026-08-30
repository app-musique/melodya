import "server-only";
import { nanoid } from "nanoid";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getMusicProvider, type MusicTrack } from "@/lib/music";
import { generateLyrics } from "@/lib/lyrics";
import { CURRENCY } from "@/lib/pricing";
import { getCreditsPerSong, grantCredits, spendCreditForSong } from "@/lib/credits";
import { notify } from "@/lib/notifications";
import { sendSongReadyEmail } from "@/lib/email";
import { persistAudio, persistImage, storeCoverBuffer } from "@/lib/media";
import { logError } from "@/lib/errors";
import type {
  GiftReaction,
  LyricsTiming,
  Song,
  SongJob,
  SongVersion,
  SongAsset,
} from "@/lib/domain";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("songs")
    .select("*")
    .eq("user_id", user.id) // sinon la policy RLS « vitrines » ferait remonter les showcases
    .order("created_at", { ascending: false });
  return (data as Song[]) ?? [];
}

export type SongListItem = Song & {
  audio_url: string | null;
  duration_sec: number | null;
  /** Timing de la version écoutée (peut différer de song.lyrics_timing si 2 styles). */
  version_timing: LyricsTiming | null;
  version_style: string | null;
};

/** Comme listSongs, mais joint l'audio de la version choisie (pour l'écoute inline). */
export async function listSongsWithAudio(): Promise<SongListItem[]> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("songs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const songs = (data as Song[]) ?? [];

  const readyIds = songs.filter((s) => s.status === "ready").map((s) => s.id);
  type Picked = {
    audio_url: string;
    duration_sec: number | null;
    lyrics_timing: LyricsTiming | null;
    music_style: string | null;
  };
  const audioById = new Map<string, Picked>();
  if (readyIds.length) {
    const { data: versions } = await supabase
      .from("song_versions")
      .select("song_id, audio_url, duration_sec, is_selected, idx, lyrics_timing, music_style")
      .in("song_id", readyIds)
      .order("idx");
    for (const v of (versions as ({
      song_id: string;
      is_selected: boolean;
    } & Picked)[]) ?? []) {
      // 1re version par défaut, remplacée par celle marquée « choisie ».
      if (!audioById.has(v.song_id) || v.is_selected) {
        audioById.set(v.song_id, {
          audio_url: v.audio_url,
          duration_sec: v.duration_sec,
          lyrics_timing: v.lyrics_timing,
          music_style: v.music_style,
        });
      }
    }
  }

  return songs.map((s) => {
    const picked = audioById.get(s.id);
    return {
      ...s,
      audio_url: picked?.audio_url ?? null,
      duration_sec: picked?.duration_sec ?? null,
      version_timing: picked?.lyrics_timing ?? null,
      version_style: picked?.music_style ?? null,
    };
  });
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

/**
 * Pochette de chanson choisie par le créateur : soit une des images générées par
 * Suno (`fromUrl`), soit une image/GIF importé (`upload`). Marque `cover_custom`
 * pour que le pipeline ne l'écrase plus.
 */
export async function setSongCover(
  songId: string,
  input: { fromUrl?: string; upload?: { buffer: Buffer; contentType: string } },
): Promise<{ ok: boolean; error?: string; coverUrl?: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié" };

  const admin = createAdminClient();
  const { data: song } = await admin
    .from("songs")
    .select("id, user_id")
    .eq("id", songId)
    .maybeSingle();
  if (!song || (song as { user_id: string }).user_id !== user.id) {
    return { ok: false, error: "Chanson introuvable" };
  }

  let coverUrl: string | null = null;

  if (input.upload) {
    coverUrl = await storeCoverBuffer(songId, input.upload.buffer, input.upload.contentType);
    if (!coverUrl) return { ok: false, error: "Import impossible" };
  } else if (input.fromUrl) {
    // Sécurité : l'URL doit être une des pochettes de version de CETTE chanson.
    const { data: versions } = await admin
      .from("song_versions")
      .select("image_url")
      .eq("song_id", songId);
    const allowed = ((versions as { image_url: string | null }[]) ?? [])
      .map((v) => v.image_url)
      .filter(Boolean);
    if (!allowed.includes(input.fromUrl)) return { ok: false, error: "Pochette inconnue" };
    coverUrl = await persistImage(songId, input.fromUrl, `cover-picked`);
  } else {
    return { ok: false, error: "Aucune image fournie" };
  }

  await admin
    .from("songs")
    .update({ cover_url: coverUrl, cover_custom: true })
    .eq("id", songId);
  return { ok: true, coverUrl: coverUrl ?? undefined };
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
    const title =
      song.title?.trim() ||
      (song.recipient_name?.trim()
        ? `${song.recipient_name.trim()} — ${song.occasion ?? "chanson"}`
        : song.occasion?.trim()) ||
      "Ma chanson Muzikii";

    // 1 job = 2 versions du même style. Si l'utilisateur a choisi un style
    // différent pour la version 2 → 2 jobs (un par style), 1 piste de chacun.
    const styleA = (song.music_style ?? "Afrobeat").trim() || "Afrobeat";
    const styleB = (song.music_style_b ?? "").trim();
    const specs =
      styleB && styleB.toLowerCase() !== styleA.toLowerCase()
        ? [
            { slot: 1, style: styleA },
            { slot: 2, style: styleB },
          ]
        : [{ slot: 1, style: styleA }];

    // Repart de zéro (relance éventuelle).
    await admin.from("song_jobs").delete().eq("song_id", songId);

    const createdJobIds: string[] = [];
    for (const spec of specs) {
      try {
        const { jobId } = await provider.createSong({
          songId,
          title,
          lyrics,
          style: spec.style,
          voice: song.voice ?? "femme",
          mood: song.mood ?? "Émouvante",
          language: song.language,
        });
        await admin.from("song_jobs").insert({
          song_id: songId,
          slot: spec.slot,
          provider: provider.name,
          provider_job_id: jobId,
          style: spec.style,
          status: "pending",
        });
        createdJobIds.push(jobId);
      } catch (jobErr) {
        // Le job 1 est indispensable → on remonte l'erreur (remboursement).
        // Le job 2 en échec : on continue, la chanson aura une seule version.
        if (spec.slot === 1) throw jobErr;
        await logError("startGeneration.jobB", jobErr, { songId, style: spec.style });
      }
    }

    await admin
      .from("songs")
      .update({ provider: provider.name, provider_job_id: createdJobIds[0] })
      .eq("id", songId);
  } catch (err) {
    // Échec avant même la création du job : on rembourse le crédit Muzikii
    // (le fournisseur n'a rien produit) et on renvoie la chanson en brouillon.
    await logError("startGeneration", err, { songId });
    await grantCredits(song.user_id, song.credits_cost || 1, "refund");
    await admin
      .from("songs")
      .update({ status: "draft", error: (err as Error).message, generation_started_at: null })
      .eq("id", songId);
    await notify(song.user_id, {
      type: "song_failed",
      title: "La création n'a pas pu démarrer",
      body: "Ton crédit t'a été rendu. Réessaie depuis le wizard.",
      link: "/mes-chansons",
    });
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
      await logError("advanceGeneration.timeout", new Error("Délai de génération dépassé"), {
        songId,
        provider_job_id: song.provider_job_id,
      });
      const { data: failed } = await admin
        .from("songs")
        .update({ status: "failed", error: "Délai de génération dépassé" })
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
  }

  const provider = getMusicProvider();

  const { data: jobsData } = await admin
    .from("song_jobs")
    .select("*")
    .eq("song_id", songId)
    .order("slot");
  const jobs = (jobsData as SongJob[]) ?? [];

  // ---- Chemin historique : chansons lancées avant la migration 0018 ----
  if (jobs.length === 0) {
    const result = await provider.getResult(song.provider_job_id);
    if (result.status === "pending") return song;
    if (result.status === "failed") {
      return failGeneration(admin, song, result.error);
    }
    return finalizeReady(
      admin,
      songId,
      result.tracks.slice(0, 4).map((t) => ({
        url: t.url,
        durationSec: t.durationSec,
        providerAudioId: t.providerAudioId ?? null,
        imageUrl: t.imageUrl ?? null,
        providerJobId: song.provider_job_id,
        style: song.music_style,
      })),
    );
  }

  // ---- Chemin multi-jobs : 1 job = 2 pistes même style ; 2 jobs = 1 piste chacun ----
  const results = new Map<string, MusicTrack[]>();
  for (const job of jobs) {
    if (!job.provider_job_id || job.status === "failed") continue;
    const r = await provider.getResult(job.provider_job_id);
    if (r.status === "pending") continue;
    if (r.status === "failed" || r.tracks.length === 0) {
      job.status = "failed";
      await admin
        .from("song_jobs")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("id", job.id);
      await logError(
        "advanceGeneration.jobFailed",
        new Error(r.status === "failed" ? r.error : "aucune piste"),
        { songId, slot: job.slot },
      );
      continue;
    }
    const wasReady = job.status === "ready";
    job.status = "ready";
    results.set(job.id, r.tracks);
    if (!wasReady) {
      await admin
        .from("song_jobs")
        .update({ status: "ready", completed_at: new Date().toISOString() })
        .eq("id", job.id);
    }
  }

  if (jobs.some((j) => j.status === "pending")) return song; // pas tous finis

  const readyJobs = jobs.filter((j) => j.status === "ready" && results.has(j.id));
  if (readyJobs.length === 0) {
    return failGeneration(admin, song, "Aucune version n'a pu être générée");
  }

  // 1 seul job → on garde ses 2 pistes (même style). Sinon 1 piste par job.
  const perJob = readyJobs.length === 1 ? 2 : 1;
  const tracks: FinalizeTrack[] = [];
  for (const job of readyJobs) {
    for (const t of (results.get(job.id) ?? []).slice(0, perJob)) {
      tracks.push({
        url: t.url,
        durationSec: t.durationSec,
        providerAudioId: t.providerAudioId ?? null,
        imageUrl: t.imageUrl ?? null,
        providerJobId: job.provider_job_id,
        style: job.style,
      });
    }
  }

  return finalizeReady(admin, songId, tracks.slice(0, 4));
}

type FinalizeTrack = {
  url: string;
  durationSec: number | null;
  providerAudioId: string | null;
  imageUrl: string | null;
  providerJobId: string | null;
  style: string | null;
};

/** Marque une génération en échec + notifie. */
async function failGeneration(
  admin: ReturnType<typeof createAdminClient>,
  song: Song,
  error: string,
): Promise<Song> {
  await logError("advanceGeneration.failed", new Error(error), {
    songId: song.id,
    provider_job_id: song.provider_job_id,
  });
  const { data: failed } = await admin
    .from("songs")
    .update({ status: "failed", error })
    .eq("id", song.id)
    .select("*")
    .single();
  await notify(song.user_id, {
    type: "song_failed",
    title: "La création de ta chanson a échoué",
    body: "Ouvre la chanson pour la relancer — aucun crédit n'est reperdu.",
    link: `/mes-chansons/${song.id}`,
    dedupeKey: `song_failed:${song.id}`,
  });
  return failed as Song;
}

/**
 * Passe la chanson « prête » : réclame la transition atomiquement, insère les
 * versions (URLs fournisseur brutes, ré-hébergées ensuite par syncSongAssets),
 * pochette, lien de partage, notif + email.
 */
async function finalizeReady(
  admin: ReturnType<typeof createAdminClient>,
  songId: string,
  tracks: FinalizeTrack[],
): Promise<Song> {
  const { data: claimed } = await admin
    .from("songs")
    .update({ status: "ready" })
    .eq("id", songId)
    .eq("status", "generating")
    .select("*")
    .maybeSingle();

  if (!claimed) {
    const { data: current } = await admin.from("songs").select("*").eq("id", songId).single();
    return current as Song;
  }

  await admin.from("song_versions").delete().eq("song_id", songId);
  await admin.from("song_versions").insert(
    tracks.map((t, i) => ({
      song_id: songId,
      idx: i + 1,
      audio_url: t.url,
      duration_sec: t.durationSec,
      is_selected: i === 0,
      provider_audio_id: t.providerAudioId,
      provider_job_id: t.providerJobId,
      music_style: t.style,
      image_url: t.imageUrl,
      persisted_at: null,
    })),
  );

  await admin.from("song_assets").delete().eq("song_id", songId).eq("type", "cover");
  await admin.from("song_assets").insert({
    song_id: songId,
    type: "cover",
    url: `${env.siteUrl}/api/cover/${songId}`,
  });

  const ready = claimed as Song;
  const shareUpdate: Record<string, unknown> = { assets_synced_at: null };
  if (!ready.cover_custom && tracks[0]?.imageUrl) {
    shareUpdate.cover_url = tracks[0].imageUrl;
  }
  if (!ready.is_showcase) {
    shareUpdate.is_public = true;
    shareUpdate.gift_slug = ready.gift_slug ?? nanoid(12).toLowerCase();
  }
  await admin.from("songs").update(shareUpdate).eq("id", songId);

  const songLabel = ready.title || ready.recipient_name || "Ta chanson";
  const createdNotif = await notify(ready.user_id, {
    type: "song_ready",
    title: "Ta chanson est prête 🎉",
    body: `${songLabel} — écoute les versions et choisis ta préférée.`,
    link: `/mes-chansons/${songId}`,
    dedupeKey: `song_ready:${songId}`,
  });
  if (createdNotif) {
    await sendSongReadyEmail(ready.user_id, {
      recipientName: ready.recipient_name ?? "",
      title: ready.title ?? undefined,
      songId,
    }).catch(() => {});
  }

  return claimed as Song;
}

const onOurStorage = (url: string) =>
  url.startsWith(env.siteUrl) || url.includes("/storage/v1/object/");

/**
 * Ré-héberge les audios (URL fournisseur → Supabase Storage) et récupère les
 * timings de paroles. Idempotent, « draine » ce qui reste. Appelé en tâche de
 * fond : after() du polling, webhook Suno, cron, chargement de /mes-chansons.
 */
export async function syncSongAssets(songId: string): Promise<void> {
  const admin = createAdminClient();
  try {
    const { data } = await admin.from("songs").select("*").eq("id", songId).maybeSingle();
    if (!data) return;
    const song = data as Song;
    if (song.status !== "ready" || song.assets_synced_at) return;

    const { data: vData } = await admin
      .from("song_versions")
      .select("*")
      .eq("song_id", songId)
      .order("idx");
    const versions = (vData as SongVersion[]) ?? [];
    if (!versions.length) return;

    // 1. ré-héberge chaque version pas encore persistée
    for (const v of versions) {
      if (v.persisted_at) continue;
      const newUrl = await persistAudio(songId, v.idx, v.audio_url);
      if (onOurStorage(newUrl)) {
        await admin
          .from("song_versions")
          .update({ audio_url: newUrl, persisted_at: new Date().toISOString() })
          .eq("id", v.id);
      } else if (newUrl !== v.audio_url) {
        await admin.from("song_versions").update({ audio_url: newUrl }).eq("id", v.id);
      }
    }

    const { data: after2 } = await admin
      .from("song_versions")
      .select("*")
      .eq("song_id", songId)
      .order("idx");
    const persisted = (after2 as SongVersion[]) ?? versions;
    const allPersisted = persisted.every((r) => r.persisted_at);

    // 1b. ré-héberge la pochette générée par Suno (sauf si le créateur a choisi la sienne)
    if (!song.cover_custom && song.cover_url && !onOurStorage(song.cover_url)) {
      const newCover = await persistImage(songId, song.cover_url);
      if (onOurStorage(newCover)) {
        await admin.from("songs").update({ cover_url: newCover }).eq("id", songId);
      }
    }

    // 2. timings de paroles réels, PAR version (les 2 versions peuvent avoir des
    //    arrangements différents), quand l'audio est finalisé — best-effort.
    const provider = getMusicProvider();
    if (allPersisted && provider.getLineTimings && song.lyrics) {
      for (const v of persisted) {
        if (v.lyrics_timing) continue;
        const jobId = v.provider_job_id ?? song.provider_job_id;
        if (!jobId || !v.provider_audio_id) continue;
        try {
          const timings = await provider.getLineTimings(jobId, v.provider_audio_id, song.lyrics);
          if (timings && timings.length) {
            await admin.from("song_versions").update({ lyrics_timing: timings }).eq("id", v.id);
            v.lyrics_timing = timings;
            // Compat : song.lyrics_timing = celui de la version 1.
            if (v.idx === 1 && !song.lyrics_timing) {
              await admin.from("songs").update({ lyrics_timing: timings }).eq("id", songId);
            }
          }
        } catch (e) {
          await logError("getLineTimings", e, { songId, versionId: v.id });
        }
      }
    }
    const hasTimings = persisted.every((v) => v.lyrics_timing) || !!song.lyrics_timing;

    // 3. terminé — quand tout est ré-hébergé et (timings OK ou fournisseur muet ou trop vieux).
    // Garde-fou : au-delà de 15 min on clôt quand même (l'audio reste jouable sur
    // l'URL fournisseur ~15 j ; chaque échec a été journalisé).
    const ageMin = (Date.now() - new Date(song.created_at).getTime()) / 60000;
    const timingSettled = hasTimings || !provider.getLineTimings || ageMin > 8;
    if ((allPersisted && timingSettled) || ageMin > 15) {
      await admin
        .from("songs")
        .update({ assets_synced_at: new Date().toISOString() })
        .eq("id", songId);
    }
  } catch (err) {
    await logError("syncSongAssets", err, { songId });
  }
}

/** Lecture publique pour la page cadeau (bypass RLS, filtré). */
export async function getPublicGift(slug: string): Promise<{
  song: Song;
  version: SongVersion | null;
  cover: string | null;
  reactions: GiftReaction[];
  ownerReferralCode: string | null;
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
  const [{ data: version }, { data: cover }, { data: reactions }, { data: owner }] =
    await Promise.all([
      admin
        .from("song_versions")
        .select("*")
        .eq("song_id", s.id)
        .eq("is_selected", true)
        .maybeSingle(),
      admin
        .from("song_assets")
        .select("url")
        .eq("song_id", s.id)
        .eq("type", "cover")
        .maybeSingle(),
      admin
        .from("gift_reactions")
        .select("*")
        .eq("song_id", s.id)
        .order("created_at", { ascending: false })
        .limit(100),
      admin.from("profiles").select("referral_code").eq("id", s.user_id).maybeSingle(),
    ]);

  return {
    song: s,
    version: (version as SongVersion) ?? null,
    cover: (cover as { url: string } | null)?.url ?? null,
    reactions: (reactions as GiftReaction[]) ?? [],
    ownerReferralCode:
      (owner as { referral_code: string | null } | null)?.referral_code ?? null,
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
