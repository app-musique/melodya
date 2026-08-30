"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

/**
 * Pixel Meta (Facebook) — chargé uniquement si NEXT_PUBLIC_FACEBOOK_PIXEL_ID
 * est défini. Envoie PageView à chaque changement de route. Les conversions
 * (Purchase, InitiateCheckout, CompleteRegistration) sont déclenchées ailleurs
 * via `fbqTrack`, et doublées côté serveur par l'API Conversions.
 */
export function FacebookPixel({ pixelId }: { pixelId: string }) {
  const pathname = usePathname();
  const loaded = useRef(false);

  useEffect(() => {
    // Le tout premier PageView est envoyé par le script d'init ci-dessous ;
    // on ne renvoie que lors des navigations suivantes.
    if (!loaded.current) {
      loaded.current = true;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [pathname]);

  return (
    <Script id="facebook-pixel" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window,document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${pixelId}');
        fbq('track', 'PageView');
      `}
    </Script>
  );
}

type FbqParams = Record<string, unknown>;

/** Déclenche un événement standard côté navigateur (no-op si le pixel est absent). */
export function fbqTrack(event: string, params?: FbqParams, eventId?: string) {
  if (typeof window === "undefined" || !window.fbq) return;
  if (eventId) window.fbq("track", event, params ?? {}, { eventID: eventId });
  else window.fbq("track", event, params ?? {});
}
