import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Client « service role » : contourne la RLS.
 * À n'utiliser que côté serveur (webhooks, orchestration de génération, page cadeau publique).
 */
export function createAdminClient() {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error("Supabase non configuré (URL ou SUPABASE_SERVICE_ROLE_KEY manquant).");
  }
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
