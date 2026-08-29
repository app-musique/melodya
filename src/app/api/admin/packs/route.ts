import { revalidatePath } from "next/cache";
import { apiError, json, requireAdmin } from "@/lib/api";
import { getAllPacks } from "@/lib/credits";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminPackSchema } from "@/lib/schemas";
import { CURRENCY } from "@/lib/pricing";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  return json({ packs: await getAllPacks() });
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
  const parsed = adminPackSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalide", 422);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("credit_packs")
    .insert({ ...parsed.data, currency: CURRENCY })
    .select("*")
    .single();
  if (error) return apiError(error.message, 500);

  revalidatePath("/");
  revalidatePath("/credits");
  return json({ pack: data });
}
