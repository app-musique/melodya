import type { LyricsTiming } from "@/lib/domain";

export type LyricLine = { text: string; isSection: boolean; t: number | null };

const norm = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Découpe des paroles en lignes + assigne un timing à chaque ligne chantée.
 * - `timing` présent → association **par texte** (tolère les répétitions et
 *   variations de Suno), recherche vers l'avant ; les trous sont comblés par
 *   interpolation linéaire, la fin s'étire vers `duration`.
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
  if (!lyricLines.length) return parsed;

  if (timing && timing.length) {
    const timed = timing.map((x) => ({ t: x.t, n: norm(x.line) }));
    let from = 0;
    for (const l of lyricLines) {
      const target = norm(l.text);
      if (!target) continue;
      let idx = timed.findIndex((x, i) => i >= from && x.n === target);
      if (idx === -1) {
        const key = target.split(" ").slice(0, 3).join(" ");
        if (key) {
          idx = timed.findIndex(
            (x, i) => i >= from && (x.n.startsWith(key) || key.startsWith(x.n)),
          );
        }
      }
      if (idx !== -1) {
        l.t = timed[idx].t;
        from = idx + 1;
      }
    }
    fillGaps(lyricLines, duration);
  } else if (duration > 0) {
    const step = duration / (lyricLines.length + 1);
    lyricLines.forEach((l, i) => {
      l.t = step * (i + 1);
    });
  }
  return parsed;
}

/** Comble les lignes sans timing (interpolation interne + extrapolation en fin). */
function fillGaps(lines: LyricLine[], duration: number): void {
  const anchors = lines
    .map((l, i) => ({ i, t: l.t }))
    .filter((x): x is { i: number; t: number } => x.t !== null);
  if (!anchors.length) return;

  // Avant le 1er point connu.
  const first = anchors[0];
  for (let k = 0; k < first.i; k++) lines[k].t = (first.t * (k + 1)) / (first.i + 1);

  // Entre deux points connus.
  for (let s = 0; s < anchors.length - 1; s++) {
    const a = anchors[s];
    const b = anchors[s + 1];
    for (let k = 1; k < b.i - a.i; k++) {
      lines[a.i + k].t = a.t + ((b.t - a.t) * k) / (b.i - a.i);
    }
  }

  // Après le dernier point connu.
  const last = anchors[anchors.length - 1];
  const trailing = lines.length - 1 - last.i;
  if (trailing > 0) {
    const perLine = last.i > 0 ? last.t / last.i : 4;
    const end = duration > last.t + 1 ? duration : last.t + perLine * (trailing + 1);
    for (let k = 1; k <= trailing; k++) {
      lines[last.i + k].t = last.t + ((end - last.t) * k) / (trailing + 1);
    }
  }
}

/**
 * Index de la ligne active pour un temps de lecture donné (-1 si aucune).
 * `lead` : avance légèrement le surlignage pour compenser la latence de
 * `timeupdate` et du rendu (sensation « synchro »).
 */
export function activeLineIndex(lines: LyricLine[], currentTime: number, lead = 0.35): number {
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].t;
    if (t !== null && t <= currentTime + lead) idx = i;
  }
  return idx;
}
