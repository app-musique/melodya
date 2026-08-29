"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GalleryVerticalEnd, Headphones, Heart, List, Music4 } from "lucide-react";
import { Cover } from "@/components/explore/cover";
import { ExploreFeed } from "@/components/explore/explore-feed";
import type { ExploreItem } from "@/lib/explore";

function fmt(sec: number | null) {
  if (!sec || !Number.isFinite(sec)) return null;
  const m = Math.floor(sec / 60);
  return `${m}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
}

type View = "list" | "feed";

export function ExploreGallery({
  items,
  filters,
}: {
  items: ExploreItem[];
  filters?: React.ReactNode;
}) {
  const [view, setView] = useState<View>("list");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const v = localStorage.getItem("muzikii_explore_view");
      if (v === "feed" || v === "grid") setView("feed");
      else if (v === "list") setView("list");
    } catch {
      /* ignore */
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function choose(v: View) {
    setView(v);
    try {
      localStorage.setItem("muzikii_explore_view", v);
    } catch {
      /* ignore */
    }
  }

  const toggle = (
    <div className="flex rounded-full border border-line bg-white p-0.5">
      <button
        type="button"
        onClick={() => choose("list")}
        aria-label="Vue liste"
        aria-pressed={view === "list"}
        className={`grid size-8 place-items-center rounded-full transition-colors ${
          view === "list" ? "bg-brand text-white" : "text-ink-soft hover:text-ink"
        }`}
      >
        <List className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => choose("feed")}
        aria-label="Vue immersive"
        aria-pressed={view === "feed"}
        className={`grid size-8 place-items-center rounded-full transition-colors ${
          view === "feed" ? "bg-brand text-white" : "text-ink-soft hover:text-ink"
        }`}
      >
        <GalleryVerticalEnd className="size-4" />
      </button>
    </div>
  );

  if (view === "feed") {
    return <ExploreFeed items={items} onClose={() => choose("list")} />;
  }

  return (
    <div className="mt-6">
      {filters}
      <div className="mb-4 mt-4 flex items-center justify-between">
        <p className="text-sm text-ink-soft">
          {items.length} chanson{items.length > 1 ? "s" : ""}
        </p>
        {toggle}
      </div>

      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
        {items.map((it) => (
          <li key={it.id}>
            <Link
              href={`/inspiration/${it.id}`}
              className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-cream-deep sm:px-4"
            >
              <Cover
                id={it.id}
                occasion={it.occasion}
                image={it.coverImage}
                className="size-12 shrink-0 overflow-hidden rounded-xl"
                labelClassName="text-[8px] font-bold uppercase leading-tight text-white/90 line-clamp-2"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{it.title}</span>
                <span className="block truncate text-xs text-ink-soft">
                  {it.creatorName ?? "Muzikii"}
                </span>
                <span className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-soft">
                  {it.style && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-cream-deep px-1.5 py-0.5 font-medium">
                      <Music4 className="size-2.5" />
                      {it.style}
                    </span>
                  )}
                  {fmt(it.durationSec) && <span>{fmt(it.durationSec)}</span>}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3 text-xs text-ink-soft">
                <span className="inline-flex items-center gap-1">
                  <Headphones className="size-3.5" />
                  {it.plays}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Heart className="size-3.5" />
                  {it.reactions}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
