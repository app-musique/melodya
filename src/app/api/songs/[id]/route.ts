import { apiError, json, requireUser } from "@/lib/api";
import { getOwnedSong, recomputePrice, updateDraft } from "@/lib/songs";
import { songDraftPatch } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { response } = await requireUser();
  if (response) return response;
  const { id } = await params;
  const song = await getOwnedSong(id);
  if (!song) return apiError("Chanson introuvable", 404);
  return json({ song });
}

export async function PATCH(req: Request, { params }: Params) {
  const { response } = await requireUser();
  if (response) return response;
  const { id } = await params;

  const existing = await getOwnedSong(id);
  if (!existing) return apiError("Chanson introuvable", 404);
  if (!["draft", "pending_payment"].includes(existing.status)) {
    return apiError("Cette commande n'est plus modifiable", 409);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Corps JSON invalide");
  }

  const parsed = songDraftPatch.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Données invalides", 422);
  }

  const patch: Record<string, unknown> = { ...parsed.data };

  // Si on modifie le brief, les paroles ne sont plus « validées ».
  const briefKeys = [
    "occasion",
    "recipient_name",
    "sender_name",
    "relationship",
    "story",
    "key_facts",
    "music_style",
    "voice",
    "mood",
    "language",
  ];
  if (briefKeys.some((k) => k in patch)) {
    patch.lyrics_approved = patch.lyrics_approved ?? false;
  }

  if ("addons" in patch) {
    patch.price_total = recomputePrice({ ...existing, addons: parsed.data.addons ?? [] });
  }

  try {
    const song = await updateDraft(id, patch);
    return json({ song });
  } catch (err) {
    return apiError((err as Error).message, 500);
  }
}
