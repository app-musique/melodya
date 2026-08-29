import { apiError, json } from "@/lib/api";
import { addReaction } from "@/lib/reactions";
import { reactionSchema } from "@/lib/schemas";
import { REACTION_EMOJIS } from "@/lib/domain";

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Corps JSON invalide");
  }
  const parsed = reactionSchema.safeParse(body);
  if (!parsed.success) return apiError("Réaction invalide", 422);
  if (!REACTION_EMOJIS.includes(parsed.data.emoji)) return apiError("Emoji non autorisé", 422);

  const result = await addReaction(slug, parsed.data);
  if (!result.ok) return apiError(result.error ?? "Impossible", 400);
  return json({ ok: true });
}
