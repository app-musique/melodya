/**
 * Accès centralisé aux variables d'environnement + détection des modes « mock ».
 *
 * Important : chaque variable est lue par un accès statique `process.env.NOM`
 * (et non `process.env[nom]`) — c'est la seule forme que le bundler Next.js
 * sait remplacer côté navigateur pour les variables `NEXT_PUBLIC_*`.
 */

const clean = (v: string | undefined): string | undefined =>
  v && v.trim() !== "" ? v.trim() : undefined;

// URL absolue du site : variable explicite, sinon domaine de prod Vercel, sinon local.
const vercelProd = clean(process.env.VERCEL_PROJECT_PRODUCTION_URL);
const resolvedSiteUrl =
  clean(process.env.NEXT_PUBLIC_SITE_URL) ??
  (vercelProd ? `https://${vercelProd}` : "http://localhost:3000");

export const env = {
  // Publiques (disponibles côté navigateur)
  supabaseUrl: clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  siteUrl: resolvedSiteUrl,

  // Serveur uniquement
  supabaseServiceRoleKey: clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  anthropicApiKey: clean(process.env.ANTHROPIC_API_KEY),

  musicProvider: (clean(process.env.MUSIC_PROVIDER) ?? "mock").toLowerCase(),
  sunoApiBaseUrl: clean(process.env.SUNO_API_BASE_URL),
  sunoApiKey: clean(process.env.SUNO_API_KEY),

  monerooSecretKey: clean(process.env.MONEROO_SECRET_KEY),
  monerooWebhookSecret: clean(process.env.MONEROO_WEBHOOK_SECRET),

  resendApiKey: clean(process.env.RESEND_API_KEY),
};

export function requireEnv(name: keyof typeof env): string {
  const v = env[name];
  if (typeof v !== "string" || v === "") {
    throw new Error(
      `Variable d'environnement manquante : ${name}. Copie .env.example vers .env.local et renseigne-la.`,
    );
  }
  return v;
}

export const isSupabaseConfigured =
  !!env.supabaseUrl && !!env.supabaseAnonKey && !!env.supabaseServiceRoleKey;

export const isMockLyrics = !env.anthropicApiKey;

export const isMockMusic = env.musicProvider !== "suno" || !env.sunoApiKey || !env.sunoApiBaseUrl;

export const isMockPayments = !env.monerooSecretKey;

export const isMockEmail = !env.resendApiKey;
