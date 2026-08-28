import "server-only";
import crypto from "node:crypto";
import { env, isMockPayments } from "@/lib/env";

const MONEROO_API = "https://api.moneroo.io/v1";

export type InitPaymentInput = {
  songId: string;
  amount: number;
  currency: string;
  description: string;
  customer: { email: string; firstName?: string; lastName?: string };
};

export type InitPaymentResult = {
  reference: string;
  checkoutUrl: string;
  mock: boolean;
};

/** Crée une transaction et renvoie l'URL de paiement hébergée. */
export async function initializePayment(input: InitPaymentInput): Promise<InitPaymentResult> {
  if (isMockPayments) {
    return {
      reference: `mock_${input.songId}`,
      checkoutUrl: `${env.siteUrl}/commander/${input.songId}/paiement?mock=1`,
      mock: true,
    };
  }

  const res = await fetch(`${MONEROO_API}/payments/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.monerooSecretKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      customer: {
        email: input.customer.email,
        first_name: input.customer.firstName || "Client",
        last_name: input.customer.lastName || "Melodya",
      },
      return_url: `${env.siteUrl}/commander/${input.songId}/paiement`,
      metadata: { song_id: input.songId },
    }),
  });

  if (!res.ok) {
    throw new Error(`Moneroo initialize a échoué (${res.status}): ${await res.text()}`);
  }

  const json = (await res.json()) as { data?: { id?: string; checkout_url?: string } };
  const id = json.data?.id;
  const checkoutUrl = json.data?.checkout_url;
  if (!id || !checkoutUrl) throw new Error("Moneroo: réponse d'initialisation incomplète");

  return { reference: id, checkoutUrl, mock: false };
}

export type MonerooWebhookEvent = {
  event?: string;
  data?: {
    id?: string;
    status?: string;
    amount?: number;
    currency?: string;
    metadata?: Record<string, unknown>;
  };
};

/** Vérifie la signature du webhook (HMAC-SHA256 du corps brut). */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!env.monerooWebhookSecret) return false;
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha256", env.monerooWebhookSecret)
    .update(rawBody, "utf8")
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function isSuccessfulPaymentStatus(status?: string): boolean {
  return !!status && ["success", "successful", "completed", "paid"].includes(status.toLowerCase());
}
