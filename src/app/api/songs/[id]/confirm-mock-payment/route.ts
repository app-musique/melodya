import { apiError, json, requireUser } from "@/lib/api";
import { getOwnedSong, markPaid } from "@/lib/songs";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMockPayments } from "@/lib/env";

type Params = { params: Promise<{ id: string }> };

/** Simule la confirmation d'un paiement — uniquement quand MONEROO_SECRET_KEY est absent. */
export async function POST(_req: Request, { params }: Params) {
  if (!isMockPayments) return apiError("Paiement réel actif — endpoint désactivé", 403);

  const { response } = await requireUser();
  if (response) return response;

  const { id } = await params;
  const song = await getOwnedSong(id);
  if (!song) return apiError("Chanson introuvable", 404);
  if (song.status === "draft" && !song.lyrics_approved) {
    return apiError("Commande incomplète", 422);
  }

  const admin = createAdminClient();
  await admin
    .from("payments")
    .update({ status: "success", method: "mock", raw: { mock: true } })
    .eq("song_id", id);

  await markPaid(id);
  return json({ ok: true, redirectUrl: `/mes-chansons/${id}` });
}
