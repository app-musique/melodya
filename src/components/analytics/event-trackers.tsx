"use client";

import { useEffect } from "react";
import { fbqTrack } from "@/components/analytics/facebook-pixel";

/**
 * Déclenche l'événement Meta `Purchase` côté navigateur (déduplication avec
 * l'API Conversions via `eventId` = id du paiement). Monté sur /credits après
 * un retour de paiement confirmé.
 */
export function PurchaseTracker({
  eventId,
  value,
  currency,
  numItems,
}: {
  eventId: string;
  value: number;
  currency: string;
  numItems: number;
}) {
  useEffect(() => {
    fbqTrack(
      "Purchase",
      { value, currency, content_type: "product", num_items: numItems },
      eventId,
    );
  }, [eventId, value, currency, numItems]);
  return null;
}
