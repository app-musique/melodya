import { apiError, json, requireUser } from "@/lib/api";
import { getOwnedSong, recomputePrice, updateDraft } from "@/lib/songs";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkoutRequest } from "@/lib/schemas";
import { initializePayment } from "@/lib/payments/moneroo";
import { CURRENCY } from "@/lib/pricing";

export async function POST(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Corps JSON invalide");
  }

  const parsed = checkoutRequest.safeParse(body);
  if (!parsed.success) return apiError("Requête invalide", 422);

  const song = await getOwnedSong(parsed.data.songId);
  if (!song) return apiError("Chanson introuvable", 404);
  if (!song.lyrics_approved) return apiError("Valide d'abord les paroles.", 422);
  if (["paid", "generating", "ready"].includes(song.status)) {
    return json({ alreadyPaid: true, redirectUrl: `/mes-chansons/${song.id}` });
  }

  const amount = recomputePrice(song);
  await updateDraft(song.id, { price_total: amount, currency: CURRENCY, status: "pending_payment" });

  let payment;
  try {
    payment = await initializePayment({
      songId: song.id,
      amount,
      currency: CURRENCY,
      description: `Chanson personnalisée Melodya — ${song.occasion ?? ""}`.trim(),
      customer: { email: user!.email ?? "client@melodya.app" },
    });
  } catch (err) {
    return apiError(`Initialisation du paiement impossible : ${(err as Error).message}`, 502);
  }

  const admin = createAdminClient();
  await admin.from("payments").insert({
    song_id: song.id,
    user_id: user!.id,
    provider: "moneroo",
    provider_ref: payment.reference,
    checkout_url: payment.checkoutUrl,
    amount,
    currency: CURRENCY,
    status: "initiated",
  });

  return json({ redirectUrl: payment.checkoutUrl, mock: payment.mock });
}
