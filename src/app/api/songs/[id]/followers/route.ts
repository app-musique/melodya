import { after } from "next/server";
import { apiError, json, requireUser } from "@/lib/api";
import { fanOutNewSong, setSongSharedWithFollowers } from "@/lib/follows";
import { logError } from "@/lib/errors";

export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

/** Le créateur (dé)partage sa chanson avec ses abonnés. */
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
  const on = (body as { shared?: unknown }).shared;
  if (typeof on !== "boolean") return apiError("Paramètre « shared » requis", 422);

  const r = await setSongSharedWithFollowers(id, on);
  if (!r.ok) return apiError(r.error ?? "Impossible", 400);

  if (r.fanOut) {
    after(async () => {
      try {
        await fanOutNewSong(id);
      } catch (e) {
        await logError("fanOutNewSong", e, { songId: id });
      }
    });
  }

  return json({ ok: true, shared: on });
}
