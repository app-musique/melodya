import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

const BUCKET = "renders";

/**
 * Télécharge un fichier audio distant et le re-héberge dans Supabase Storage,
 * pour qu'il ne dépende pas d'une URL de fournisseur qui expire.
 * Renvoie l'URL publique persistante (ou l'URL d'origine si l'opération échoue).
 */
export async function persistAudio(
  songId: string,
  idx: number,
  sourceUrl: string,
): Promise<string> {
  // Déjà sur notre domaine / notre stockage : rien à faire.
  if (sourceUrl.startsWith(env.siteUrl) || sourceUrl.includes("/storage/v1/object/")) {
    return sourceUrl;
  }

  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) return sourceUrl;
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = res.headers.get("content-type")?.includes("wav") ? "wav" : "mp3";
    const path = `${songId}/v${idx}.${ext}`;

    const admin = createAdminClient();
    const { error } = await admin.storage
      .from(BUCKET)
      .upload(path, buf, {
        contentType: res.headers.get("content-type") ?? "audio/mpeg",
        upsert: true,
      });
    if (error) return sourceUrl;

    return admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch {
    return sourceUrl;
  }
}

const IMG_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/**
 * Ré-héberge une image distante (pochette fournisseur) dans Supabase Storage.
 * `name` sert de nom de fichier stable (ex. "cover", "cover-v1"). Renvoie l'URL
 * persistante, ou l'URL d'origine en cas d'échec.
 */
export async function persistImage(
  songId: string,
  sourceUrl: string,
  name = "cover",
): Promise<string> {
  if (sourceUrl.startsWith(env.siteUrl) || sourceUrl.includes("/storage/v1/object/")) {
    return sourceUrl;
  }
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) return sourceUrl;
    const type = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "image/jpeg";
    const ext = IMG_EXT[type] ?? "jpg";
    const buf = Buffer.from(await res.arrayBuffer());
    const path = `${songId}/${name}.${ext}`;

    const admin = createAdminClient();
    const { error } = await admin.storage
      .from(BUCKET)
      .upload(path, buf, { contentType: type, upsert: true });
    if (error) return sourceUrl;

    // cache-buster : l'URL change quand le créateur remplace la pochette
    const url = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    return `${url}?t=${Date.now()}`;
  } catch {
    return sourceUrl;
  }
}

/** Enregistre un buffer image (upload créateur) comme pochette de la chanson. */
export async function storeCoverBuffer(
  songId: string,
  buf: Buffer,
  contentType: string,
): Promise<string | null> {
  const ext = IMG_EXT[contentType] ?? "jpg";
  const path = `${songId}/cover-custom.${ext}`;
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, buf, { contentType, upsert: true });
  if (error) return null;
  const url = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return `${url}?t=${Date.now()}`;
}
