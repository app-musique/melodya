import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notifications";
import { sendCreatorNewSongEmail } from "@/lib/email";
import { reactionTotals } from "@/lib/reactions";
import { env } from "@/lib/env";
import type { Song } from "@/lib/domain";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type CreatorMini = {
  id: string;
  handle: string;
  name: string;
  followerCount: number;
};

export type CreatorPublicSong = {
  id: string;
  title: string;
  occasion: string | null;
  style: string | null;
  cover: string;
  reactions: number;
  createdAt: string;
};

export type CreatorProfile = CreatorMini & {
  songCount: number;
  songs: CreatorPublicSong[];
};

function songTitle(s: Pick<Song, "showcase_title" | "occasion">): string {
  return s.showcase_title || s.occasion || "Chanson";
}

export async function creatorIdByHandle(handle: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("handle", handle)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function followerCount(creatorId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", creatorId);
  return count ?? 0;
}

/** Infos créateur pour la page /inspiration (bloc « s'abonner »). */
export async function getCreatorMini(creatorId: string): Promise<CreatorMini | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, handle, full_name")
    .eq("id", creatorId)
    .maybeSingle();
  if (!data) return null;
  const p = data as { id: string; handle: string | null; full_name: string | null };
  if (!p.handle) return null;
  return {
    id: p.id,
    handle: p.handle,
    name: p.full_name || "Créateur Muzikii",
    followerCount: await followerCount(p.id),
  };
}

/** Profil public complet + chansons partagées avec les abonnés. */
export async function getCreatorByHandle(handle: string): Promise<CreatorProfile | null> {
  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("profiles")
    .select("id, handle, full_name")
    .eq("handle", handle)
    .maybeSingle();
  if (!prof) return null;
  const p = prof as { id: string; handle: string; full_name: string | null };

  // Chansons du créateur visibles publiquement : partagées avec les abonnés,
  // ou vitrines (une vitrine est déjà « rendue visible » par son créateur).
  const { data: rows } = await admin
    .from("songs")
    .select("id, showcase_title, occasion, music_style, created_at")
    .eq("user_id", p.id)
    .eq("status", "ready")
    .or("shared_with_followers.eq.true,is_showcase.eq.true")
    .order("created_at", { ascending: false })
    .limit(60);

  const songs = (rows as Pick<Song, "id" | "showcase_title" | "occasion" | "music_style" | "created_at">[]) ?? [];
  const totals = await reactionTotals(songs.map((s) => s.id));

  return {
    id: p.id,
    handle: p.handle,
    name: p.full_name || "Créateur Muzikii",
    followerCount: await followerCount(p.id),
    songCount: songs.length,
    songs: songs.map((s) => ({
      id: s.id,
      title: songTitle(s),
      occasion: s.occasion,
      style: s.music_style,
      cover: `${env.siteUrl}/api/cover/${s.id}`,
      reactions: totals.get(s.id) ?? 0,
      createdAt: s.created_at,
    })),
  };
}

export async function isUserFollowing(creatorId: string, userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", creatorId)
    .eq("follower_user_id", userId);
  return (count ?? 0) > 0;
}

/** Doublon d'abonnement (index unique partiel → géré à l'insert, pas en on_conflict). */
const isDuplicate = (msg: string) => /duplicate key|already exists|unique/i.test(msg);

export async function followAsUser(
  creatorId: string,
  userId: string,
): Promise<{ ok: boolean; error?: string; followerCount: number }> {
  if (creatorId === userId) return { ok: false, error: "Tu ne peux pas t'abonner à toi-même", followerCount: 0 };
  const admin = createAdminClient();
  const { error } = await admin.from("follows").insert({ creator_id: creatorId, follower_user_id: userId });
  if (error && !isDuplicate(error.message)) {
    return { ok: false, error: error.message, followerCount: await followerCount(creatorId) };
  }
  return { ok: true, followerCount: await followerCount(creatorId) };
}

export async function unfollowAsUser(
  creatorId: string,
  userId: string,
): Promise<{ ok: boolean; followerCount: number }> {
  const admin = createAdminClient();
  await admin.from("follows").delete().eq("creator_id", creatorId).eq("follower_user_id", userId);
  return { ok: true, followerCount: await followerCount(creatorId) };
}

export async function followAsEmail(
  creatorId: string,
  emailRaw: string,
): Promise<{ ok: boolean; error?: string; followerCount: number }> {
  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return { ok: false, error: "Email invalide", followerCount: 0 };
  }
  const admin = createAdminClient();
  const { data: creator } = await admin.from("profiles").select("id").eq("id", creatorId).maybeSingle();
  if (!creator) return { ok: false, error: "Créateur introuvable", followerCount: 0 };

  const { error } = await admin.from("follows").insert({ creator_id: creatorId, follower_email: email });
  if (error && !isDuplicate(error.message)) {
    return { ok: false, error: error.message, followerCount: await followerCount(creatorId) };
  }
  return { ok: true, followerCount: await followerCount(creatorId) };
}

/** Désabonnement via le lien des emails. Renvoie le nom du créateur si trouvé. */
export async function unsubscribeByToken(token: string): Promise<{ ok: boolean; creatorName?: string }> {
  if (!/^[a-f0-9]{16,64}$/.test(token)) return { ok: false };
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("follows")
    .select("id, creator_id")
    .eq("unsubscribe_token", token)
    .maybeSingle();
  if (!row) return { ok: true }; // idempotent : déjà désabonné
  const r = row as { id: string; creator_id: string };
  const { data: prof } = await admin.from("profiles").select("full_name").eq("id", r.creator_id).maybeSingle();
  await admin.from("follows").delete().eq("id", r.id);
  return { ok: true, creatorName: (prof as { full_name: string | null } | null)?.full_name || "ce créateur" };
}

export type FollowStats = { followers: number; following: number };

export async function getFollowStats(userId: string): Promise<FollowStats> {
  const admin = createAdminClient();
  const [{ count: followers }, { count: following }] = await Promise.all([
    admin.from("follows").select("id", { count: "exact", head: true }).eq("creator_id", userId),
    admin.from("follows").select("id", { count: "exact", head: true }).eq("follower_user_id", userId),
  ]);
  return { followers: followers ?? 0, following: following ?? 0 };
}

/**
 * Active/désactive le partage d'une chanson avec les abonnés.
 * Renvoie `fanOut: true` si une diffusion aux abonnés doit être lancée (after()).
 */
export async function setSongSharedWithFollowers(
  songId: string,
  on: boolean,
): Promise<{ ok: boolean; error?: string; fanOut?: boolean }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié" };

  const admin = createAdminClient();
  const { data: song } = await admin
    .from("songs")
    .select("id, user_id, status, followers_notified_at")
    .eq("id", songId)
    .maybeSingle();
  const s = song as Pick<Song, "id" | "user_id" | "status" | "followers_notified_at"> | null;
  if (!s || s.user_id !== user.id) return { ok: false, error: "Chanson introuvable" };
  if (on && s.status !== "ready") return { ok: false, error: "La chanson n'est pas encore prête" };

  await admin.from("songs").update({ shared_with_followers: on }).eq("id", songId);
  return { ok: true, fanOut: on && !s.followers_notified_at };
}

/** Diffusion : notifie chaque abonné du créateur (une seule fois par chanson). */
export async function fanOutNewSong(songId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: song } = await admin.from("songs").select("*").eq("id", songId).maybeSingle();
  const s = song as Song | null;
  if (!s || !s.shared_with_followers || s.status !== "ready" || s.followers_notified_at) return;

  const { data: prof } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", s.user_id)
    .maybeSingle();
  const creatorName = (prof as { full_name: string | null } | null)?.full_name || "Un créateur";
  const title = songTitle(s);

  const { data: followers } = await admin
    .from("follows")
    .select("id, follower_user_id, follower_email, unsubscribe_token")
    .eq("creator_id", s.user_id);

  for (const f of (followers as {
    id: string;
    follower_user_id: string | null;
    follower_email: string | null;
    unsubscribe_token: string;
  }[]) ?? []) {
    const { data: claimed } = await admin
      .from("song_follow_notifications")
      .upsert({ song_id: songId, follow_id: f.id }, { onConflict: "song_id,follow_id", ignoreDuplicates: true })
      .select("song_id");
    if (!claimed?.length) continue; // déjà notifié

    if (f.follower_user_id) {
      await notify(f.follower_user_id, {
        type: "creator_new_song",
        title: `${creatorName} a publié « ${title} »`,
        body: s.occasion ?? undefined,
        link: `/inspiration/${songId}`,
        dedupeKey: `creator_new_song:${songId}`,
      });
      await sendCreatorNewSongEmail({
        toUserId: f.follower_user_id,
        creatorName,
        songTitle: title,
        occasion: s.occasion,
        songId,
        unsubscribeToken: f.unsubscribe_token,
      }).catch(() => {});
    } else if (f.follower_email) {
      await sendCreatorNewSongEmail({
        toEmail: f.follower_email,
        creatorName,
        songTitle: title,
        occasion: s.occasion,
        songId,
        unsubscribeToken: f.unsubscribe_token,
      }).catch(() => {});
    }
  }

  await admin.from("songs").update({ followers_notified_at: new Date().toISOString() }).eq("id", songId);
}
