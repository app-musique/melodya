import "server-only";
import crypto from "node:crypto";
import { env, isMockPayments } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantCredits, paymentAlreadyCredited } from "@/lib/credits";
import { sendCapiEvent } from "@/lib/facebook";

const MONEROO_API = "https://api.moneroo.io/v1";

export type InitPaymentInput = {
  paymentId: string;
  amount: number;
  currency: string;
  description: string;
  returnUrl: string;
  customer: { email: string; firstName?: string; lastName?: string };
  /** Pays de l'acheteur (ISO 3166-1 alpha-2) — pré-sélectionne le pays sur la
   *  page de paiement Moneroo. L'acheteur peut toujours en changer. */
  country?: string;
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
      reference: `mock_${input.paymentId}`,
      checkoutUrl: input.returnUrl,
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
        last_name: input.customer.lastName || "Muzikii",
        ...(input.country && /^[A-Z]{2}$/.test(input.country)
          ? { country: input.country }
          : {}),
      },
      return_url: input.returnUrl,
      metadata: { payment_id: input.paymentId },
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

type VerifyResult = {
  status: string;
  metadata: Record<string, unknown>;
  method: string | null;
  amount: number | null;
  currency: string | null;
};

/**
 * Source de vérité : interroge Moneroo pour l'état réel d'une transaction.
 * (Le webhook Moneroo ne transmet PAS les metadata — on vérifie toujours ici.)
 */
export async function verifyPayment(transactionId: string): Promise<VerifyResult | null> {
  if (isMockPayments || !env.monerooSecretKey) return null;
  const res = await fetch(`${MONEROO_API}/payments/${encodeURIComponent(transactionId)}/verify`, {
    headers: {
      Authorization: `Bearer ${env.monerooSecretKey}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const json = (await res.json().catch(() => ({}))) as {
    data?: {
      status?: string;
      metadata?: Record<string, unknown>;
      amount?: number;
      currency?: string;
      capture?: { metadata?: { selected_payment_method?: string | null } };
    };
  };
  const d = json.data;
  if (!d) return null;
  return {
    status: d.status ?? "pending",
    metadata: d.metadata ?? {},
    method: d.capture?.metadata?.selected_payment_method ?? null,
    amount: typeof d.amount === "number" ? d.amount : null,
    currency: d.currency ?? null,
  };
}

export type SettleResult = {
  status: "success" | "pending" | "failed";
  credited: boolean;
  credits: number;
  amount: number | null;
  currency: string | null;
  paymentId: string | null;
};

/**
 * Règle une transaction Moneroo : vérifie l'état, met à jour la ligne `payments`,
 * crédite le compte (idempotent). Appelé par le webhook ET au retour de paiement.
 * `expectedUserId` : si fourni, ne crédite que si le paiement appartient à cet
 * utilisateur (garde-fou pour la route de retour).
 */
export async function settleMonerooPayment(
  transactionId: string,
  opts: { expectedUserId?: string } = {},
): Promise<SettleResult> {
  const admin = createAdminClient();
  const empty = { credited: false, credits: 0, amount: null, currency: null, paymentId: null };
  const verified = await verifyPayment(transactionId);
  if (!verified) return { status: "pending", ...empty };

  const success = isSuccessfulPaymentStatus(verified.status);
  const failed = ["failed", "cancelled", "canceled", "declined"].includes(
    verified.status.toLowerCase(),
  );
  const dbStatus = success ? "success" : failed ? "failed" : "initiated";

  // Retrouve le paiement : via nos metadata si présentes, sinon via provider_ref.
  const metaPaymentId =
    typeof verified.metadata.payment_id === "string" ? verified.metadata.payment_id : null;

  let q = admin.from("payments").select("id, user_id, credits, status, amount, currency, is_test");
  q = metaPaymentId ? q.eq("id", metaPaymentId) : q.eq("provider_ref", transactionId);
  const { data: payment } = await q.maybeSingle();
  const p = payment as
    | {
        id: string;
        user_id: string;
        credits: number | null;
        status: string;
        amount: number | null;
        currency: string | null;
        is_test: boolean | null;
      }
    | null;
  if (!p) return { status: success ? "success" : failed ? "failed" : "pending", ...empty };

  if (p.status !== dbStatus) {
    await admin
      .from("payments")
      .update({
        status: dbStatus,
        method: verified.method ?? undefined,
        provider_ref: transactionId,
        raw: verified as unknown as Record<string, unknown>,
      })
      .eq("id", p.id);
  }

  let credited = false;
  const userOk = !opts.expectedUserId || opts.expectedUserId === p.user_id;
  if (success && userOk && p.credits && p.credits > 0 && !(await paymentAlreadyCredited(p.id))) {
    await grantCredits(p.user_id, p.credits, "purchase", p.id);
    credited = true;

    // Conversion Meta (API Conversions) — dédupliquée avec le pixel via event_id.
    if (!p.is_test) {
      const { data: u } = await admin.auth.admin.getUserById(p.user_id);
      await sendCapiEvent({
        eventName: "Purchase",
        eventId: p.id,
        eventSourceUrl: `${env.siteUrl}/credits`,
        email: u.user?.email ?? null,
        customData: {
          value: p.amount ?? verified.amount ?? 0,
          currency: p.currency ?? verified.currency ?? "XOF",
          content_type: "product",
          num_items: p.credits,
        },
      });
    }
  }

  return {
    status: success ? "success" : failed ? "failed" : "pending",
    credited,
    credits: p.credits ?? 0,
    amount: p.amount ?? verified.amount ?? null,
    currency: p.currency ?? verified.currency ?? null,
    paymentId: p.id,
  };
}
