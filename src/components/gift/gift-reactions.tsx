"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { REACTION_EMOJIS, type GiftReaction } from "@/lib/domain";

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return "à l'instant";
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

export function GiftReactions({
  slug,
  initial,
}: {
  slug: string;
  initial: GiftReaction[];
}) {
  const [reactions, setReactions] = useState(initial);
  const [emoji, setEmoji] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!emoji) {
      setError("Choisis une réaction");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/gift/${slug}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji, message: message.trim(), authorName: name.trim() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Impossible d'envoyer");
      setReactions((r) => [
        {
          id: crypto.randomUUID(),
          song_id: "",
          emoji,
          message: message.trim() || null,
          author_name: name.trim() || null,
          created_at: new Date().toISOString(),
        },
        ...r,
      ]);
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur-sm">
      {done ? (
        <p className="text-center text-sm font-semibold text-gold">
          Merci ! Ta réaction a été transmise 💛
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <p className="text-center text-sm font-semibold">Laisse un mot</p>
          <div className="flex justify-center gap-2">
            {REACTION_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`grid size-11 place-items-center rounded-full text-xl transition-transform ${
                  emoji === e ? "scale-110 bg-white/20 ring-2 ring-gold" : "bg-white/10 hover:scale-105"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <textarea
            value={message}
            onChange={(ev) => setMessage(ev.target.value)}
            rows={2}
            maxLength={280}
            placeholder="Un petit message (optionnel)"
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-cream/40 outline-none focus:border-gold"
          />
          <input
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            maxLength={60}
            placeholder="Ton prénom (optionnel)"
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-cream/40 outline-none focus:border-gold"
          />
          {error && <p className="text-sm text-gold">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-plum disabled:opacity-70"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Envoyer
          </button>
        </form>
      )}

      {reactions.length > 0 && (
        <ul className="mt-6 space-y-3 border-t border-white/10 pt-5">
          {reactions.map((r) => (
            <li key={r.id} className="flex gap-3 text-sm">
              <span className="text-xl">{r.emoji}</span>
              <span className="min-w-0">
                {r.message && <span className="block text-cream/90">« {r.message} »</span>}
                <span className="text-xs text-cream/50">
                  {r.author_name || "Anonyme"} · {timeAgo(r.created_at)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
