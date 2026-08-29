import "server-only";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { attachReferral } from "@/lib/referral";
import { syncOccasionNotifications } from "@/lib/notifications";
import { sendWelcomeEmail } from "@/lib/email";

/**
 * Tâches légères déclenchées à chaque entrée dans l'app (layout `(app)`).
 * Chacune est indépendante et tolère l'échec.
 */
export async function onAppEnter(userId: string): Promise<void> {
  await Promise.allSettled([
    syncOccasionNotifications(userId),
    consumeReferralCookie(),
    maybeWelcome(userId),
  ]);
}

async function consumeReferralCookie(): Promise<void> {
  const code = (await cookies()).get("mel_ref")?.value;
  if (!code) return;
  await attachReferral(code);
}

async function maybeWelcome(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("welcomed_at")
    .eq("id", userId)
    .maybeSingle();
  if (!data || (data as { welcomed_at: string | null }).welcomed_at) return;

  // Marque d'abord (évite les doublons si l'appel est concurrent), puis envoie.
  const { data: claimed } = await admin
    .from("profiles")
    .update({ welcomed_at: new Date().toISOString() })
    .eq("id", userId)
    .is("welcomed_at", null)
    .select("id")
    .maybeSingle();
  if (!claimed) return;

  await sendWelcomeEmail(userId).catch(() => {});
}
