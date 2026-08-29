"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

export function UnsubscribeButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [creator, setCreator] = useState<string | null>(null);

  async function go() {
    setState("busy");
    try {
      const res = await fetch("/api/follow/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error();
      setCreator(j.creatorName ?? null);
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold">
        <Check className="size-4 text-gold" />
        C&apos;est fait — désabonné{creator ? ` de ${creator}` : ""}.
      </p>
    );
  }

  return (
    <div className="mt-6">
      <button
        onClick={go}
        disabled={state === "busy"}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-plum disabled:opacity-70"
      >
        {state === "busy" && <Loader2 className="size-4 animate-spin" />}
        Confirmer le désabonnement
      </button>
      {state === "error" && (
        <p className="mt-3 text-sm text-gold">Lien invalide ou déjà utilisé.</p>
      )}
    </div>
  );
}
