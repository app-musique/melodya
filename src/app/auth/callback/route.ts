import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/tableau-de-bord";
  const safeNext = next.startsWith("/") ? next : "/tableau-de-bord";

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/connexion?error=${encodeURIComponent(reason)}`);

  // Le fournisseur peut revenir avec une erreur explicite (accès refusé, config…).
  const providerError = searchParams.get("error_description") || searchParams.get("error");
  if (providerError) return fail(providerError);

  if (!code) return fail("auth");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail(error.message);

  return NextResponse.redirect(`${origin}${safeNext}`);
}
