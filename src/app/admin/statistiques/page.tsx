import Link from "next/link";
import { Eye, MousePointerClick, TrendingUp } from "lucide-react";
import { VisitsChart } from "@/components/admin/visits-chart";
import { getVisitStats } from "@/lib/admin";

export const metadata = { title: "Statistiques · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const PRESETS = [
  { key: "today", label: "Aujourd'hui", days: 1 },
  { key: "3", label: "3 derniers jours", days: 3 },
  { key: "7", label: "7 derniers jours", days: 7 },
  { key: "30", label: "30 derniers jours", days: 30 },
  { key: "90", label: "90 derniers jours", days: 90 },
] as const;

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseYmd(s: string | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

type Range = { start: Date; end: Date; label: string; preset: string | null };

function resolveRange(sp: { range?: string; from?: string; to?: string }): Range {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const from = parseYmd(sp.from);
  const to = parseYmd(sp.to);
  if (from && to) {
    const [start, endDay] = from.getTime() <= to.getTime() ? [from, to] : [to, from];
    const exclusiveEnd = new Date(endDay.getTime() + 86_400_000);
    const end = exclusiveEnd.getTime() > now.getTime() ? now : exclusiveEnd;
    const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
    const label =
      start.getTime() === endDay.getTime() ? `Le ${fmt(start)}` : `Du ${fmt(start)} au ${fmt(endDay)}`;
    return { start, end, label, preset: null };
  }

  const preset = PRESETS.find((p) => p.key === sp.range) ?? PRESETS[2];
  const start = new Date(todayStart.getTime() - (preset.days - 1) * 86_400_000);
  return { start, end: now, label: preset.label, preset: preset.key };
}

type Props = { searchParams: Promise<{ range?: string; from?: string; to?: string }> };

export default async function AdminStatistiquesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { start, end, label, preset } = resolveRange(sp);
  const stats = await getVisitStats(start, end);

  const avgPerVisitor = stats.totals.visitors > 0 ? stats.totals.pageviews / stats.totals.visitors : 0;
  const nf = new Intl.NumberFormat("fr-FR");

  const tiles = [
    { icon: TrendingUp, label: "Visiteurs uniques", value: nf.format(stats.totals.visitors) },
    { icon: Eye, label: "Pages vues", value: nf.format(stats.totals.pageviews) },
    { icon: MousePointerClick, label: "Pages vues / visiteur", value: avgPerVisitor.toFixed(1) },
  ];

  const pillBase = "rounded-full border px-4 py-2 text-sm font-medium transition-colors";
  const pillOn = "border-brand bg-brand/5 text-ink font-semibold";
  const pillOff = "border-line bg-white text-ink-soft hover:border-brand/40";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Statistiques</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Fréquentation du site (1re partie, anonyme) — période : <strong>{label}</strong>.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <Link
            key={p.key}
            href={`/admin/statistiques?range=${p.key}`}
            className={`${pillBase} ${preset === p.key ? pillOn : pillOff}`}
          >
            {p.label}
          </Link>
        ))}

        <form
          action="/admin/statistiques"
          className="ml-auto flex flex-wrap items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5"
        >
          <span className="text-xs font-semibold text-ink-soft">Plage personnalisée</span>
          <input
            type="date"
            name="from"
            defaultValue={sp.from ?? ymd(start)}
            max={ymd(new Date())}
            required
            className="rounded-lg border border-line px-2 py-1 text-xs"
          />
          <span className="text-xs text-ink-soft">→</span>
          <input
            type="date"
            name="to"
            defaultValue={sp.to ?? ymd(new Date())}
            max={ymd(new Date())}
            required
            className="rounded-lg border border-line px-2 py-1 text-xs"
          />
          <button
            type="submit"
            className="rounded-full gradient-brand px-3 py-1.5 text-xs font-semibold text-white"
          >
            Appliquer
          </button>
        </form>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border border-line bg-white p-4">
            <p className="flex items-center gap-1.5 text-xs text-ink-soft">
              <t.icon className="size-3.5" />
              {t.label}
            </p>
            <p className="mt-1 font-display text-xl font-extrabold">{t.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-white p-5">
        {stats.buckets.some((b) => b.pageviews > 0) ? (
          <VisitsChart buckets={stats.buckets} granularity={stats.granularity} />
        ) : (
          <p className="py-10 text-center text-sm text-ink-soft">
            Aucune visite enregistrée sur cette période.
          </p>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-3 font-semibold">
                {stats.granularity === "hour" ? "Heure" : "Jour"}
              </th>
              <th className="px-4 py-3 font-semibold">Visiteurs uniques</th>
              <th className="px-4 py-3 font-semibold">Pages vues</th>
            </tr>
          </thead>
          <tbody>
            {[...stats.buckets].reverse().map((b) => (
              <tr key={b.bucket} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-2.5 text-ink-soft">
                  {stats.granularity === "hour"
                    ? `${new Date(b.bucket).getUTCHours()}h`
                    : new Date(b.bucket).toLocaleDateString("fr-FR", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        timeZone: "UTC",
                      })}
                </td>
                <td className="px-4 py-2.5 font-medium">{nf.format(b.visitors)}</td>
                <td className="px-4 py-2.5 font-medium">{nf.format(b.pageviews)}</td>
              </tr>
            ))}
            {stats.buckets.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-ink-soft">
                  Aucune donnée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
