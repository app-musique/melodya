import { after } from "next/server";
import { apiError, json } from "@/lib/api";
import { logError } from "@/lib/errors";
import {
  settleMonerooPayment,
  verifyWebhookSignature,
  type MonerooWebhookEvent,
} from "@/lib/payments/moneroo";

export const maxDuration = 30;

/**
 * Webhook Moneroo — signé (HMAC-SHA256 hex, en-tête X-Moneroo-Signature).
 * Le payload ne contient PAS les metadata : on répond 200 tout de suite et on
 * vérifie l'état réel de la transaction en tâche de fond (settleMonerooPayment).
 */
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

  const transactionId = event.data?.id;
  if (transactionId) {
    after(async () => {
      try {
        await settleMonerooPayment(transactionId);
      } catch (e) {
        await logError("webhook.moneroo", e, { transactionId, event: event.event });
      }
    });
  }

  return json({ received: true });
}
