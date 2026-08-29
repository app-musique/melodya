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
}: {
  lyrics: string;
  timing: LyricsTiming | null;
  currentTime: number;
  duration: number;
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
