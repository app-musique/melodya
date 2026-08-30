import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { env, isMockEmail } from "@/lib/env";
import {
  creatorNewSongTpl,
  giftReactionTpl,
  occasionReminderTpl,
  songReadyTpl,
  welcomeTpl,
} from "@/lib/email-templates";

type Mail = { subject: string; html: string; text: string };

const DEFAULT_FROM = "Muzikii <muzikii2026@gmail.com>";

/** `Nom <email@x>` ou `email@x` → { name?, email }. */
function parseSender(raw: string | undefined): { name?: string; email: string } {
  const s = (raw ?? DEFAULT_FROM).trim();
  const m = s.match(/^(.*?)\s*<\s*([^>]+)\s*>$/);
  if (m) return { name: m[1] || undefined, email: m[2].trim() };
  return { email: s };
}

/** Envoi bas niveau via Brevo — no-op + log en mode simulé, erreurs avalées. */
async function send(to: string, mail: Mail): Promise<void> {
  if (isMockEmail) {
    console.log(`[email:mock] → ${to} · ${mail.subject}`);
    return;
  }
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": env.brevoApiKey!,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: parseSender(env.emailFrom),
        to: [{ email: to }],
        replyTo: env.emailReplyTo ? { email: env.emailReplyTo } : undefined,
        subject: mail.subject,
        htmlContent: mail.html,
        textContent: mail.text,
      }),
    });
    if (!res.ok) {
      console.error("[email] brevo", res.status, await res.text().catch(() => ""));
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
  opts: { recipientName: string; title?: string; songId: string },
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

/**
 * Notifie un abonné (connecté ou anonyme) qu'un créateur a publié une chanson.
 * - toUserId : respecte l'opt-out email du profil.
 * - toEmail  : envoi direct (abonné sans compte), avec lien de désabonnement.
 */
export async function sendCreatorNewSongEmail(opts: {
  toUserId?: string | null;
  toEmail?: string | null;
  creatorName: string;
  songTitle: string;
  occasion: string | null;
  songId: string;
  unsubscribeToken: string;
}): Promise<void> {
  const unsubscribeHref = `${env.siteUrl}/desabonnement/${opts.unsubscribeToken}`;
  const mail = creatorNewSongTpl({
    creatorName: opts.creatorName,
    songTitle: opts.songTitle,
    occasion: opts.occasion,
    songId: opts.songId,
    unsubscribeHref,
    siteUrl: env.siteUrl,
  });

  let to: string | null = opts.toEmail ?? null;
  if (opts.toUserId) {
    const r = await recipient(opts.toUserId);
    to = r?.email ?? null;
  }
  if (!to) return;
  await send(to, mail);
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
