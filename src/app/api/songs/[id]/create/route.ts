import { apiError, json, requireUser } from "@/lib/api";
import { createSongFromCredits, getOwnedSong } from "@/lib/songs";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { response } = await requireUser();
  if (response) return response;
  const { id } = await params;

  const song = await getOwnedSong(id);
  if (!song) return apiError("Chanson introuvable", 404);

  const result = await createSongFromCredits(id);

  if (result.ok) return json({ ok: true, redirectUrl: `/mes-chansons/${id}` });

  if (result.reason === "insufficient") {
    return apiError("Crédits insuffisants", 402);
  }
  if (result.reason === "not_ready") {
    return apiError("Valide d'abord les paroles.", 422);
  }
  return apiError(result.message ?? "Création impossible", 500);
}
