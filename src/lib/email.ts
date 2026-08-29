import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { env, isMockEmail } from "@/lib/env";
import {
  giftReactionTpl,
  occasionReminderTpl,
  songReadyTpl,
  welcomeTpl,
} from "@/lib/email-templates";

const FROM = process.env.EMAIL_FROM?.trim() || "Melodya <onboarding@resend.dev>";
const REPLY_TO = process.env.EMAIL_REPLY_TO?.trim() || undefined;

type Mail = { subject: string; html: string; text: string };

/** Envoi bas niveau — no-op + log en mode simulé, erreurs avalées. */
async function send(to: string, mail: Mail): Promise<void> {
  if (isMockEmail) {
    console.log(`[email:mock] → ${to} · ${mail.subject}`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to,
        reply_to: REPLY_TO,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }),
    });
    if (!res.ok) {
      console.error("[email] resend", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("[email] exception", (err as Error).message);
  }
}

/** Destinataire d'un email transactionnel : null si opt-out ou email introuvable. */
async function recipient(userId: string): Promise<{ email: string; name: string } | null> {
  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("profiles")
    .select("full_name, email_notifications")
    .eq("id", userId)
    .maybeSingle();
  if (prof && (prof as { email_notifications: boolean }).email_notifications === false) {
    return null;
  }
  const { data } = await admin.auth.admin.getUserById(userId);
  const email = data?.user?.email;
  if (!email) return null;
  const full = (prof as { full_name: string | null } | null)?.full_name ?? "";
  return { email, name: full.split(" ")[0] || "" };
}

export async function sendWelcomeEmail(userId: string): Promise<void> {
  const r = await recipient(userId);
  if (!r) return;
  await send(r.email, welcomeTpl({ name: r.name, siteUrl: env.siteUrl }));
}

export async function sendSongReadyEmail(
  userId: string,
  opts: { recipientName: string; songId: string },
): Promise<void> {
  const r = await recipient(userId);
  if (!r) return;
  await send(
    r.email,
    songReadyTpl({ name: r.name, siteUrl: env.siteUrl, ...opts }),
  );
}

export async function sendGiftReactionEmail(
  userId: string,
  opts: { authorName: string; emoji: string; message: string | null; songId: string },
): Promise<void> {
  const r = await recipient(userId);
  if (!r) return;
  await send(
    r.email,
    giftReactionTpl({ name: r.name, siteUrl: env.siteUrl, ...opts }),
  );
}

export async function sendOccasionReminderEmail(
  userId: string,
  opts: { label: string; personName: string | null; daysUntil: number; link: string },
): Promise<void> {
  const r = await recipient(userId);
  if (!r) return;
  await send(
    r.email,
    occasionReminderTpl({ name: r.name, siteUrl: env.siteUrl, ...opts }),
  );
}
