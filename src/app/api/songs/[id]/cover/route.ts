import { apiError, json, requireUser } from "@/lib/api";
import { setSongCover } from "@/lib/songs";

export const maxDuration = 30;

type Params = { params: Promise<{ id: string }> };

const OK_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/avif"];

/** Le créateur choisit / importe la pochette de sa chanson. */
export async function POST(req: Request, { params }: Params) {
  const { response } = await requireUser();
  if (response) return response;
  const { id } = await params;

  const ct = req.headers.get("content-type") ?? "";

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return apiError("Fichier manquant", 422);
    if (!OK_TYPES.includes(file.type)) return apiError("Format non supporté (JPG, PNG, WEBP, GIF)", 422);
    if (file.size > 8 * 1024 * 1024) return apiError("Image trop lourde (max 8 Mo)", 422);
    const buffer = Buffer.from(await file.arrayBuffer());
    const r = await setSongCover(id, { upload: { buffer, contentType: file.type } });
    if (!r.ok) return apiError(r.error ?? "Impossible", 400);
    return json({ ok: true, coverUrl: r.coverUrl });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Corps JSON invalide");
  }
  const fromUrl = (body as { fromUrl?: unknown }).fromUrl;
  if (typeof fromUrl !== "string") return apiError("« fromUrl » requis", 422);
  const r = await setSongCover(id, { fromUrl });
  if (!r.ok) return apiError(r.error ?? "Impossible", 400);
  return json({ ok: true, coverUrl: r.coverUrl });
}
