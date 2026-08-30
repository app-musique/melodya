"use client";

import { useState } from "react";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import type { LoyaltyTier } from "@/lib/domain";

type Referral = { referral_referrer_reward: number };

export function LoyaltyEditor({
  initialTiers,
  initialReferral,
}: {
  initialTiers: LoyaltyTier[];
  initialReferral: Referral;
}) {
  const [tiers, setTiers] = useState(initialTiers);
  const [referral, setReferral] = useState(initialReferral);
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function flash(id: string) {
    setSaved(id);
    setTimeout(() => setSaved((s) => (s === id ? null : s)), 2000);
  }

  const patch = (id: string, k: keyof LoyaltyTier, v: LoyaltyTier[keyof LoyaltyTier]) =>
    setTiers((t) => t.map((x) => (x.id === id ? { ...x, [k]: v } : x)));

  async function saveTier(t: LoyaltyTier) {
    setBusy(t.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/loyalty/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: t.name,
          min_songs: t.min_songs,
          discount_pct: t.discount_pct,
          sort_order: t.sort_order,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Échec");
      flash(t.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function addTier() {
    setBusy("new");
    setError(null);
    try {
      const res = await fetch("/api/admin/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Nouveau palier",
          min_songs: 0,
          discount_pct: 0,
          sort_order: tiers.length + 1,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Échec");
      setTiers((t) => [...t, j.tier]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function removeTier(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/loyalty/${id}`, { method: "DELETE" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Échec");
      setTiers((t) => t.filter((x) => x.id !== id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function saveReferral() {
    setBusy("referral");
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(referral),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Échec");
      flash("referral");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <p className="rounded-xl bg-brand/10 px-4 py-3 text-sm text-brand-strong">
        La remise du palier atteint est appliquée <strong>automatiquement</strong> au paiement
        des packs et affichée sur la page crédits. Le palier dépend du nombre de chansons créées.
      </p>

      {error && (
        <p className="rounded-xl bg-brand-strong/10 px-4 py-3 text-sm font-medium text-brand-strong">
          {error}
        </p>
      )}

      {/* Parrainage */}
      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="font-display text-lg font-bold">Parrainage</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Le filleul ne reçoit aucun crédit à l&apos;inscription. Le parrain est crédité
          quand son filleul effectue son premier achat de crédits.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-soft">
              Récompense parrain (crédits)
            </span>
            <input
              type="number"
              min={0}
              value={referral.referral_referrer_reward}
              onChange={(e) =>
                setReferral((r) => ({ ...r, referral_referrer_reward: Number(e.target.value) }))
              }
              className="w-28 rounded-lg border border-line px-3 py-2 text-sm"
            />
          </label>
          <button
            onClick={saveReferral}
            disabled={busy === "referral"}
            className="inline-flex items-center gap-2 rounded-full gradient-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
          >
            {busy === "referral" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : saved === "referral" ? (
              <Check className="size-4" />
            ) : null}
            Enregistrer
          </button>
        </div>
      </section>

      {/* Paliers */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Paliers de fidélité</h2>
          <button
            onClick={addTier}
            disabled={busy === "new"}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold"
          >
            <Plus className="size-4" />
            Ajouter
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {tiers.map((t) => (
            <div key={t.id} className="rounded-2xl border border-line bg-white p-4">
              <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_0.6fr] sm:items-end">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-ink-soft">Nom</span>
                  <input
                    value={t.name}
                    onChange={(e) => patch(t.id, "name", e.target.value)}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-ink-soft">
                    Dès (chansons)
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={t.min_songs}
                    onChange={(e) => patch(t.id, "min_songs", Number(e.target.value))}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-ink-soft">Remise (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={90}
                    value={t.discount_pct}
                    onChange={(e) => patch(t.id, "discount_pct", Number(e.target.value))}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-ink-soft">Ordre</span>
                  <input
                    type="number"
                    min={0}
                    value={t.sort_order}
                    onChange={(e) => patch(t.id, "sort_order", Number(e.target.value))}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() => removeTier(t.id)}
                  disabled={busy === t.id}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-brand-strong"
                >
                  <Trash2 className="size-3.5" />
                  Supprimer
                </button>
                <button
                  onClick={() => saveTier(t)}
                  disabled={busy === t.id}
                  className="ml-auto inline-flex items-center gap-2 rounded-full gradient-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-70"
                >
                  {busy === t.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : saved === t.id ? (
                    <Check className="size-4" />
                  ) : null}
                  Enregistrer
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
