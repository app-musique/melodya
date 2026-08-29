import { json } from "@/lib/api";
import {
  env,
  isMockEmail,
  isMockLyrics,
  isMockMusic,
  isMockPayments,
  isSupabaseConfigured,
} from "@/lib/env";

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
    lyrics: isMockLyrics ? "template" : "claude",
    payments: isMockPayments ? "mock" : "moneroo",
    email: isMockEmail ? "mock" : "resend",
    siteUrl: env.siteUrl,
  });
}
