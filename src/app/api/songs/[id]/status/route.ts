import { after } from "next/server";
import { apiError, json, requireUser } from "@/lib/api";
import { advanceGeneration, getSongBundle, syncSongAssets } from "@/lib/songs";
import { logError } from "@/lib/errors";

export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { response } = await requireUser();
  if (response) return response;
  const { id } = await params;

  let bundle = await getSongBundle(id);
  if (!bundle) return apiError("Chanson introuvable", 404);

  // Fait avancer la machine à états si nécessaire.
  if (bundle.song.status === "generating") {
    try {
      await advanceGeneration(id);
    } catch (err) {
      await logError("status.advanceGeneration", err, { songId: id });
    }
    bundle = (await getSongBundle(id)) ?? bundle;
  }

  // Ré-hébergement audio + timings en tâche de fond (ne bloque pas la réponse).
  if (bundle.song.status === "ready" && !bundle.song.assets_synced_at) {
    after(() => syncSongAssets(id));
  }

  return json(bundle);
}
