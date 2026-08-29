"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";

export function MarkAllReadButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/notifications/read", { method: "POST" });
        router.refresh();
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
    >
      <Check className="size-3.5" />
      Tout marquer lu
    </button>
  );
}
