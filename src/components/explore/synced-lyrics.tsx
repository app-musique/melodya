"use client";

import { useEffect, useMemo, useRef } from "react";
import type { LyricsTiming } from "@/lib/domain";
import { activeLineIndex, parseLyricLines } from "@/lib/lyrics-sync";

/** Paroles qui défilent et se surlignent au fil de la lecture. */
export function SyncedLyrics({
  lyrics,
  timing,
  currentTime,
  duration,
  heightClass = "h-[420px]",
}: {
  lyrics: string;
  timing: LyricsTiming | null;
  currentTime: number;
  duration: number;
  heightClass?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLParagraphElement>(null);

  const lines = useMemo(
    () => parseLyricLines(lyrics, timing, duration),
    [lyrics, timing, duration],
  );

  const activeIndex = useMemo(
    () => activeLineIndex(lines, currentTime),
    [lines, currentTime],
  );

  useEffect(() => {
    const el = activeRef.current;
    const box = containerRef.current;
    if (!el || !box) return;
    // Centre la ligne active dans le conteneur — calcul par rect (robuste quel
    // que soit le positionnement des ancêtres, contrairement à offsetTop).
    const boxRect = box.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const target =
      box.scrollTop + (elRect.top - boxRect.top) - (box.clientHeight / 2 - el.clientHeight / 2);
    box.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }, [activeIndex]);

  return (
    <div
      ref={containerRef}
      className={`relative ${heightClass} overflow-y-auto pr-2 [mask-image:linear-gradient(180deg,transparent,#000_14%,#000_86%,transparent)]`}
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
