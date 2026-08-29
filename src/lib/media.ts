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
