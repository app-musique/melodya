"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { AdminPaymentRow } from "@/lib/admin";
import { formatXOF } from "@/lib/pricing";

const STATUS_STYLE: Record<string, string> = {
  success: "bg-green-100 text-green-800",
  initiated: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-700",
};

export function PaymentsTable({ rows }: { rows: AdminPaymentRow[] }) {
  const [items, setItems] = useState(rows);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggleTest(id: string, next: boolean) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/payments/${id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_test: next }),
      });
      if (res.ok) {
        setItems((list) => list.map((p) => (p.id === id ? { ...p, is_test: next } : p)));
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold">Client</th>
            <th className="px-4 py-3 font-semibold">Pack</th>
            <th className="px-4 py-3 font-semibold">Montant</th>
            <th className="px-4 py-3 font-semibold">Crédits</th>
            <th className="px-4 py-3 font-semibold">Moyen</th>
            <th className="px-4 py-3 font-semibold">Statut</th>
            <th className="px-4 py-3 font-semibold">Réf.</th>
            <th className="px-4 py-3 font-semibold">Test</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr
              key={p.id}
              className={`border-b border-line/60 last:border-0 ${p.is_test ? "opacity-55" : ""}`}
            >
              <td className="px-4 py-3 whitespace-nowrap text-ink-soft">
                {new Date(p.created_at).toLocaleString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="px-4 py-3">{p.email ?? "—"}</td>
              <td className="px-4 py-3">{p.packName ?? "—"}</td>
              <td className="px-4 py-3 font-medium">{formatXOF(p.amount)}</td>
              <td className="px-4 py-3">{p.credits ?? "—"}</td>
              <td className="px-4 py-3 text-ink-soft">{p.method ?? "—"}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    STATUS_STYLE[p.status] ?? "bg-line text-ink-soft"
                  }`}
                >
                  {p.status}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-ink-soft">{p.provider_ref ?? "—"}</td>
              <td className="px-4 py-3">
                <button
                  onClick={() => toggleTest(p.id, !p.is_test)}
                  disabled={busy === p.id}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    p.is_test
                      ? "border-brand/40 bg-brand/10 text-brand-strong"
                      : "border-line text-ink-soft hover:border-brand/40"
                  }`}
                >
                  {busy === p.id && <Loader2 className="size-3 animate-spin" />}
                  {p.is_test ? "Test" : "Réel"}
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-8 text-center text-ink-soft">
                Aucun achat pour le moment.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
