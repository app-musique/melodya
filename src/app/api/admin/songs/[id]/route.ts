import { revalidatePath } from "next/cache";
import { apiError, json, requireAdmin } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminSongShowcaseSchema } from "@/lib/schemas";

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
  const parsed = adminSongShowcaseSchema.safeParse(body);
  if (!parsed.success) return apiError("Données invalides", 422);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("songs")
    .update(parsed.data)
    .eq("id", id)
    .select("id, is_showcase, showcase_title, showcase_artist")
    .single();
  if (error) return apiError(error.message, 500);

  revalidatePath("/explorer");
  return json({ song: data });
}
