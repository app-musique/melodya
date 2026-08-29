import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { listNotifications } from "@/lib/notifications";
import { MarkAllReadButton } from "@/components/app/mark-all-read";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

function label(d: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  const items = await listNotifications(user.id, 100);
  const groups = new Map<string, typeof items>();
  for (const n of items) {
    const k = label(new Date(n.created_at));
    groups.set(k, [...(groups.get(k) ?? []), n]);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:py-10">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight">
          <Bell className="size-6 text-brand-strong" />
          Notifications
        </h1>
        {items.some((n) => !n.read_at) && <MarkAllReadButton />}
      </div>

      {items.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-line bg-white p-10 text-center text-sm text-ink-soft">
          Aucune notification pour l&apos;instant.
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {[...groups.entries()].map(([day, list]) => (
            <div key={day}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{day}</h2>
              <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-white">
                {list.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={n.link ?? "#"}
                      className={`flex flex-col gap-0.5 px-4 py-3 hover:bg-cream-deep ${
                        n.read_at ? "" : "bg-brand/5"
                      }`}
                    >
                      <span className="text-sm font-semibold">{n.title}</span>
                      {n.body && <span className="text-xs text-ink-soft">{n.body}</span>}
                      <span className="text-[11px] text-ink-soft/70">
                        {new Date(n.created_at).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
