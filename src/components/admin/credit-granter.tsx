"use client";

import { useState } from "react";
import { Check, Coins, Loader2 } from "lucide-react";

export function CreditGranter() {
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("30");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), amount: Number(amount) }),
      });
      const j = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: j.error ?? "Échec" });
        return;
      }
      setMsg({
        ok: true,
        text: `${j.amount > 0 ? "+" : ""}${j.amount} crédit${Math.abs(j.amount) > 1 ? "s" : ""} pour ${j.email} — nouveau solde : ${j.balance}.`,
      });
      setEmail("");
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <Coins className="size-5 text-gold" />
        Créditer un compte
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Ajoute (ou retire, avec un montant négatif) des crédits au compte d&apos;un utilisateur.
        Enregistré comme « Ajustement » dans son historique.
      </p>

      <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block flex-1 min-w-[220px]">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Email du compte</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nom@exemple.com"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Crédits</span>
          <input
            type="number"
            required
            step={1}
            min={-1000}
            max={1000}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28 rounded-lg border border-line px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full gradient-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Créditer
        </button>
      </form>

      {msg && (
        <p
          className={`mt-3 rounded-xl px-4 py-2.5 text-sm font-medium ${
            msg.ok ? "bg-green-50 text-green-800" : "bg-brand-strong/10 text-brand-strong"
          }`}
        >
          {msg.text}
        </p>
      )}
    </section>
  );
}
