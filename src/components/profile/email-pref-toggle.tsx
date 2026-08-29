"use client";

import { useState } from "react";
import { Bell, Loader2 } from "lucide-react";

export function EmailPrefToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle(value: boolean) {
    setBusy(true);
    const prev = on;
    setOn(value);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_notifications: value }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setOn(prev);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4">
      <span className="flex items-center gap-3">
        <Bell className="size-4 text-ink-soft" />
        <span className="text-sm font-medium">Emails (chanson prête, réactions, rappels)</span>
      </span>
      <label className="inline-flex cursor-pointer items-center gap-2">
        {busy && <Loader2 className="size-3.5 animate-spin text-ink-soft" />}
        <input
          type="checkbox"
          checked={on}
          disabled={busy}
          onChange={(e) => toggle(e.target.checked)}
          className="size-4"
        />
      </label>
    </div>
  );
}
