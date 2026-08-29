import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Journalise une erreur serveur dans `app_errors` (visible en admin).
 * Ne lève jamais — retombe sur console.error si l'insertion échoue.
 */
export async function logError(
  context: string,
  err: unknown,
  detail?: Record<string, unknown>,
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[${context}]`, message);
  try {
    const stack = err instanceof Error ? err.stack : undefined;
    const body = detail ? JSON.stringify(detail) : stack;
    await createAdminClient()
      .from("app_errors")
      .insert({ context, message: message.slice(0, 500), detail: body?.slice(0, 2000) ?? null });
  } catch (e) {
    console.error("[logError] insertion impossible", e);
  }
}
