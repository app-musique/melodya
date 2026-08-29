import { apiError, json } from "@/lib/api";
import { unsubscribeByToken } from "@/lib/follows";

/** Désabonnement via le lien contenu dans les emails (POST → pas de scanner). */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Token requis", 422);
  }
  const token = (body as { token?: unknown }).token;
  if (typeof token !== "string") return apiError("Token requis", 422);

  const r = await unsubscribeByToken(token);
  if (!r.ok) return apiError("Lien invalide", 400);
  return json({ ok: true, creatorName: r.creatorName ?? null });
}
