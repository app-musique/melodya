import { apiError, json, requireUser } from "@/lib/api";
import { deletePhoto, ownsSong } from "@/lib/clip";

type Params = { params: Promise<{ id: string; photoId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const { user, response } = await requireUser();
  if (response) return response;
  const { id, photoId } = await params;

  if (!(await ownsSong(user!.id, id))) return apiError("Chanson introuvable", 404);

  await deletePhoto(id, photoId);
  return json({ ok: true });
}
