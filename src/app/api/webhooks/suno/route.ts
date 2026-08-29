import { after } from "next/server";
import { json } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { advanceGeneration, syncSongAssets } from "@/lib/songs";
import { logError } from "@/lib/errors";

export const maxDuration = 60;

/**
 * Callback sunoapi.org (non signé). Simple déclencheur : advanceGeneration
 * re-interroge record-info (source de vérité). On répond 200 tout de suite
 * (fenêtre de 15 s) et on travaille en tâche de fond.
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

  const s = song as { id: string; status: string } | null;
  if (s && (s.status === "generating" || s.status === "ready")) {
    after(async () => {
      try {
        await advanceGeneration(s.id);
        await syncSongAssets(s.id);
      } catch (e) {
        await logError("webhook.suno", e, { taskId, songId: s.id });
      }
    });
  }
  return json({ ok: true });
}
