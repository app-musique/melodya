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
