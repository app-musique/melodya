import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export const FACEBOOK_TAG = "integration-facebook";

const FB_KEYS = {
  pixelId: "facebook_pixel_id",
  capiToken: "facebook_capi_token",
  testEventCode: "facebook_test_event_code",
} as const;

export type FacebookConfig = {
  pixelId: string | null;
  capiToken: string | null;
  testEventCode: string | null;
  /** Origine de la config : variables d'env (Vercel) ou réglages admin (DB). */
  source: "env" | "db" | "none";
};

async function readFacebookFromDb(): Promise<Omit<FacebookConfig, "source">> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("integration_settings")
      .select("key, value")
      .in("key", Object.values(FB_KEYS));
    const map = new Map(
      ((data as { key: string; value: string | null }[]) ?? []).map((r) => [
        r.key,
        r.value?.trim() || null,
      ]),
    );
    return {
      pixelId: map.get(FB_KEYS.pixelId) ?? null,
      capiToken: map.get(FB_KEYS.capiToken) ?? null,
      testEventCode: map.get(FB_KEYS.testEventCode) ?? null,
    };
  } catch {
    return { pixelId: null, capiToken: null, testEventCode: null };
  }
}

const getFacebookFromDbCached = unstable_cache(readFacebookFromDb, ["integration-facebook"], {
  tags: [FACEBOOK_TAG],
  revalidate: 300,
});

/**
 * Config Facebook effective. Priorité aux variables d'env (override / dev local),
 * sinon aux réglages saisis dans /admin/integrations.
 */
export async function getFacebookConfig(): Promise<FacebookConfig> {
  if (env.facebookPixelId || env.facebookCapiToken) {
    return {
      pixelId: env.facebookPixelId ?? null,
      capiToken: env.facebookCapiToken ?? null,
      testEventCode: env.facebookTestEventCode ?? null,
      source: "env",
    };
  }
  const db = await getFacebookFromDbCached();
  const has = db.pixelId || db.capiToken;
  return { ...db, source: has ? "db" : "none" };
}

export async function setFacebookConfig(input: {
  pixelId?: string;
  capiToken?: string;
  testEventCode?: string;
}): Promise<void> {
  const admin = createAdminClient();
  const rows: { key: string; value: string; updated_at: string }[] = [];
  const now = new Date().toISOString();
  if (input.pixelId !== undefined)
    rows.push({ key: FB_KEYS.pixelId, value: input.pixelId.trim(), updated_at: now });
  if (input.capiToken !== undefined)
    rows.push({ key: FB_KEYS.capiToken, value: input.capiToken.trim(), updated_at: now });
  if (input.testEventCode !== undefined)
    rows.push({ key: FB_KEYS.testEventCode, value: input.testEventCode.trim(), updated_at: now });
  if (rows.length) {
    await admin.from("integration_settings").upsert(rows, { onConflict: "key" });
  }
}
