import { json } from "@/lib/api";
import {
  env,
  isMockEmail,
  isMockLyrics,
  isMockMusic,
  isMockPayments,
  isSupabaseConfigured,
} from "@/lib/env";
import { getSunoCredits } from "@/lib/music/suno";

/**
 * Diagnostic public (aucune valeur sensible) : dit quelles intégrations sont
 * réelles vs simulées. Pratique pour vérifier la config après un déploiement.
 */
export async function GET() {
  return json({
    ok: true,
    supabase: isSupabaseConfigured,
    music: isMockMusic ? "mock" : "suno",
    musicProvider: env.musicProvider,
    sunoBaseUrlSet: !!env.sunoApiBaseUrl,
    sunoKeySet: !!env.sunoApiKey,
    sunoBalance: isMockMusic ? null : await getSunoCredits(),
    lyrics: isMockLyrics ? "template" : "claude",
    payments: isMockPayments ? "mock" : "moneroo",
    monerooWebhookSecretSet: !!env.monerooWebhookSecret,
    email: isMockEmail ? "mock" : "brevo",
    cronSecretSet: !!env.cronSecret,
    googleClientIdSet: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    siteUrl: env.siteUrl,
  });
}
