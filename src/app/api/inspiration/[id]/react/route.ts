import { apiError, json } from "@/lib/api";
import { addShowcaseReaction } from "@/lib/reactions";
import { REACTION_EMOJIS } from "@/lib/domain";

type Params = { params: Promise<{ id: string }> };

/** Réaction publique sur une chanson « s'inspirer » — aucune connexion requise. */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Corps JSON invalide");
  }

  const { emoji, reactorKey, message } = (body ?? {}) as {
    emoji?: unknown;
    reactorKey?: unknown;
    message?: unknown;
  };

  if (typeof emoji !== "string" || !REACTION_EMOJIS.includes(emoji)) {
    return apiError("Emoji non autorisé", 422);
  }
  if (typeof reactorKey !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(reactorKey)) {
    return apiError("Clé auditeur invalide", 422);
  }

  const result = await addShowcaseReaction(id, {
    emoji,
    reactorKey,
    message: typeof message === "string" ? message : undefined,
  });
  if (!result.ok) return apiError(result.error ?? "Impossible", 400);
  return json({ ok: true, summary: result.summary });
}
