import { apiError, json, requireAdmin } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminLoyaltyTierSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { response } = await requireAdmin();
  if (response) return response;
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Corps JSON invalide");
  }
  const parsed = adminLoyaltyTierSchema.partial().safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalide", 422);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("loyalty_tiers")
    .update(parsed.data)
    .eq("id", id)
    .select("id,name,min_songs,discount_pct,sort_order")
    .single();
  if (error) return apiError(error.message, 500);

  return json({ tier: data });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { response } = await requireAdmin();
  if (response) return response;
  const { id } = await params;

  const admin = createAdminClient();
  const { error } = await admin.from("loyalty_tiers").delete().eq("id", id);
  if (error) return apiError(error.message, 500);

  return json({ ok: true });
}
