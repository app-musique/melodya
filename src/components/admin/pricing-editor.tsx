"use client";

import { useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { formatXOF } from "@/lib/pricing";
import type { CreditPack } from "@/lib/domain";

type Settings = { credits_per_song: number; signup_bonus_credits: number };

export function PricingEditor({
  initialPacks,
  initialSettings,
}: {
  initialPacks: CreditPack[];
  initialSettings: Settings;
}) {
  const [packs, setPacks] = useState(initialPacks);
  const [settings, setSettings] = useState(initialSettings);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function flash(id: string) {
    setSaved(id);
    setTimeout(() => setSaved((s) => (s === id ? null : s)), 2000);
  }

  async function savePack(pack: CreditPack) {
    setBusy(pack.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/packs/${pack.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pack.name,
          credits: pack.credits,
          price: pack.price,
          is_popular: pack.is_popular,
          is_active: pack.is_active,
          sort_order: pack.sort_order,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Échec");
      flash(pack.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function addPack() {
    setBusy("new");
    setError(null);
    try {
      const res = await fetch("/api/admin/packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Nouveau pack",
          credits: 5,
          price: 5000,
          is_popular: false,
          is_active: false,
          sort_order: packs.length + 1,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Échec");
      setPacks((p) => [...p, j.pack]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function saveSettings() {
    setBusy("settings");
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Échec");
      setSettings(j.settings);
      flash("settings");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const patch = (id: string, k: keyof CreditPack, v: CreditPack[keyof CreditPack]) =>
    setPacks((p) => p.map((x) => (x.id === id ? { ...x, [k]: v } : x)));

  return (
    <div className="space-y-8">
      <p className="rounded-xl bg-brand/10 px-4 py-3 text-sm text-brand-strong">
        Les prix enregistrés ici sont appliqués <strong>immédiatement partout</strong> : page
        crédits, tableau de bord et landing.
      </p>

      {error && (
        <p className="rounded-xl bg-brand-strong/10 px-4 py-3 text-sm font-medium text-brand-strong">
          {error}
        </p>
      )}

      {/* Réglages globaux */}
      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="font-display text-lg font-bold">Réglages</h2>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-soft">
              Crédits par chanson
            </span>
            <input
              type="number"
              min={1}
              value={settings.credits_per_song}
              onChange={(e) =>
                setSettings((s) => ({ ...s, credits_per_song: Number(e.target.value) }))
              }
              className="w-28 rounded-lg border border-line px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-soft">
              Crédits offerts à l&apos;inscription
            </span>
            <input
              type="number"
              min={0}
              value={settings.signup_bonus_credits}
              onChange={(e) =>
                setSettings((s) => ({ ...s, signup_bonus_credits: Number(e.target.value) }))
              }
              className="w-28 rounded-lg border border-line px-3 py-2 text-sm"
            />
          </label>
          <button
            onClick={saveSettings}
            disabled={busy === "settings"}
            className="inline-flex items-center gap-2 rounded-full gradient-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
          >
            {busy === "settings" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : saved === "settings" ? (
              <Check className="size-4" />
            ) : null}
            Enregistrer
          </button>
        </div>
      </section>

      {/* Packs */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Packs de crédits</h2>
          <button
            onClick={addPack}
            disabled={busy === "new"}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold"
          >
            <Plus className="size-4" />
            Ajouter
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {packs.map((p) => (
            <div key={p.id} className="rounded-2xl border border-line bg-white p-4">
              <div className="grid gap-3 sm:grid-cols-[1.4fr_0.8fr_1fr_0.6fr] sm:items-end">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-ink-soft">Nom</span>
                  <input
                    value={p.name}
                    onChange={(e) => patch(p.id, "name", e.target.value)}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-ink-soft">Crédits</span>
                  <input
                    type="number"
                    min={1}
                    value={p.credits}
                    onChange={(e) => patch(p.id, "credits", Number(e.target.value))}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-ink-soft">
                    Prix (F CFA)
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={p.price}
                    onChange={(e) => patch(p.id, "price", Number(e.target.value))}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-ink-soft">Ordre</span>
                  <input
                    type="number"
                    min={0}
                    value={p.sort_order}
                    onChange={(e) => patch(p.id, "sort_order", Number(e.target.value))}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={p.is_popular}
                    onChange={(e) => patch(p.id, "is_popular", e.target.checked)}
                  />
                  Populaire
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={p.is_active}
                    onChange={(e) => patch(p.id, "is_active", e.target.checked)}
                  />
                  Actif
                </label>
                <span className="text-xs text-ink-soft">
                  ≈ {formatXOF(Math.round((p.price / Math.max(p.credits, 1)) * settings.credits_per_song))} / chanson
                </span>
                <button
                  onClick={() => savePack(p)}
                  disabled={busy === p.id}
                  className="ml-auto inline-flex items-center gap-2 rounded-full gradient-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-70"
                >
                  {busy === p.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : saved === p.id ? (
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
