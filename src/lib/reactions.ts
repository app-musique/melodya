import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications";
import { sendGiftReactionEmail } from "@/lib/email";
import type { GiftReaction } from "@/lib/domain";

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
