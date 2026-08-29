import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LoyaltyTier } from "@/lib/domain";

export type UserLoyalty = {
  songCount: number;
  tier: LoyaltyTier | null;
  nextTier: LoyaltyTier | null;
  songsToNext: number;
  discountPct: number;
};

/** Paliers de fidélité, triés du plus bas au plus haut. */
export async function getTiers(): Promise<LoyaltyTier[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("loyalty_tiers")
    .select("id,name,min_songs,discount_pct,sort_order")
    .order("min_songs", { ascending: true });
  return (data as LoyaltyTier[]) ?? [];
}

/** Nombre de chansons réellement lancées (hors brouillons). */
export async function countCreatedSongs(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("songs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .neq("status", "draft");
  return count ?? 0;
}

export async function getUserLoyalty(userId: string): Promise<UserLoyalty> {
  const [tiers, songCount] = await Promise.all([getTiers(), countCreatedSongs(userId)]);
  const reached = tiers.filter((t) => songCount >= t.min_songs);
  const tier = reached.length ? reached[reached.length - 1] : (tiers[0] ?? null);
  const nextTier = tiers.find((t) => t.min_songs > songCount) ?? null;
  return {
    songCount,
    tier,
    nextTier,
    songsToNext: nextTier ? Math.max(0, nextTier.min_songs - songCount) : 0,
    discountPct: tier?.discount_pct ?? 0,
  };
}
