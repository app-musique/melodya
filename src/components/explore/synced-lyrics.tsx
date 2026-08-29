"use client";

import { useEffect, useMemo, useRef } from "react";
import type { LyricsTiming } from "@/lib/domain";

type Line = { text: string; isSection: boolean; t: number | null };

/** Paroles qui défilent et se surlignent au fil de la lecture. */
export function SyncedLyrics({
  lyrics,
  timing,
  currentTime,
  duration,
}: {
  lyrics: string;
  timing: LyricsTiming | null;
  currentTime: number;
  duration: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLParagraphElement>(null);

  const lines: Line[] = useMemo(() => {
    const raw = lyrics
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const parsed: Line[] = raw.map((text) => ({
      text: text.replace(/^\[|\]$/g, ""),
      isSection: /^\[.*\]$/.test(text),
      t: null as number | null,
    }));

    const lyricLines = parsed.filter((l) => !l.isSection);

    if (timing && timing.length) {
      // Aligne le timing sur les lignes de paroles (ignore les balises de section).
      lyricLines.forEach((l, i) => {
        l.t = timing[i]?.t ?? null;
      });
    } else if (duration > 0 && lyricLines.length > 0) {
      const step = duration / (lyricLines.length + 1);
      lyricLines.forEach((l, i) => {
        l.t = step * (i + 1);
      });
    }
    return parsed;
  }, [lyrics, timing, duration]);

  const activeIndex = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].t !== null && (lines[i].t as number) <= currentTime + 0.15) idx = i;
    }
    return idx;
  }, [lines, currentTime]);

  useEffect(() => {
    const el = activeRef.current;
    const box = containerRef.current;
    if (!el || !box) return;
    box.scrollTo({
      top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2,
      behavior: "smooth",
    });
  }, [activeIndex]);

  return (
    <div
      ref={containerRef}
      className="h-[420px] overflow-y-auto pr-2 [mask-image:linear-gradient(180deg,transparent,#000_12%,#000_88%,transparent)]"
    >
      <div className="space-y-3 py-32">
        {lines.map((l, i) =>
          l.isSection ? (
            <p key={i} className="pt-4 text-xs font-semibold uppercase tracking-widest text-gold/70">
              {l.text}
            </p>
          ) : (
            <p
              key={i}
              ref={i === activeIndex ? activeRef : null}
              className={`text-lg leading-snug transition-all duration-300 ${
                i === activeIndex
                  ? "font-bold text-cream"
                  : i < activeIndex
                    ? "text-cream/35"
                    : "text-cream/55"
              }`}
            >
              {l.text}
            </p>
          ),
        )}
      </div>
    </div>
  );
}
