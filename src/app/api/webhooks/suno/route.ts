import { json } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { advanceGeneration } from "@/lib/songs";

/**
 * Callback sunoapi.org (non signé). On s'en sert seulement comme déclencheur :
 * advanceGeneration re-interroge record-info (source de vérité) et fait le travail.
 * On répond 200 tout de suite (fenêtre de 15 s).
 */
export async function POST(req: Request) {
  let taskId: string | undefined;
  try {
    const body = (await req.json()) as { data?: { task_id?: string; taskId?: string } };
    taskId = body.data?.task_id ?? body.data?.taskId;
  } catch {
    return json({ ok: true });
  }
  if (!taskId) return json({ ok: true });

  const admin = createAdminClient();
  const { data: song } = await admin
    .from("songs")
    .select("id, status")
    .eq("provider_job_id", taskId)
    .maybeSingle();

  if (song && (song as { status: string }).status === "generating") {
    advanceGeneration((song as { id: string }).id).catch((e) =>
      console.error("suno webhook advanceGeneration", e),
    );
  }
  return json({ ok: true });
}
