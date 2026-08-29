"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { formatXOF, pricePerSong } from "@/lib/pricing";
import type { CreditPack } from "@/lib/domain";

export function PackPicker({
  packs,
  creditsPerSong,
  next,
}: {
  packs: CreditPack[];
  creditsPerSong: number;
  next?: string;
}) {
  const [selected, setSelected] = useState<string | null>(
    packs.find((p) => p.is_popular)?.id ?? packs[0]?.id ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: selected, next }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Paiement impossible");
      window.location.href = j.redirectUrl;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (packs.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
        Aucun pack disponible pour le moment.
      </p>
    );
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        {packs.map((p) => {
          const active = selected === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={`relative rounded-2xl border p-5 text-left transition-colors ${
                active ? "border-brand bg-brand/5" : "border-line bg-white hover:border-brand/40"
              }`}
            >
              {p.is_popular && (
                <span className="absolute -top-2.5 right-4 rounded-full gradient-brand px-2 py-0.5 text-[11px] font-semibold text-white">
                  Populaire
                </span>
              )}
              <span className="block font-display text-lg font-bold">{p.name}</span>
              <span className="mt-1 block text-sm text-ink-soft">{p.credits} crédits</span>
              <span className="mt-3 block font-display text-xl font-extrabold">
                {formatXOF(p.price)}
              </span>
              <span className="mt-1 block text-xs text-ink-soft">
                ≈ {formatXOF(pricePerSong(p.price, p.credits, creditsPerSong))} / chanson
              </span>
              {active && (
                <Check className="absolute bottom-4 right-4 size-4 text-brand-strong" />
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-brand-strong/10 px-4 py-3 text-sm font-medium text-brand-strong">
          {error}
        </p>
      )}

      <button
        onClick={checkout}
        disabled={busy || !selected}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full gradient-brand px-7 py-4 font-semibold text-white shadow-[var(--shadow-float)] disabled:opacity-70 sm:w-auto"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        Payer {selected ? formatXOF(packs.find((p) => p.id === selected)!.price) : ""}
        <ArrowRight className="size-4" />
      </button>
    </div>
  );
}
