import { json } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { advanceGeneration, syncSongAssets } from "@/lib/songs";
import { logError } from "@/lib/errors";
import { env } from "@/lib/env";

export const maxDuration = 60;

/**
 * Filet de sécurité (Vercel Cron, cf. vercel.json) : rattrape les générations
 * dont ni le polling ni le webhook n'ont abouti (onglet fermé, webhook KO).
 * Inactif tant que CRON_SECRET n'est pas défini.
 */
export async function GET(req: Request) {
  if (!env.cronSecret || req.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
    return json({ error: "unauthorized" }, 401);
  }

  const admin = createAdminClient();
  let advanced = 0;
  let synced = 0;

  const { data: generating } = await admin
    .from("songs")
    .select("id")
    .eq("status", "generating")
    .limit(50);
  for (const s of (generating as { id: string }[]) ?? []) {
    try {
      await advanceGeneration(s.id);
      advanced += 1;
    } catch (e) {
      await logError("cron.advance", e, { songId: s.id });
    }
  }

  const { data: pending } = await admin
    .from("songs")
    .select("id")
    .eq("status", "ready")
    .is("assets_synced_at", null)
    .limit(20);
  for (const s of (pending as { id: string }[]) ?? []) {
    try {
      await syncSongAssets(s.id);
      synced += 1;
    } catch (e) {
      await logError("cron.sync", e, { songId: s.id });
    }
  }

  return json({ ok: true, advanced, synced });
}
