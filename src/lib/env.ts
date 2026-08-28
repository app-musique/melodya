/**
 * Accès centralisé aux variables d'environnement + détection des modes « mock ».
 * Toute intégration externe (paroles, musique, paiement) bascule automatiquement
 * en simulation quand la clé correspondante est absente.
 */

function optional(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

function required(name: string): string {
  const v = optional(name);
  if (!v) {
    throw new Error(
      `Variable d'environnement manquante : ${name}. Copie .env.example vers .env.local et renseigne-la.`,
    );
  }
  return v;
}

export const env = {
  supabaseUrl: optional("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: optional("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: optional("SUPABASE_SERVICE_ROLE_KEY"),

  siteUrl: optional("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000",

  anthropicApiKey: optional("ANTHROPIC_API_KEY"),

  musicProvider: (optional("MUSIC_PROVIDER") ?? "mock").toLowerCase(),
  sunoApiBaseUrl: optional("SUNO_API_BASE_URL"),
  sunoApiKey: optional("SUNO_API_KEY"),

  monerooSecretKey: optional("MONEROO_SECRET_KEY"),
  monerooWebhookSecret: optional("MONEROO_WEBHOOK_SECRET"),
};

export const requireEnv = { required };

export const isSupabaseConfigured =
  !!env.supabaseUrl && !!env.supabaseAnonKey && !!env.supabaseServiceRoleKey;

export const isMockLyrics = !env.anthropicApiKey;

export const isMockMusic = env.musicProvider !== "suno" || !env.sunoApiKey || !env.sunoApiBaseUrl;

export const isMockPayments = !env.monerooSecretKey;
