"use client";

import { useState } from "react";
import { Loader2, ShieldMinus, ShieldPlus } from "lucide-react";

type AdminRow = { id: string; full_name: string | null; email: string | null };

export function AdminsManager({ initial }: { initial: AdminRow[] }) {
  const [admins, setAdmins] = useState(initial);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/admin/admins");
    if (res.ok) setAdmins((await res.json()).admins);
  }

  async function setAdminFlag(targetEmail: string, makeAdmin: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, make_admin: makeAdmin }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Échec");
      setEmail("");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (email.trim()) setAdminFlag(email.trim(), true);
        }}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-5"
      >
        <label className="block flex-1">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">
            Email d&apos;un utilisateur (déjà inscrit)
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="collegue@exemple.com"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="inline-flex items-center gap-2 rounded-full gradient-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldPlus className="size-4" />}
          Nommer admin
        </button>
      </form>

      {error && (
        <p className="rounded-xl bg-brand-strong/10 px-4 py-3 text-sm font-medium text-brand-strong">
          {error}
        </p>
      )}

      <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
        {admins.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span>
              <span className="block font-medium">{a.full_name || "—"}</span>
              <span className="block text-xs text-ink-soft">{a.email}</span>
            </span>
            {a.email && (
              <button
                onClick={() => setAdminFlag(a.email!, false)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-strong disabled:opacity-50"
              >
                <ShieldMinus className="size-3.5" />
                Retirer
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
