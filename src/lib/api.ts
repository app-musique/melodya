import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Renvoie l'utilisateur connecté, sinon une réponse 401 à retourner directement. */
export async function requireUser() {
  if (!isSupabaseConfigured) {
    return { user: null, response: apiError("Supabase non configuré", 503) as NextResponse };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, response: apiError("Non authentifié", 401) as NextResponse };
  }
  return { user, response: null };
}

/** Comme requireUser mais exige aussi profiles.is_admin. */
export async function requireAdmin() {
  const { user, response } = await requireUser();
  if (response) return { user: null, response };

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user!.id)
    .maybeSingle();

  if (!data || !(data as { is_admin: boolean }).is_admin) {
    return { user: null, response: apiError("Accès réservé", 403) as NextResponse };
  }
  return { user, response: null };
}
