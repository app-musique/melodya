import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Headphones, Heart } from "lucide-react";
import { listExplore } from "@/lib/explore";
import { occasions } from "@/lib/site";
import { MUSIC_STYLES } from "@/lib/domain";

export const metadata: Metadata = { title: "Explorer", robots: { index: false } };

type Props = { searchParams: Promise<{ occasion?: string; style?: string }> };

export default async function ExplorerPage({ searchParams }: Props) {
  const { occasion, style } = await searchParams;
  const items = await listExplore({ occasion, style });

  const chip = (label: string, key: "occasion" | "style", value: string, active: boolean) => {
    const params = new URLSearchParams();
    if (!active) params.set(key, value);
    const href = params.toString() ? `/explorer?${params}` : "/explorer";
    return (
      <Link
        key={`${key}-${value}`}
        href={href}
        className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
          active
            ? "border-brand bg-brand text-white"
            : "border-line bg-white text-ink-soft hover:border-brand/40"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:py-10">
      <div className="flex items-center gap-2">
        <Compass className="size-6 text-brand-strong" />
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Explorer</h1>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        Des chansons pour t&apos;inspirer. Écoute, puis lance ta création avec le même style.
      </p>

      <div className="mt-6 space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {chip("Toutes occasions", "occasion", "", !occasion)}
          {occasions.map((o) => chip(o, "occasion", o, occasion === o))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {chip("Tous styles", "style", "", !style)}
          {MUSIC_STYLES.map((s) => chip(s, "style", s, style === s))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-line bg-white p-10 text-center text-sm text-ink-soft">
          Rien ici pour ce filtre. Essaie une autre occasion ou un autre style.
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                href={`/inspiration/${it.id}`}
                className="group block overflow-hidden rounded-3xl border border-line bg-white shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5"
              >
                <div className="grid aspect-[4/3] w-full place-items-center bg-gradient-to-br from-plum to-brand-strong p-4 text-center">
                  <span className="font-display text-lg font-extrabold text-white/90">
                    {it.occasion ?? "Muzikii"}
                  </span>
                </div>
                <div className="p-4">
                  <p className="font-display text-base font-bold">{it.title}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-soft">
                    <span className="truncate">
                      {it.artist ? `${it.artist} · ` : ""}
                      {it.style ?? "—"}
                    </span>
                    <span className="ml-auto inline-flex shrink-0 items-center gap-1">
                      <Headphones className="size-3.5" />
                      {it.plays}
                    </span>
                    {it.reactions > 0 && (
                      <span className="inline-flex shrink-0 items-center gap-1">
                        <Heart className="size-3.5" />
                        {it.reactions}
                      </span>
                    )}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
