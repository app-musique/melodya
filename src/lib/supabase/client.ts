import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/** Client Supabase pour les composants « client ». */
export function createClient() {
  return createBrowserClient(env.supabaseUrl!, env.supabaseAnonKey!);
}
