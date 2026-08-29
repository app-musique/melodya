import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

const REF_COOKIE = "mel_ref";
const REF_RE = /^[A-Za-z0-9]{4,12}$/;

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  // Capture d'un lien de parrainage (?ref=CODE) → cookie 30 jours.
  const ref = request.nextUrl.searchParams.get("ref");
  if (ref && REF_RE.test(ref) && request.cookies.get(REF_COOKIE)?.value !== ref.toUpperCase()) {
    response.cookies.set(REF_COOKIE, ref.toUpperCase(), {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|samples/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|wav|mp3)$).*)",
  ],
};
