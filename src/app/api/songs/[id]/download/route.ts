import { apiError, requireUser } from "@/lib/api";
import { getSongBundle } from "@/lib/songs";

type Params = { params: Promise<{ id: string }> };

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 40);
}

export async function GET(req: Request, { params }: Params) {
  const { response } = await requireUser();
  if (response) return response;
  const { id } = await params;

  const bundle = await getSongBundle(id);
  if (!bundle) return apiError("Chanson introuvable", 404);

  const url = new URL(req.url);
  const versionId = url.searchParams.get("v");
  const version =
    bundle.versions.find((v) => v.id === versionId) ??
    bundle.versions.find((v) => v.is_selected) ??
    bundle.versions[0];

  if (!version) return apiError("Aucune version disponible", 404);

  const upstream = await fetch(version.audio_url);
  if (!upstream.ok || !upstream.body) {
    return apiError("Fichier audio indisponible", 502);
  }

  const ext = version.audio_url.split(".").pop()?.split("?")[0] || "mp3";
  const base = slugify(
    `${bundle.song.recipient_name ?? "muzikii"}-${bundle.song.occasion ?? ""}`,
  ) || "muzikii";
  const filename = `${base}-v${version.idx}.${ext}`;

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
