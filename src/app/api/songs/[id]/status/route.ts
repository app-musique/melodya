import { apiError, json, requireUser } from "@/lib/api";
import { advanceGeneration, getSongBundle } from "@/lib/songs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { response } = await requireUser();
  if (response) return response;
  const { id } = await params;

  const bundle = await getSongBundle(id);
  if (!bundle) return apiError("Chanson introuvable", 404);

  // Fait avancer la machine à états si nécessaire.
  if (bundle.song.status === "generating") {
    try {
      await advanceGeneration(id);
    } catch (err) {
      console.error("advanceGeneration", err);
    }
    const refreshed = await getSongBundle(id);
    if (refreshed) return json(refreshed);
  }

  return json(bundle);
}
