import { apiError, json, requireUser } from "@/lib/api";
import { getOwnedSong, setShare } from "@/lib/songs";
import { shareRequest } from "@/lib/schemas";

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
  const parsed = shareRequest.safeParse(body);
  if (!parsed.success) return apiError("Requête invalide", 422);

  const song = await getOwnedSong(id);
  if (!song) return apiError("Chanson introuvable", 404);
  if (song.status !== "ready") return apiError("La chanson n'est pas encore prête", 409);

  try {
    const slug = await setShare(id, parsed.data.is_public);
    return json({ is_public: parsed.data.is_public, slug });
  } catch (err) {
    return apiError((err as Error).message, 500);
  }
}
