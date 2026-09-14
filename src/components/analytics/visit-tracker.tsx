"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { visitorId } from "@/lib/visitor-id";

/**
 * Compteur de visites interne (1re partie, anonyme) pour Admin › Statistiques.
 * Envoie un événement à chaque page vue. Ne suit pas les pages /admin (usage
 * interne, pas du trafic « visiteur »). Best-effort : jamais bloquant.
 */
export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    try {
      fetch("/api/track/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({ visitorId: visitorId(), path: pathname }),
      }).catch(() => {});
    } catch {
      // best-effort
    }
  }, [pathname]);

  return null;
}
