import type { LyricsTiming } from "@/lib/domain";

export type LyricLine = { text: string; isSection: boolean; t: number | null };

/**
 * Découpe des paroles en lignes + assigne un timing à chaque ligne chantée.
 * - `timing` présent → aligné mot-à-ligne (les balises [Section] sont ignorées).
 * - sinon, si `duration > 0` → répartition uniforme (approximatif).
 */
export function parseLyricLines(
  lyrics: string,
  timing: LyricsTiming | null,
  duration: number,
): LyricLine[] {
  const raw = lyrics
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const parsed: LyricLine[] = raw.map((text) => ({
    text: text.replace(/^\[|\]$/g, ""),
    isSection: /^\[.*\]$/.test(text),
    t: null as number | null,
  }));

  const lyricLines = parsed.filter((l) => !l.isSection);

  if (timing && timing.length) {
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
}

/** Index de la ligne active pour un temps de lecture donné (-1 si aucune). */
export function activeLineIndex(lines: LyricLine[], currentTime: number): number {
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].t;
    if (t !== null && t <= currentTime + 0.15) idx = i;
  }
  return idx;
}
