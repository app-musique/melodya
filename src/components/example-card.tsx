"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";

export type Example = {
  title: string;
  subtitle: string;
  style: string;
  tags: string[];
  from: string;
  to: string;
};

const BARS = Array.from({ length: 28 });

export function ExampleCard({ ex }: { ex: Example }) {
  const [playing, setPlaying] = useState(false);

  return (
    <article className="group overflow-hidden rounded-3xl border border-line bg-white shadow-[var(--shadow-soft)]">
      <div
        className="relative aspect-[4/3] p-5"
        style={{ backgroundImage: `linear-gradient(140deg, ${ex.from}, ${ex.to})` }}
      >
        <div className="flex flex-wrap gap-2">
          {ex.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm"
            >
              {t}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setPlaying((v) => !v)}
          className="absolute bottom-5 left-5 grid size-12 place-items-center rounded-full bg-white text-ink shadow-lg transition-transform hover:scale-105"
          aria-label={playing ? "Pause" : "Écouter l'extrait"}
        >
          {playing ? <Pause className="size-5" /> : <Play className="size-5 translate-x-0.5" />}
        </button>

        <div className="absolute bottom-6 right-5 flex h-10 items-end gap-[3px]">
          {BARS.map((_, i) => (
            <span
              key={i}
              className="w-[3px] rounded-full bg-white/80"
              style={{
                height: playing ? `${18 + Math.abs(Math.sin(i * 1.7)) * 78}%` : "22%",
                transition: "height .35s ease",
                animation: playing ? `floaty ${0.6 + (i % 5) * 0.12}s ease-in-out infinite` : "none",
              }}
            />
          ))}
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-display text-lg font-bold">{ex.title}</h3>
        <p className="text-sm text-ink-soft">
          {ex.subtitle} · {ex.style}
        </p>
      </div>
    </article>
  );
}
