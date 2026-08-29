import { revalidatePath } from "next/cache";
import { apiError, json, requireAdmin } from "@/lib/api";
import { getSettings } from "@/lib/credits";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminSettingsSchema } from "@/lib/schemas";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  return json({ settings: await getSettings() });
}

export async function PATCH(req: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Corps JSON invalide");
  }
  const parsed = adminSettingsSchema.partial().safeParse(body);
  if (!parsed.success) return apiError("Invalide", 422);

  const admin = createAdminClient();
  const rows = Object.entries(parsed.data).map(([key, value]) => ({
    key,
    value: String(value),
  }));
  if (rows.length) {
    const { error } = await admin.from("app_settings").upsert(rows, { onConflict: "key" });
    if (error) return apiError(error.message, 500);
  }

  revalidatePath("/");
  revalidatePath("/credits");
  return json({ settings: await getSettings() });
}
