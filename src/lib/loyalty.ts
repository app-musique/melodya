import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LoyaltyTier } from "@/lib/domain";

export type UserLoyalty = {
  /** Total de crédits achetés (mouvements « purchase »). */
  creditsPurchased: number;
  tier: LoyaltyTier | null;
  nextTier: LoyaltyTier | null;
  creditsToNext: number;
  discountPct: number;
};

/** Paliers de fidélité, triés du plus bas au plus haut. */
export async function getTiers(): Promise<LoyaltyTier[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("loyalty_tiers")
    .select("id,name,min_credits,discount_pct,sort_order")
    .order("min_credits", { ascending: true });
  return (data as LoyaltyTier[]) ?? [];
}

/** Total de crédits achetés par l'utilisateur (recharges abouties). */
export async function countPurchasedCredits(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("credit_transactions")
    .select("amount")
    .eq("user_id", userId)
    .eq("reason", "purchase");
  return ((data as { amount: number }[]) ?? []).reduce((s, r) => s + Math.max(0, r.amount), 0);
}

export async function getUserLoyalty(userId: string): Promise<UserLoyalty> {
  const [tiers, creditsPurchased] = await Promise.all([
    getTiers(),
    countPurchasedCredits(userId),
  ]);
  const reached = tiers.filter((t) => creditsPurchased >= t.min_credits);
  const tier = reached.length ? reached[reached.length - 1] : (tiers[0] ?? null);
  const nextTier = tiers.find((t) => t.min_credits > creditsPurchased) ?? null;
  return {
    creditsPurchased,
    tier,
    nextTier,
    creditsToNext: nextTier ? Math.max(0, nextTier.min_credits - creditsPurchased) : 0,
    discountPct: tier?.discount_pct ?? 0,
  };
}
