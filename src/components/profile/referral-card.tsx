"use client";

import { useState } from "react";
import { Check, Copy, Gift } from "lucide-react";

export function ReferralCard({
  code,
  siteUrl,
  filleuls,
  credits,
}: {
  code: string;
  siteUrl: string;
  filleuls: number;
  credits: number;
}) {
  const [copied, setCopied] = useState(false);
  const link = `${siteUrl}/?ref=${code}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Gift className="size-4 text-brand-strong" />
        Parraine tes proches
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        Ils reçoivent des crédits en s&apos;inscrivant, tu es récompensé·e à leur première
        chanson.
      </p>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-cream-deep p-3">
        <input readOnly value={link} className="flex-1 bg-transparent text-xs outline-none" />
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-strong"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copié" : "Copier"}
        </button>
      </div>

      <div className="mt-3 flex gap-6 text-sm">
        <span>
          <b className="font-display text-base">{filleuls}</b>{" "}
          <span className="text-ink-soft">filleul{filleuls === 1 ? "" : "s"}</span>
        </span>
        <span>
          <b className="font-display text-base">{credits}</b>{" "}
          <span className="text-ink-soft">crédit{credits === 1 ? "" : "s"} gagnés</span>
        </span>
      </div>
    </div>
  );
}
