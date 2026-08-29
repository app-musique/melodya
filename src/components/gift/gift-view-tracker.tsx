"use client";

import { useEffect } from "react";

/** Signale l'ouverture de la page cadeau une fois par session. */
export function GiftViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `gv_${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // pas de sessionStorage : on signale quand même
    }
    fetch(`/api/gift/${slug}/view`, { method: "POST" }).catch(() => {});
  }, [slug]);
  return null;
}
