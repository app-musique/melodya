import { apiError, json, requireUser } from "@/lib/api";
import { addPhoto, getClipEditor, ownsSong } from "@/lib/clip";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { response } = await requireUser();
  if (response) return response;
  const { id } = await params;
  const editor = await getClipEditor(id);
  if (!editor) return apiError("Chanson introuvable", 404);
  return json({ photos: editor.photos });
}

export async function POST(req: Request, { params }: Params) {
  const { user, response } = await requireUser();
  if (response) return response;
  const { id } = await params;

  if (!(await ownsSong(user!.id, id))) return apiError("Chanson introuvable", 404);

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return apiError("Fichier manquant", 422);
  if (!file.type.startsWith("image/")) return apiError("Image attendue", 422);
  if (file.size > 6 * 1024 * 1024) return apiError("Image trop lourde (max 6 Mo)", 422);

  const buf = Buffer.from(await file.arrayBuffer());
  const res = await addPhoto(id, buf, file.type);
  if ("error" in res) return apiError(res.error, 400);
  return json({ photo: res });
}
