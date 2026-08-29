import { apiError, json, requireUser } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { profilePrefsSchema } from "@/lib/schemas";

export async function PATCH(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Corps JSON invalide");
  }
  const parsed = profilePrefsSchema.safeParse(body);
  if (!parsed.success) return apiError("Invalide", 422);
  if (Object.keys(parsed.data).length === 0) return json({ ok: true });

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user!.id);
  if (error) return apiError(error.message, 500);

  return json({ ok: true, ...parsed.data });
}
