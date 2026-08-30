import { after } from "next/server";
import { apiError, json, requireUser } from "@/lib/api";
import { getOwnedSong, setShare } from "@/lib/songs";
import { fanOutNewSong, setSongSharedWithFollowers } from "@/lib/follows";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/errors";

export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

/**
 * Réglages de visibilité d'une chanson depuis « Mes chansons » :
 * - in_explore : apparaître dans la section Inspiration (défaut vrai)
 * - shared_with_followers : visible par les abonnés (+ notification)
 * - is_public : lien de partage / page cadeau
 */
export async function POST(req: Request, { params }: Params) {
  const { user, response } = await requireUser();
  if (response) return response;
  const { id } = await params;

  const song = await getOwnedSong(id);
  if (!song || song.user_id !== user!.id) return apiError("Chanson introuvable", 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Corps JSON invalide");
  }
  const b = (body ?? {}) as {
    in_explore?: unknown;
    shared_with_followers?: unknown;
    is_public?: unknown;
  };

  const out: Record<string, unknown> = { ok: true };

  if (typeof b.in_explore === "boolean") {
    const admin = createAdminClient();
    await admin
      .from("songs")
      .update({ in_explore: b.in_explore })
      .eq("id", id)
      .eq("user_id", user!.id);
    out.in_explore = b.in_explore;
  }

  if (typeof b.shared_with_followers === "boolean") {
    const r = await setSongSharedWithFollowers(id, b.shared_with_followers);
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
    out.shared_with_followers = b.shared_with_followers;
  }

  if (typeof b.is_public === "boolean") {
    if (song.status !== "ready") return apiError("La chanson n'est pas encore prête", 409);
    try {
      const slug = await setShare(id, b.is_public);
      out.is_public = b.is_public;
      out.slug = slug;
    } catch (e) {
      return apiError((e as Error).message, 500);
    }
  }

  return json(out);
}
