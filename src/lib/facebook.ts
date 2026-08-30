import "server-only";
import crypto from "node:crypto";
import { getFacebookConfig } from "@/lib/integrations";
import { logError } from "@/lib/errors";

const GRAPH_VERSION = "v21.0";

const sha256 = (v: string) =>
  crypto.createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

export type CapiEvent = {
  eventName: "Purchase" | "InitiateCheckout" | "CompleteRegistration" | "Lead" | "PageView";
  /** Même valeur que l'`eventID` du pixel navigateur → déduplication Meta. */
  eventId?: string;
  eventSourceUrl?: string;
  email?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  /** Cookies Meta si disponibles (améliorent le taux de correspondance). */
  fbp?: string | null;
  fbc?: string | null;
  customData?: Record<string, unknown>;
};

/**
 * API Conversions Meta — envoi serveur d'un événement (fiable, non bloqué par
 * les bloqueurs de pub). No-op si le pixel ou le jeton ne sont pas configurés.
 */
export async function sendCapiEvent(evt: CapiEvent): Promise<void> {
  const { pixelId, capiToken, testEventCode } = await getFacebookConfig();
  if (!pixelId || !capiToken) return;

  const userData: Record<string, unknown> = {};
  if (evt.email) userData.em = [sha256(evt.email)];
  if (evt.clientIp) userData.client_ip_address = evt.clientIp;
  if (evt.userAgent) userData.client_user_agent = evt.userAgent;
  if (evt.fbp) userData.fbp = evt.fbp;
  if (evt.fbc) userData.fbc = evt.fbc;

  const body = {
    data: [
      {
        event_name: evt.eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        ...(evt.eventId ? { event_id: evt.eventId } : {}),
        ...(evt.eventSourceUrl ? { event_source_url: evt.eventSourceUrl } : {}),
        user_data: userData,
        ...(evt.customData ? { custom_data: evt.customData } : {}),
      },
    ],
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(
        capiToken,
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      await logError("facebook.capi", new Error(`HTTP ${res.status}`), {
        event: evt.eventName,
        response: (await res.text()).slice(0, 500),
      });
    }
  } catch (e) {
    await logError("facebook.capi", e, { event: evt.eventName });
  }
}
