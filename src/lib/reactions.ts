import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications";
import { sendGiftReactionEmail } from "@/lib/email";
import { REACTION_EMOJIS, type GiftReaction } from "@/lib/domain";

export type ReactionSummary = {
  total: number;
  byEmoji: Record<string, number>;
};

export async function listReactions(songId: string): Promise<GiftReaction[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("gift_reactions")
    .select("*")
    .eq("song_id", songId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data as GiftReaction[]) ?? [];
}

/** Compte des réactions par emoji + total, pour une chanson. */
export async function reactionSummary(songId: string): Promise<ReactionSummary> {
  const admin = createAdminClient();
  const { data } = await admin.from("gift_reactions").select("emoji").eq("song_id", songId);
  const rows = (data as { emoji: string }[]) ?? [];
  const byEmoji: Record<string, number> = {};
  for (const e of REACTION_EMOJIS) byEmoji[e] = 0;
  for (const r of rows) byEmoji[r.emoji] = (byEmoji[r.emoji] ?? 0) + 1;
  return { total: rows.length, byEmoji };
}

/** Totaux de réactions pour une liste de chansons (Explorer). */
export async function reactionTotals(songIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!songIds.length) return map;
  const admin = createAdminClient();
  const { data } = await admin.from("gift_reactions").select("song_id").in("song_id", songIds);
  for (const r of (data as { song_id: string }[]) ?? []) {
    map.set(r.song_id, (map.get(r.song_id) ?? 0) + 1);
  }
  return map;
}

/**
 * Réaction publique sur une chanson « s'inspirer » (vitrine ou publique).
 * Dédup par auditeur via reactor_key (une réaction par personne, emoji modifiable).
 * Ne notifie pas le propriétaire (contrairement à addReaction des pages cadeau).
 */
export async function addShowcaseReaction(
  songId: string,
  input: { emoji: string; reactorKey: string; message?: string },
): Promise<{ ok: boolean; error?: string; summary?: ReactionSummary }> {
  if (!REACTION_EMOJIS.includes(input.emoji)) return { ok: false, error: "Emoji non autorisé" };
  if (!input.reactorKey || input.reactorKey.length > 64) return { ok: false, error: "Clé invalide" };

  const admin = createAdminClient();
  const { data: song } = await admin
    .from("songs")
    .select("id, is_public, is_showcase")
    .eq("id", songId)
    .maybeSingle();
  const s = song as { id: string; is_public: boolean; is_showcase: boolean } | null;
  if (!s || (!s.is_public && !s.is_showcase)) return { ok: false, error: "Chanson introuvable" };

  const { error } = await admin.from("gift_reactions").upsert(
    {
      song_id: songId,
      emoji: input.emoji,
      message: input.message?.trim() ? input.message.trim().slice(0, 280) : null,
      reactor_key: input.reactorKey,
    },
    { onConflict: "song_id,reactor_key" },
  );
  if (error) return { ok: false, error: error.message };

  return { ok: true, summary: await reactionSummary(songId) };
}

export async function addReaction(
  slug: string,
  input: { emoji: string; message?: string; authorName?: string },
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { data: song } = await admin
    .from("songs")
    .select("id, user_id, recipient_name, is_public, gift_slug")
    .eq("gift_slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (!song) return { ok: false, error: "Page cadeau introuvable" };
  const s = song as { id: string; user_id: string; recipient_name: string | null };

  const { error } = await admin.from("gift_reactions").insert({
    song_id: s.id,
    emoji: input.emoji,
    message: input.message?.trim() || null,
    author_name: input.authorName?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };

  const who = input.authorName?.trim() || s.recipient_name || "Quelqu'un";
  await notify(s.user_id, {
    type: "gift_reaction",
    title: `${who} a réagi à ton cadeau ${input.emoji}`,
    body: input.message?.trim() ? `« ${input.message.trim()} »` : undefined,
    link: `/mes-chansons/${s.id}`,
  });
  await sendGiftReactionEmail(s.user_id, {
    authorName: who,
    emoji: input.emoji,
    message: input.message?.trim() || null,
    songId: s.id,
  }).catch(() => {});

  return { ok: true };
}
