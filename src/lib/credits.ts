import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { CreditPack, CreditTransaction, Profile } from "@/lib/domain";

// ------------------------------------------------------------------
// Lecture
// ------------------------------------------------------------------

export async function getSetting(key: string, fallback: number): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin.from("app_settings").select("value").eq("key", key).maybeSingle();
  const n = data ? Number((data as { value: string }).value) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export async function getCreditsPerSong(): Promise<number> {
  return getSetting("credits_per_song", 1);
}

export async function getSettings(): Promise<{
  credits_per_song: number;
  signup_bonus_credits: number;
}> {
  const [cps, bonus] = await Promise.all([
    getSetting("credits_per_song", 1),
    getSetting("signup_bonus_credits", 0),
  ]);
  return { credits_per_song: cps, signup_bonus_credits: bonus };
}

export async function getReferralSettings(): Promise<{
  referral_referrer_reward: number;
}> {
  const referrer = await getSetting("referral_referrer_reward", 2);
  return { referral_referrer_reward: referrer };
}

/** Packs actifs, triés — pour la boutique et la landing. */
export async function getPacks(): Promise<CreditPack[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("credit_packs")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return (data as CreditPack[]) ?? [];
}

/** Tous les packs (admin). */
export async function getAllPacks(): Promise<CreditPack[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("credit_packs").select("*").order("sort_order");
  return (data as CreditPack[]) ?? [];
}

export async function getPack(id: string): Promise<CreditPack | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("credit_packs").select("*").eq("id", id).maybeSingle();
  return (data as CreditPack) ?? null;
}

/** Profil de l'utilisateur connecté (RLS). */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return (data as Profile) ?? null;
}

export async function getBalance(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("credit_balance")
    .eq("id", userId)
    .maybeSingle();
  return (data as { credit_balance: number } | null)?.credit_balance ?? 0;
}

export async function listTransactions(userId: string): Promise<CreditTransaction[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("credit_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as CreditTransaction[]) ?? [];
}

// ------------------------------------------------------------------
// Écriture (fonctions SQL atomiques)
// ------------------------------------------------------------------

export async function grantCredits(
  userId: string,
  amount: number,
  reason: "purchase" | "bonus" | "refund" | "referral" | "adjustment",
  paymentId?: string,
): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("grant_credits", {
    p_user: userId,
    p_amount: amount,
    p_reason: reason,
    p_payment: paymentId ?? null,
  });
  if (error) throw error;
  return data as number;
}

export type SpendResult =
  | { ok: true; balance: number }
  | { ok: false; reason: "insufficient" | "error"; message?: string };

export async function spendCreditForSong(
  userId: string,
  songId: string,
  amount: number,
): Promise<SpendResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("spend_credit", {
    p_user: userId,
    p_song: songId,
    p_amount: amount,
  });
  if (error) {
    if (/INSUFFICIENT_CREDITS/.test(error.message)) return { ok: false, reason: "insufficient" };
    return { ok: false, reason: "error", message: error.message };
  }
  return { ok: true, balance: data as number };
}

/** Vrai si un mouvement lié à ce paiement existe déjà (idempotence webhook). */
export async function paymentAlreadyCredited(paymentId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("credit_transactions")
    .select("id", { count: "exact", head: true })
    .eq("payment_id", paymentId);
  return (count ?? 0) > 0;
}
