import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { AppNotification, NotificationType } from "@/lib/domain";
import { upcomingOccasions } from "@/lib/occasions";

type NotifyInput = {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  dedupeKey?: string;
};

/** Crée une notification (idempotent si dedupeKey fourni). */
export async function notify(userId: string, n: NotifyInput): Promise<void> {
  const admin = createAdminClient();
  if (n.dedupeKey) {
    await admin
      .from("notifications")
      .upsert(
        {
          user_id: userId,
          type: n.type,
          title: n.title,
          body: n.body ?? null,
          link: n.link ?? null,
          dedupe_key: n.dedupeKey,
        },
        { onConflict: "user_id,dedupe_key", ignoreDuplicates: true },
      );
    return;
  }
  await admin.from("notifications").insert({
    user_id: userId,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    link: n.link ?? null,
  });
}

export async function listNotifications(userId: string, limit = 30): Promise<AppNotification[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as AppNotification[]) ?? [];
}

export async function unreadCount(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

export async function markRead(userId: string, ids?: string[]): Promise<void> {
  const supabase = await createServerClient();
  let q = supabase.from("notifications").update({ read_at: new Date().toISOString() });
  q = ids && ids.length ? q.in("id", ids) : q.is("read_at", null);
  await q.eq("user_id", userId);
}

/** Génère les notifications « occasion dans X jours » (dédupliquées par an). */
export async function syncOccasionNotifications(userId: string): Promise<void> {
  const soon = await upcomingOccasions(userId, 60);
  const year = new Date().getFullYear();
  for (const o of soon) {
    if (o.daysUntil > o.notify_days_before || o.daysUntil < 0) continue;
    const who = o.person_name ? ` de ${o.person_name}` : "";
    await notify(userId, {
      type: "occasion_soon",
      title: `${o.label}${who}`,
      body:
        o.daysUntil === 0
          ? "C'est aujourd'hui ! Il est encore temps de créer une chanson."
          : `Dans ${o.daysUntil} jour${o.daysUntil > 1 ? "s" : ""}. Crée une chanson à l'avance.`,
      link: `/commander?occasion=${encodeURIComponent(o.label)}${
        o.person_name ? `&recipient=${encodeURIComponent(o.person_name)}` : ""
      }`,
      dedupeKey: `occasion:${o.id}:${year}`,
    });
  }
}
