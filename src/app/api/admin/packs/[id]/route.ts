import { revalidatePath } from "next/cache";
import { apiError, json, requireAdmin } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminPackSchema } from "@/lib/schemas";

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
  const parsed = adminPackSchema.partial().safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalide", 422);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("credit_packs")
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return apiError(error.message, 500);

  revalidatePath("/");
  revalidatePath("/credits");
  return json({ pack: data });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { response } = await requireAdmin();
  if (response) return response;
  const { id } = await params;

  const admin = createAdminClient();
  // On désactive plutôt que supprimer (intégrité des paiements passés).
  const { error } = await admin.from("credit_packs").update({ is_active: false }).eq("id", id);
  if (error) return apiError(error.message, 500);

  revalidatePath("/");
  revalidatePath("/credits");
  return json({ ok: true });
}
