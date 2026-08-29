"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

export type ShowcaseRow = {
  id: string;
  occasion: string | null;
  recipient_name: string | null;
  music_style: string | null;
  is_showcase: boolean;
  showcase_title: string | null;
  showcase_artist: string | null;
};

export function ShowcaseEditor({ initial }: { initial: ShowcaseRow[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const patch = (id: string, k: keyof ShowcaseRow, v: unknown) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, [k]: v } : x)));

  async function save(row: ShowcaseRow) {
    setBusy(row.id);
    await fetch(`/api/admin/songs/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_showcase: row.is_showcase,
        showcase_title: row.showcase_title ?? "",
        showcase_artist: row.showcase_artist ?? "",
      }),
    });
    setBusy(null);
    setSaved(row.id);
    setTimeout(() => setSaved((s) => (s === row.id ? null : s)), 2000);
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
        Aucune chanson prête. Les vitrines de démo sont insérées par
        <code className="mx-1 rounded bg-cream-deep px-1">npm run seed:showcases</code>.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.id} className="rounded-2xl border border-line bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={row.is_showcase}
                onChange={(e) => patch(row.id, "is_showcase", e.target.checked)}
              />
              Vitrine
            </label>
            <span className="text-xs text-ink-soft">
              {row.occasion ?? "—"} · {row.music_style ?? "—"} ·{" "}
              {row.recipient_name ?? "sans destinataire"}
            </span>
            <button
              onClick={() => save(row)}
              disabled={busy === row.id}
              className="ml-auto inline-flex items-center gap-2 rounded-full gradient-brand px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-70"
            >
              {busy === row.id ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : saved === row.id ? (
                <Check className="size-3.5" />
              ) : null}
              Enregistrer
            </button>
          </div>
          {row.is_showcase && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input
                value={row.showcase_title ?? ""}
                onChange={(e) => patch(row.id, "showcase_title", e.target.value)}
                placeholder="Titre affiché (ex. Joyeux anniversaire)"
                className="rounded-lg border border-line px-3 py-2 text-sm"
              />
              <input
                value={row.showcase_artist ?? ""}
                onChange={(e) => patch(row.id, "showcase_artist", e.target.value)}
                placeholder="Artiste / style affiché (ex. Style Amapiano)"
                className="rounded-lg border border-line px-3 py-2 text-sm"
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
