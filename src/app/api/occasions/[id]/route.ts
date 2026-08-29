import { apiError, json, requireUser } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { occasionSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { response } = await requireUser();
  if (response) return response;
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Corps JSON invalide");
  }
  const parsed = occasionSchema.partial().safeParse(body);
  if (!parsed.success) return apiError("Données invalides", 422);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("occasions")
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return apiError(error.message, 500);
  return json({ occasion: data });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { response } = await requireUser();
  if (response) return response;
  const { id } = await params;

  const supabase = await createClient();
  const { error } = await supabase.from("occasions").delete().eq("id", id);
  if (error) return apiError(error.message, 500);
  return json({ ok: true });
}
