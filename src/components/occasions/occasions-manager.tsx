"use client";

import { useState } from "react";
import { CalendarHeart, Loader2, Plus, Trash2 } from "lucide-react";
import { Button, SelectField, TextField } from "@/components/ui";
import { RELATIONSHIPS, type Occasion } from "@/lib/domain";
import { occasions as OCCASION_LABELS } from "@/lib/site";

type Draft = {
  label: string;
  person_name: string;
  relationship: string;
  event_date: string;
  is_recurring: boolean;
  notify_days_before: number;
};

const empty: Draft = {
  label: "",
  person_name: "",
  relationship: "",
  event_date: "",
  is_recurring: true,
  notify_days_before: 7,
};

function daysUntil(dateStr: string, recurring: boolean) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const base = new Date(dateStr + "T00:00:00");
  let next = base;
  if (recurring) {
    next = new Date(today.getFullYear(), base.getMonth(), base.getDate());
    if (next < today) next.setFullYear(today.getFullYear() + 1);
  }
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

export function OccasionsManager({ initial }: { initial: Occasion[] }) {
  const [list, setList] = useState(initial);
  const [draft, setDraft] = useState<Draft>(empty);
  const [showForm, setShowForm] = useState(initial.length === 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/occasions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Échec");
      setList((l) =>
        [...l, j.occasion].sort((a, b) => a.event_date.localeCompare(b.event_date)),
      );
      setDraft(empty);
      setShowForm(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setList((l) => l.filter((o) => o.id !== id));
    await fetch(`/api/occasions/${id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-6">
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-full gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-float)]"
        >
          <Plus className="size-4" />
          Ajouter une date
        </button>
      )}

      {showForm && (
        <form onSubmit={add} className="space-y-4 rounded-3xl border border-line bg-white p-6">
          <h2 className="font-display text-lg font-bold">Nouvelle occasion</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Occasion" value={draft.label} onChange={(e) => set("label", e.target.value)}>
              <option value="">— Choisir —</option>
              {OCCASION_LABELS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Pour qui ?"
              value={draft.person_name}
              onChange={(e) => set("person_name", e.target.value)}
              placeholder="Ex. Maman"
            />
            <SelectField
              label="Relation"
              value={draft.relationship}
              onChange={(e) => set("relationship", e.target.value)}
            >
              <option value="">— Choisir —</option>
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Date"
              type="date"
              value={draft.event_date}
              onChange={(e) => set("event_date", e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.is_recurring}
                onChange={(e) => set("is_recurring", e.target.checked)}
              />
              Chaque année
            </label>
            <label className="flex items-center gap-2">
              Me prévenir
              <input
                type="number"
                min={0}
                max={90}
                value={draft.notify_days_before}
                onChange={(e) => set("notify_days_before", Number(e.target.value))}
                className="w-16 rounded-lg border border-line px-2 py-1"
              />
              jours avant
            </label>
          </div>
          {error && <p className="text-sm font-medium text-brand-strong">{error}</p>}
          <div className="flex gap-3">
            <Button loading={busy} type="submit">
              {busy && <Loader2 className="size-4 animate-spin" />}
              Enregistrer
            </Button>
            {list.length > 0 && (
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
            )}
          </div>
        </form>
      )}

      {list.length > 0 && (
        <ul className="space-y-2">
          {list.map((o) => {
            const d = daysUntil(o.event_date, o.is_recurring);
            return (
              <li
                key={o.id}
                className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cream-deep text-brand-strong">
                  <CalendarHeart className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {o.label}
                    {o.person_name ? ` · ${o.person_name}` : ""}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {d === 0 ? "Aujourd'hui" : d === 1 ? "Demain" : `Dans ${d} jours`}
                    {o.is_recurring ? " · chaque année" : ""}
                  </p>
                </div>
                <a
                  href={`/commander?occasion=${encodeURIComponent(o.label)}${
                    o.person_name ? `&recipient=${encodeURIComponent(o.person_name)}` : ""
                  }`}
                  className="rounded-full gradient-brand px-4 py-2 text-xs font-semibold text-white"
                >
                  Créer
                </a>
                <button
                  onClick={() => remove(o.id)}
                  className="text-ink-soft hover:text-brand-strong"
                  aria-label="Supprimer"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
