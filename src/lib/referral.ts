import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * Rattache l'utilisateur connecté à un parrain via son code.
 * No-op si le compte n'est plus « récent » ou a déjà un parrain (garde-fous SQL).
 */
export async function attachReferral(code: string): Promise<void> {
  if (!code || !/^[A-Za-z0-9]{4,12}$/.test(code)) return;
  const supabase = await createServerClient();
  await supabase.rpc("attach_referral", { p_code: code });
}

export type ReferralStats = { filleuls: number; credits: number };

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const admin = createAdminClient();
  const [{ count }, { data: txns }] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", userId),
    admin
      .from("credit_transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("reason", "referral"),
  ]);
  const credits = ((txns as { amount: number }[]) ?? []).reduce((s, r) => s + r.amount, 0);
  return { filleuls: count ?? 0, credits };
}
