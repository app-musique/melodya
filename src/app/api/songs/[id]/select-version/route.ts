import { apiError, json, requireUser } from "@/lib/api";
import { getOwnedSong, selectVersion } from "@/lib/songs";
import { selectVersionRequest } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { response } = await requireUser();
  if (response) return response;
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Corps JSON invalide");
  }
  const parsed = selectVersionRequest.safeParse(body);
  if (!parsed.success) return apiError("Requête invalide", 422);

  const song = await getOwnedSong(id);
  if (!song) return apiError("Chanson introuvable", 404);

  try {
    await selectVersion(id, parsed.data.versionId);
    return json({ ok: true });
  } catch (err) {
    return apiError((err as Error).message, 500);
  }
}
