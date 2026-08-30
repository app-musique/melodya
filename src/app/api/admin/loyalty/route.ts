import { apiError, json, requireAdmin } from "@/lib/api";
import { getReferralSettings } from "@/lib/credits";
import { getTiers } from "@/lib/loyalty";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminLoyaltyTierSchema } from "@/lib/schemas";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  const [tiers, referral] = await Promise.all([getTiers(), getReferralSettings()]);
  return json({ tiers, referral });
}

export async function POST(req: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Corps JSON invalide");
  }
  const parsed = adminLoyaltyTierSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalide", 422);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("loyalty_tiers")
    .insert(parsed.data)
    .select("id,name,min_credits,discount_pct,sort_order")
    .single();
  if (error) return apiError(error.message, 500);

  return json({ tier: data });
}
