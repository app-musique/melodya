import { env } from "@/lib/env";

/**
 * Proxy image même origine — évite de « teinter » le canvas du Studio clip lors
 * de l'enregistrement vidéo. N'autorise que le Storage public Supabase et nos
 * pochettes générées.
 */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("u");
  if (!u) return new Response("bad request", { status: 400 });

  let target: URL;
  try {
    target = new URL(u);
  } catch {
    return new Response("bad url", { status: 400 });
  }

  const supaHost = env.supabaseUrl ? new URL(env.supabaseUrl).host : null;
  const siteHost = (() => {
    try {
      return new URL(env.siteUrl).host;
    } catch {
      return null;
    }
  })();

  const allowed =
    (!!supaHost &&
      target.host === supaHost &&
      target.pathname.startsWith("/storage/v1/object/public/")) ||
    (!!siteHost && target.host === siteHost && target.pathname.startsWith("/api/cover/"));

  if (!allowed) return new Response("forbidden", { status: 403 });

  const upstream = await fetch(target.toString());
  if (!upstream.ok || !upstream.body) {
    return new Response("upstream error", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
