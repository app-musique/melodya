import { revalidateTag } from "next/cache";
import { z } from "zod";
import { apiError, json, requireAdmin } from "@/lib/api";
import { env } from "@/lib/env";
import { FACEBOOK_TAG, getFacebookConfig, setFacebookConfig } from "@/lib/integrations";

const schema = z.object({
  pixelId: z
    .string()
    .trim()
    .regex(/^\d{6,20}$/u, "L'ID du pixel doit être un nombre (15–16 chiffres).")
    .or(z.literal("")),
  capiToken: z
    .string()
    .trim()
    .max(500)
    .regex(/^[A-Za-z0-9._-]+$/u, "Jeton invalide.")
    .or(z.literal("")),
  testEventCode: z
    .string()
    .trim()
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/u, "Code invalide.")
    .or(z.literal("")),
});

const hint = (v: string | null) => (v && v.length > 4 ? `••••${v.slice(-4)}` : v ? "••••" : null);

async function currentState() {
  const cfg = await getFacebookConfig();
  return {
    pixelId: cfg.pixelId ?? "",
    testEventCode: cfg.testEventCode ?? "",
    capiTokenSet: !!cfg.capiToken,
    capiTokenHint: hint(cfg.capiToken),
    source: cfg.source,
    envLocked: !!(env.facebookPixelId || env.facebookCapiToken),
  };
}

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  return json(await currentState());
}

export async function POST(req: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  if (env.facebookPixelId || env.facebookCapiToken) {
    return apiError(
      "Une variable d'environnement Facebook est définie sur Vercel : elle a la priorité. Retire-la pour piloter depuis l'admin.",
      409,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Corps JSON invalide");
  }
  const parsed = schema.partial().safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Requête invalide", 422);
  }

  // On n'écrase le jeton que si une nouvelle valeur non vide est fournie
  // (l'UI n'envoie jamais le jeton existant en clair).
  const patch: { pixelId?: string; capiToken?: string; testEventCode?: string } = {};
  if (parsed.data.pixelId !== undefined) patch.pixelId = parsed.data.pixelId;
  if (parsed.data.testEventCode !== undefined) patch.testEventCode = parsed.data.testEventCode;
  if (typeof parsed.data.capiToken === "string" && parsed.data.capiToken !== "") {
    patch.capiToken = parsed.data.capiToken;
  }

  await setFacebookConfig(patch);
  revalidateTag(FACEBOOK_TAG, { expire: 0 });

  return json(await currentState());
}

export async function DELETE() {
  const { response } = await requireAdmin();
  if (response) return response;
  await setFacebookConfig({ pixelId: "", capiToken: "", testEventCode: "" });
  revalidateTag(FACEBOOK_TAG, { expire: 0 });
  return json(await currentState());
}
