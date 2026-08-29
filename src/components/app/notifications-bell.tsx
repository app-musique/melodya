"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import type { AppNotification } from "@/lib/domain";

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

export function NotificationsBell({ initialUnread }: { initialUnread: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const j = await res.json();
      setItems(j.items);
      setUnread(j.unread);
    }
    setLoading(false);
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) await load();
  }

  async function markAll() {
    await fetch("/api/notifications/read", { method: "POST" });
    setUnread(0);
    setItems((its) => its.map((i) => ({ ...i, read_at: new Date().toISOString() })));
  }

  async function openItem(n: AppNotification) {
    if (!n.read_at) {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      });
      setUnread((u) => Math.max(0, u - 1));
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative grid size-9 place-items-center rounded-full border border-line bg-white hover:bg-cream-deep"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-brand-strong px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-strong"
              >
                <Check className="size-3.5" />
                Tout marquer lu
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && <p className="px-4 py-6 text-center text-sm text-ink-soft">Chargement…</p>}
            {!loading && items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-ink-soft">Aucune notification.</p>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => openItem(n)}
                className={`flex w-full flex-col gap-0.5 border-b border-line/60 px-4 py-3 text-left last:border-0 hover:bg-cream-deep ${
                  n.read_at ? "" : "bg-brand/5"
                }`}
              >
                <span className="text-sm font-semibold">{n.title}</span>
                {n.body && <span className="text-xs text-ink-soft">{n.body}</span>}
                <span className="text-[11px] text-ink-soft/70">{timeAgo(n.created_at)}</span>
              </button>
            ))}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-line px-4 py-3 text-center text-sm font-semibold text-brand-strong"
          >
            Voir tout
          </Link>
        </div>
      )}
    </div>
  );
}
