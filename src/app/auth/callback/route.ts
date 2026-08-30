import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/tableau-de-bord";
  const safeNext = next.startsWith("/") ? next : "/tableau-de-bord";

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/connexion?error=${encodeURIComponent(reason)}`);

  // Le fournisseur peut revenir avec une erreur explicite (accès refusé, config…).
  const providerError = searchParams.get("error_description") || searchParams.get("error");
  if (providerError) return fail(providerError);

  const supabase = await createClient();

  // Liens email (confirmation, réinitialisation, magic link, changement d'email) :
  // vérification par token_hash — pas de code_verifier, fonctionne entre appareils.
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return fail(error.message);
    return NextResponse.redirect(`${origin}${safeNext}`);
  }

  // Flux PKCE (OAuth Google, et anciens liens email).
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail(error.message);
    return NextResponse.redirect(`${origin}${safeNext}`);
  }

  return fail("auth");
}
