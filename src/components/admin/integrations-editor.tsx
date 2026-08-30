"use client";

import { useState } from "react";
import { Check, ExternalLink, Loader2 } from "lucide-react";

type FacebookState = {
  pixelId: string;
  testEventCode: string;
  capiTokenSet: boolean;
  capiTokenHint: string | null;
  source: "env" | "db" | "none";
  envLocked: boolean;
};

export function IntegrationsEditor({ facebook }: { facebook: FacebookState }) {
  const [fb, setFb] = useState(facebook);
  const [pixelId, setPixelId] = useState(facebook.pixelId);
  const [testCode, setTestCode] = useState(facebook.testEventCode);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, string> = { pixelId, testEventCode: testCode };
      if (token.trim()) payload.capiToken = token.trim();
      const res = await fetch("/api/admin/integrations/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Échec de l'enregistrement");
      setFb(j);
      setPixelId(j.pixelId);
      setTestCode(j.testEventCode);
      setToken("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const active = fb.capiTokenSet && !!fb.pixelId;

  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold">Facebook / Meta Ads</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            active ? "bg-green-100 text-green-800" : "bg-line text-ink-soft"
          }`}
        >
          {active ? "Actif" : fb.pixelId ? "Pixel seul (sans API Conversions)" : "Inactif"}
        </span>
      </div>

      <p className="mt-1 text-sm text-ink-soft">
        Pixel (navigateur) + API Conversions (serveur) pour le suivi des conversions. Événements
        envoyés : PageView, InitiateCheckout, CompleteRegistration, Purchase.
      </p>
      <a
        href="https://www.facebook.com/events_manager2/list/dataset/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-strong"
      >
        Ouvrir le Gestionnaire d&apos;événements Meta
        <ExternalLink className="size-3" />
      </a>

      {fb.envLocked && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          Une variable d&apos;environnement Facebook est définie sur Vercel : elle a la priorité et
          ces champs sont désactivés. Retire-la pour piloter depuis l&apos;admin.
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-brand-strong/10 px-4 py-3 text-sm font-medium text-brand-strong">
          {error}
        </p>
      )}

      <div className="mt-4 space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">
            ID du pixel (Gestionnaire d&apos;événements → ton pixel)
          </span>
          <input
            value={pixelId}
            onChange={(e) => setPixelId(e.target.value)}
            disabled={fb.envLocked}
            placeholder="1234567890123456"
            inputMode="numeric"
            className="w-full max-w-md rounded-lg border border-line px-3 py-2 text-sm disabled:bg-cream-deep"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">
            Jeton d&apos;accès API Conversions (Paramètres du pixel → API Conversions)
          </span>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={fb.envLocked}
            placeholder={
              fb.capiTokenSet ? `Enregistré (${fb.capiTokenHint}) — coller pour remplacer` : "EAAG…"
            }
            autoComplete="off"
            className="w-full max-w-md rounded-lg border border-line px-3 py-2 text-sm disabled:bg-cream-deep"
          />
          <span className="mt-1 block text-[11px] text-ink-soft/80">
            Secret — jamais réaffiché. Laisse vide pour conserver le jeton actuel.
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">
            Code « événement de test » (optionnel, onglet Événements de test)
          </span>
          <input
            value={testCode}
            onChange={(e) => setTestCode(e.target.value)}
            disabled={fb.envLocked}
            placeholder="TEST12345"
            className="w-full max-w-md rounded-lg border border-line px-3 py-2 text-sm disabled:bg-cream-deep"
          />
        </label>
      </div>

      <button
        onClick={save}
        disabled={busy || fb.envLocked}
        className="mt-5 inline-flex items-center gap-2 rounded-full gradient-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : null}
        Enregistrer
      </button>
    </section>
  );
}
