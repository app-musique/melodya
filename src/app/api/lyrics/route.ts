import { apiError, json, requireUser } from "@/lib/api";
import { getOwnedSong, updateDraft } from "@/lib/songs";
import { generateLyrics } from "@/lib/lyrics";
import { lyricsRequest } from "@/lib/schemas";
import { MAX_REGENERATIONS } from "@/lib/domain";

export async function POST(req: Request) {
  const { response } = await requireUser();
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Corps JSON invalide");
  }

  const parsed = lyricsRequest.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Requête invalide", 422);
  }

  const song = await getOwnedSong(parsed.data.songId);
  if (!song) return apiError("Chanson introuvable", 404);
  if (!["draft", "pending_payment"].includes(song.status)) {
    return apiError("Cette commande n'est plus modifiable", 409);
  }
  if (!song.story || song.story.trim().length < 20) {
    return apiError("Raconte d'abord l'histoire (étape précédente).", 422);
  }

  if (parsed.data.regenerate && song.regen_count >= MAX_REGENERATIONS) {
    return apiError(
      `Limite de ${MAX_REGENERATIONS} régénérations atteinte. Modifie les paroles à la main si besoin.`,
      429,
    );
  }

  try {
    const { title, lyrics } = await generateLyrics(song, parsed.data.instructions);
    const patch: Record<string, unknown> = {
      lyrics,
      lyrics_approved: false,
    };
    if (parsed.data.regenerate) patch.regen_count = song.regen_count + 1;

    const updated = await updateDraft(song.id, patch);
    return json({ title, lyrics, song: updated });
  } catch (err) {
    return apiError(`Génération des paroles impossible : ${(err as Error).message}`, 502);
  }
}
