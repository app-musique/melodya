"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export function PaymentReturn({ songId, mock }: { songId: string; mock: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"processing" | "ok" | "error">("processing");
  const [message, setMessage] = useState("Nous confirmons ton paiement…");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function run() {
      if (mock) {
        const res = await fetch(`/api/songs/${songId}/confirm-mock-payment`, { method: "POST" });
        const j = await res.json().catch(() => ({}));
        if (res.ok) {
          setState("ok");
          setMessage("Paiement confirmé (mode démo). On lance la création…");
          setTimeout(() => router.push(`/mes-chansons/${songId}`), 1200);
        } else {
          setState("error");
          setMessage(j.error ?? "La confirmation a échoué.");
        }
        return;
      }

      // Paiement réel : on attend que le webhook fasse passer la commande à « payée ».
      for (let i = 0; i < 20; i++) {
        const res = await fetch(`/api/songs/${songId}/status`);
        if (res.ok) {
          const j = await res.json();
          const status = j.song?.status;
          if (["paid", "generating", "ready"].includes(status)) {
            setState("ok");
            setMessage("Paiement confirmé. On lance la création…");
            setTimeout(() => router.push(`/mes-chansons/${songId}`), 1000);
            return;
          }
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      setState("error");
      setMessage(
        "Le paiement n'est pas encore confirmé. Si le montant a été débité, ta chanson apparaîtra dans « Mes chansons » sous quelques minutes.",
      );
    }

    run();
  }, [songId, mock, router]);

  return (
    <div className="w-full max-w-md rounded-3xl border border-line bg-white p-8 text-center shadow-[var(--shadow-soft)]">
      {state === "processing" && <Loader2 className="mx-auto size-10 animate-spin text-brand" />}
      {state === "ok" && <CheckCircle2 className="mx-auto size-10 text-green-600" />}
      {state === "error" && <XCircle className="mx-auto size-10 text-brand-strong" />}
      <p className="mt-4 font-display text-lg font-bold">
        {state === "error" ? "En attente" : "Paiement"}
      </p>
      <p className="mt-2 text-sm text-ink-soft">{message}</p>
      {state === "error" && (
        <button
          onClick={() => router.push("/mes-chansons")}
          className="mt-6 rounded-full gradient-brand px-6 py-3 text-sm font-semibold text-white"
        >
          Aller à mes chansons
        </button>
      )}
    </div>
  );
}
