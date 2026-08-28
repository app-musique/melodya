import { apiError, json } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { markPaid } from "@/lib/songs";
import {
  isSuccessfulPaymentStatus,
  verifyWebhookSignature,
  type MonerooWebhookEvent,
} from "@/lib/payments/moneroo";

export async function POST(req: Request) {
  const raw = await req.text();
  const signature =
    req.headers.get("x-moneroo-signature") ?? req.headers.get("moneroo-signature");

  if (!verifyWebhookSignature(raw, signature)) {
    return apiError("Signature invalide", 401);
  }

  let event: MonerooWebhookEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return apiError("Payload invalide");
  }

  const songId = event.data?.metadata?.song_id as string | undefined;
  const status = event.data?.status;
  const ref = event.data?.id;

  if (!songId) return json({ ignored: true });

  const admin = createAdminClient();
  await admin
    .from("payments")
    .update({
      status: isSuccessfulPaymentStatus(status) ? "success" : "failed",
      method: (event.data as Record<string, unknown>)?.method as string | undefined,
      raw: event as unknown as Record<string, unknown>,
    })
    .eq("song_id", songId)
    .eq("provider_ref", ref ?? "");

  if (isSuccessfulPaymentStatus(status)) {
    await markPaid(songId);
  }

  return json({ received: true });
}
