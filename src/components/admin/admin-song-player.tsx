"use client";

import { useState } from "react";
import type { SongVersion } from "@/lib/domain";

function fmt(sec: number | null): string {
  if (!sec && sec !== 0) return "";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AdminSongPlayer({ versions }: { versions: SongVersion[] }) {
  const playable = versions.filter((v) => v.audio_url);
  const [active, setActive] = useState(
    playable.findIndex((v) => v.is_selected) >= 0
      ? playable.findIndex((v) => v.is_selected)
      : 0,
  );

  if (playable.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white p-5 text-sm text-ink-soft">
        Aucune version audio disponible.
      </div>
    );
  }

  const cur = playable[active];

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      {playable.length > 1 && (
        <div className="mb-3 flex gap-2">
          {playable.map((v, i) => (
            <button
              key={v.id}
              onClick={() => setActive(i)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                i === active
                  ? "border-brand bg-brand/10 text-brand-strong"
                  : "border-line text-ink-soft"
              }`}
            >
              Version {i + 1}
              {v.is_selected ? " ★" : ""}
              {v.duration_sec ? ` · ${fmt(v.duration_sec)}` : ""}
            </button>
          ))}
        </div>
      )}
      <audio key={cur.id} controls src={cur.audio_url} className="w-full" />
      <p className="mt-2 break-all text-[11px] text-ink-soft/70">{cur.audio_url}</p>
    </div>
  );
}
