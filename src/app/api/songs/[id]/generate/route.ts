import { apiError, json, requireUser } from "@/lib/api";
import { getOwnedSong, startGeneration } from "@/lib/songs";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

/** Relance une génération après un échec. */
export async function POST(_req: Request, { params }: Params) {
  const { response } = await requireUser();
  if (response) return response;
  const { id } = await params;

  const song = await getOwnedSong(id);
  if (!song) return apiError("Chanson introuvable", 404);
  if (!["failed", "paid"].includes(song.status)) {
    return apiError("Génération déjà en cours ou terminée", 409);
  }

  const admin = createAdminClient();
  await admin
    .from("songs")
    .update({ status: "paid", error: null, provider_job_id: null, generation_started_at: null })
    .eq("id", id);

  await startGeneration(id);
  return json({ ok: true });
}
