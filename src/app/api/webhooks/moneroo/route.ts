import { apiError, json } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantCredits, paymentAlreadyCredited } from "@/lib/credits";
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

  const paymentId = event.data?.metadata?.payment_id as string | undefined;
  const status = event.data?.status;
  const ref = event.data?.id;

  if (!paymentId) return json({ ignored: true });

  const admin = createAdminClient();
  const success = isSuccessfulPaymentStatus(status);

  const { data: payment } = await admin
    .from("payments")
    .update({
      status: success ? "success" : "failed",
      method: (event.data as Record<string, unknown>)?.method as string | undefined,
      raw: event as unknown as Record<string, unknown>,
    })
    .eq("id", paymentId)
    .eq("provider_ref", ref ?? "")
    .select("id, user_id, credits")
    .maybeSingle();

  if (success && payment) {
    const p = payment as { id: string; user_id: string; credits: number | null };
    if (p.credits && p.credits > 0 && !(await paymentAlreadyCredited(p.id))) {
      await grantCredits(p.user_id, p.credits, "purchase", p.id);
    }
  }

  return json({ received: true });
}
