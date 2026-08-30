import { apiError, json, requireUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPack, grantCredits } from "@/lib/credits";
import { getUserLoyalty } from "@/lib/loyalty";
import { packCheckoutRequest } from "@/lib/schemas";
import { initializePayment } from "@/lib/payments/moneroo";
import { env } from "@/lib/env";
import { CURRENCY, discountedPrice } from "@/lib/pricing";

export async function POST(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Corps JSON invalide");
  }
  const parsed = packCheckoutRequest.safeParse(body);
  if (!parsed.success) return apiError("Requête invalide", 422);

  const pack = await getPack(parsed.data.packId);
  if (!pack || !pack.is_active) return apiError("Pack introuvable", 404);

  // Remise fidélité éventuelle (n'affecte que le prix, pas les crédits accordés).
  const { discountPct } = await getUserLoyalty(user!.id);
  const amount = discountedPrice(pack.price, discountPct);

  const next = parsed.data.next && parsed.data.next.startsWith("/") ? parsed.data.next : "";
  const admin = createAdminClient();

  // Crée d'abord la ligne de paiement pour disposer de son id (métadonnée webhook).
  const { data: payment, error } = await admin
    .from("payments")
    .insert({
      user_id: user!.id,
      provider: "moneroo",
      pack_id: pack.id,
      credits: pack.credits,
      amount,
      currency: pack.currency || CURRENCY,
      status: "initiated",
    })
    .select("id")
    .single();
  if (error) return apiError(error.message, 500);

  const paymentId = (payment as { id: string }).id;
  const returnUrl = `${env.siteUrl}/credits?paid=1${next ? `&next=${encodeURIComponent(next)}` : ""}`;

  // Pays de l'acheteur (géo-IP Vercel) → pré-sélectionne le pays sur la page
  // de paiement Moneroo. Absent en local / si non déterminé.
  const ipCountry = (req.headers.get("x-vercel-ip-country") ?? "").toUpperCase();
  const country = /^[A-Z]{2}$/.test(ipCountry) ? ipCountry : undefined;

  let init;
  try {
    init = await initializePayment({
      paymentId,
      amount,
      currency: pack.currency || CURRENCY,
      description: `Muzikii — pack ${pack.name} (${pack.credits} crédits)`,
      returnUrl,
      customer: { email: user!.email ?? "client@muzikii.com" },
      country,
    });
  } catch (err) {
    return apiError(`Initialisation du paiement impossible : ${(err as Error).message}`, 502);
  }

  await admin
    .from("payments")
    .update({ provider_ref: init.reference, checkout_url: init.checkoutUrl })
    .eq("id", paymentId);

  // Mode simulé : on crédite tout de suite.
  if (init.mock) {
    await admin.from("payments").update({ status: "success", method: "mock" }).eq("id", paymentId);
    await grantCredits(user!.id, pack.credits, "purchase", paymentId);
  }

  return json({ redirectUrl: init.checkoutUrl, mock: init.mock });
}
