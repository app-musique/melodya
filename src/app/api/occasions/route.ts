import { apiError, json, requireUser } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { listOccasions } from "@/lib/occasions";
import { occasionSchema } from "@/lib/schemas";

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;
  return json({ occasions: await listOccasions(user!.id) });
}

export async function POST(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Corps JSON invalide");
  }
  const parsed = occasionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Données invalides", 422);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("occasions")
    .insert({
      user_id: user!.id,
      label: parsed.data.label,
      person_name: parsed.data.person_name || null,
      relationship: parsed.data.relationship || null,
      event_date: parsed.data.event_date,
      is_recurring: parsed.data.is_recurring,
      notify_days_before: parsed.data.notify_days_before,
    })
    .select("*")
    .single();
  if (error) return apiError(error.message, 500);
  return json({ occasion: data });
}
