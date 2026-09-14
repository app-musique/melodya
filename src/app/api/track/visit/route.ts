import { json } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/server";

const VISITOR_RE = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * Beacon de tracking (1re partie, anonyme) — alimente Admin › Statistiques.
 * Public (pages non connectées comprises), best-effort : n'échoue jamais
 * bruyamment côté client.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: true });
  }
  const { visitorId, path } = (body ?? {}) as { visitorId?: unknown; path?: unknown };
  if (
    typeof visitorId !== "string" ||
    !VISITOR_RE.test(visitorId) ||
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.length > 300
  ) {
    return json({ ok: true });
  }

  try {
    const user = await getCurrentUser().catch(() => null);
    const admin = createAdminClient();
    await admin.from("page_views").insert({
      visitor_id: visitorId,
      path: path.slice(0, 300),
      user_id: user?.id ?? null,
    });
  } catch {
    // best-effort : une visite non journalisée n'est jamais une erreur produit.
  }

  return json({ ok: true });
}
