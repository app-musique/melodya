"use client";

import { useMemo, useRef, useState } from "react";
import type { VisitBucketRow } from "@/lib/admin";

const VISITORS_COLOR = "#eb6834";
const PAGEVIEWS_COLOR = "#2a78d6";
const GRID_COLOR = "#efdfd0";
const TEXT_MUTED = "#8a7a68";

const VIEW_W = 960;
const VIEW_H = 260;
const PAD_L = 40;
const PAD_R = 12;
const PAD_T = 14;
const PAD_B = 28;

/** Arrondit vers le haut à une valeur « ronde » (1/2/5 × 10^n) pour l'axe Y. */
function niceMax(value: number): number {
  if (value <= 4) return 4;
  const exp = Math.floor(Math.log10(value));
  const base = Math.pow(10, exp);
  for (const step of [1, 2, 5, 10]) {
    if (value <= step * base) return step * base;
  }
  return 10 * base;
}

function label(iso: string, granularity: "hour" | "day"): string {
  const d = new Date(iso);
  if (granularity === "hour") {
    return `${d.getUTCHours()}h`;
  }
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
}

function fullLabel(iso: string, granularity: "hour" | "day"): string {
  const d = new Date(iso);
  if (granularity === "hour") {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  }
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function VisitsChart({
  buckets,
  granularity,
}: {
  buckets: VisitBucketRow[];
  granularity: "hour" | "day";
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const { pathVisitors, areaVisitors, pathPageviews, points, yTicks } = useMemo(() => {
    const n = Math.max(buckets.length, 1);
    const max = niceMax(Math.max(1, ...buckets.map((b) => Math.max(b.visitors, b.pageviews))));
    const plotW = VIEW_W - PAD_L - PAD_R;
    const plotH = VIEW_H - PAD_T - PAD_B;
    const x = (i: number) => PAD_L + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const y = (v: number) => PAD_T + plotH - (v / max) * plotH;

    const pts = buckets.map((b, i) => ({
      x: x(i),
      yV: y(b.visitors),
      yP: y(b.pageviews),
      b,
    }));

    const line = (key: "yV" | "yP") =>
      pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p[key].toFixed(1)}`).join(" ");

    const area =
      pts.length > 0
        ? `${line("yV")} L ${pts[pts.length - 1].x.toFixed(1)} ${(PAD_T + plotH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(PAD_T + plotH).toFixed(1)} Z`
        : "";

    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
      v: Math.round(max * f),
      y: y(max * f),
    }));

    return {
      pathVisitors: line("yV"),
      areaVisitors: area,
      pathPageviews: line("yP"),
      points: pts,
      yTicks: ticks,
      maxV: max,
    };
  }, [buckets]);

  function onMove(clientX: number) {
    const svg = svgRef.current;
    if (!svg || points.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const scale = VIEW_W / rect.width;
    const localX = (clientX - rect.left) * scale;
    let nearest = 0;
    let best = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - localX);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHover(nearest);
  }

  // Étiquettes X éparses : ~6 repères max.
  const tickEvery = Math.max(1, Math.ceil(buckets.length / 6));

  const nf = new Intl.NumberFormat("fr-FR");
  const active = hover !== null ? points[hover] : null;

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs font-medium text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full" style={{ background: VISITORS_COLOR }} />
          Visiteurs uniques
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full" style={{ background: PAGEVIEWS_COLOR }} />
          Pages vues
        </span>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="w-full touch-none select-none"
          role="img"
          aria-label="Visiteurs et pages vues par période — détail dans le tableau ci-dessous"
          onMouseMove={(e) => onMove(e.clientX)}
          onMouseLeave={() => setHover(null)}
          onTouchMove={(e) => e.touches[0] && onMove(e.touches[0].clientX)}
          onTouchEnd={() => setHover(null)}
        >
          {yTicks.map((t) => (
            <g key={t.v}>
              <line
                x1={PAD_L}
                x2={VIEW_W - PAD_R}
                y1={t.y}
                y2={t.y}
                stroke={GRID_COLOR}
                strokeWidth={1}
              />
              <text x={PAD_L - 8} y={t.y + 3} textAnchor="end" fontSize={10} fill={TEXT_MUTED}>
                {nf.format(t.v)}
              </text>
            </g>
          ))}

          {buckets.map((b, i) =>
            i % tickEvery === 0 ? (
              <text
                key={b.bucket}
                x={points[i].x}
                y={VIEW_H - 8}
                textAnchor="middle"
                fontSize={10}
                fill={TEXT_MUTED}
              >
                {label(b.bucket, granularity)}
              </text>
            ) : null,
          )}

          {areaVisitors && <path d={areaVisitors} fill={VISITORS_COLOR} opacity={0.1} stroke="none" />}
          <path d={pathPageviews} fill="none" stroke={PAGEVIEWS_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <path d={pathVisitors} fill="none" stroke={VISITORS_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {active && (
            <line
              x1={active.x}
              x2={active.x}
              y1={PAD_T}
              y2={VIEW_H - PAD_B}
              stroke={TEXT_MUTED}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}
          {active && (
            <>
              <circle cx={active.x} cy={active.yP} r={4} fill={PAGEVIEWS_COLOR} stroke="#fff" strokeWidth={2} />
              <circle cx={active.x} cy={active.yV} r={4} fill={VISITORS_COLOR} stroke="#fff" strokeWidth={2} />
            </>
          )}
        </svg>

        {active && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-[var(--shadow-soft)]"
            style={{
              left: `${(active.x / VIEW_W) * 100}%`,
              transform: `translateX(${active.x < VIEW_W / 4 ? "0%" : active.x > (VIEW_W * 3) / 4 ? "-100%" : "-50%"})`,
            }}
          >
            <p className="font-semibold text-ink">{fullLabel(active.b.bucket, granularity)}</p>
            <p className="mt-1 flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-3 rounded-full" style={{ background: VISITORS_COLOR }} />
              <span className="font-semibold text-ink">{nf.format(active.b.visitors)}</span>
              <span className="text-ink-soft">visiteur{active.b.visitors > 1 ? "s" : ""}</span>
            </p>
            <p className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-3 rounded-full" style={{ background: PAGEVIEWS_COLOR }} />
              <span className="font-semibold text-ink">{nf.format(active.b.pageviews)}</span>
              <span className="text-ink-soft">page{active.b.pageviews > 1 ? "s" : ""} vue{active.b.pageviews > 1 ? "s" : ""}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
