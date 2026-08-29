import { apiError, json } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import {
  creatorIdByHandle,
  followAsEmail,
  followAsUser,
  unfollowAsUser,
} from "@/lib/follows";

type Params = { params: Promise<{ handle: string }> };

/** S'abonner : utilisateur connecté (instantané) ou email (opt-in simple). */
export async function POST(req: Request, { params }: Params) {
  const { handle } = await params;
  const creatorId = await creatorIdByHandle(handle);
  if (!creatorId) return apiError("Créateur introuvable", 404);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const r = await followAsUser(creatorId, user.id);
    if (!r.ok) return apiError(r.error ?? "Impossible", 400);
    return json({ ok: true, following: true, followerCount: r.followerCount });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Email requis", 422);
  }
  const email = (body as { email?: unknown }).email;
  if (typeof email !== "string") return apiError("Email requis", 422);

  const r = await followAsEmail(creatorId, email);
  if (!r.ok) return apiError(r.error ?? "Impossible", 400);
  return json({ ok: true, following: true, followerCount: r.followerCount });
}

/** Se désabonner (utilisateur connecté uniquement ; anonyme = lien email). */
export async function DELETE(_req: Request, { params }: Params) {
  const { handle } = await params;
  const creatorId = await creatorIdByHandle(handle);
  if (!creatorId) return apiError("Créateur introuvable", 404);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("Non authentifié", 401);

  const r = await unfollowAsUser(creatorId, user.id);
  return json({ ok: true, following: false, followerCount: r.followerCount });
}
