"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  Heart,
  Pause,
  Play,
  Share2,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Cover } from "@/components/explore/cover";
import { SyncedLyrics } from "@/components/explore/synced-lyrics";
import { parseLyricLines, activeLineIndex } from "@/lib/lyrics-sync";
import { reactorKey } from "@/lib/reactor-key";
import type { ExploreItem } from "@/lib/explore";

function fmt(s: number) {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function ExploreFeed({
  items,
  onClose,
}: {
  items: ExploreItem[];
  onClose: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const [active, setActive] = useState(0);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrolledOnce, setScrolledOnce] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [copied, setCopied] = useState(false);

  const [likes, setLikes] = useState<Record<string, number>>(() =>
    Object.fromEntries(items.map((i) => [i.id, i.reactions])),
  );
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  const cur = items[active];
  const startedRef = useRef(started);
  useEffect(() => {
    startedRef.current = started;
  }, [started]);

  const goTo = useCallback((i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const n = Math.max(0, Math.min(el.children.length - 1, i));
    el.scrollTo({ top: n * el.clientHeight, behavior: "smooth" });
  }, []);

  // --- chanson active = position de scroll (fiable avec le snap) ---
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (el.scrollTop > 8) setScrolledOnce(true);
        const idx = Math.round(el.scrollTop / el.clientHeight);
        setActive((p) => (idx !== p && idx >= 0 && idx < items.length ? idx : p));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [items.length]);

  // --- audio suit la chanson active ---
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !cur?.audioUrl) return;
    if (!a.src.includes(cur.audioUrl.split("?")[0])) {
      a.src = cur.audioUrl;
      a.load();
    }
    setTime(0);
    setShowLyrics(false);
    if (startedRef.current) {
      a.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
      fetch(`/api/explore/${cur.id}/play`, { method: "POST" }).catch(() => {});
    }
  }, [cur?.id, cur?.audioUrl]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
    a.muted = muted;
  }, [volume, muted]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setTime(a.currentTime);
    const onMeta = () => setDuration(a.duration || cur?.durationSec || 0);
    const onEnd = () => goTo(active + 1);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, [active, cur?.durationSec, goTo]);

  // Plein écran sous la barre d'app + navigation clavier.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown") goTo(active + 1);
      else if (e.key === "ArrowUp") goTo(active - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, goTo, onClose]);

  function firstStart() {
    setStarted(true);
    const a = audioRef.current;
    if (a) a.play().then(() => setPlaying(true)).catch(() => {});
    if (cur) fetch(`/api/explore/${cur.id}/play`, { method: "POST" }).catch(() => {});
  }

  function toggle() {
    if (!started) return firstStart();
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => {});
    else {
      a.pause();
      setPlaying(false);
    }
  }

  async function like(it: ExploreItem) {
    if (liked[it.id]) return;
    setLiked((l) => ({ ...l, [it.id]: true }));
    setLikes((k) => ({ ...k, [it.id]: (k[it.id] ?? 0) + 1 }));
    try {
      const r = await fetch(`/api/inspiration/${it.id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji: "❤️", reactorKey: reactorKey() }),
      });
      const j = await r.json();
      if (r.ok && j.summary?.total != null) {
        setLikes((k) => ({ ...k, [it.id]: j.summary.total }));
      }
    } catch {
      /* garde l'optimiste */
    }
  }

  function share(it: ExploreItem) {
    const url = `${window.location.origin}/inspiration/${it.id}`;
    if (navigator.share) navigator.share({ url, title: it.title }).catch(() => {});
    else {
      navigator.clipboard?.writeText(url).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  const lines = useMemo(
    () => (cur ? parseLyricLines(cur.lyrics ?? "", cur.timing, duration) : []),
    [cur, duration],
  );
  const activeIdx = activeLineIndex(lines, time);
  const currentLine =
    activeIdx >= 0 ? lines[activeIdx]?.text : lines.find((l) => !l.isSection)?.text ?? null;

  const pct = duration ? (time / duration) * 100 : 0;

  return (
    <div className="fixed inset-x-0 bottom-0 top-16 z-30 overflow-hidden bg-plum text-cream">
      <audio ref={audioRef} preload="auto" className="hidden">
        <track kind="captions" />
      </audio>

      <button
        onClick={onClose}
        aria-label="Revenir à la liste"
        className="absolute right-3 top-3 z-40 grid size-9 place-items-center rounded-full bg-white/10 text-cream/80 backdrop-blur hover:bg-white/20"
      >
        <X className="size-5" />
      </button>

      <div
        ref={scrollerRef}
        className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((it, i) => {
          const isActive = i === active;
          return (
            <section
              key={it.id}
              className="relative flex h-full snap-start snap-always flex-col items-center justify-center gap-2 overflow-hidden px-5 py-2"
            >
              <button
                onClick={() => (isActive ? toggle() : goTo(i))}
                className="relative block w-[min(56vw,220px)] max-w-[34vh]"
                aria-label={isActive && playing ? "Pause" : "Lecture"}
              >
                <Cover
                  id={it.id}
                  occasion={it.occasion}
                  image={it.coverImage}
                  className="aspect-square w-full overflow-hidden rounded-3xl shadow-2xl"
                  labelClassName="px-4 text-center font-display text-lg font-extrabold uppercase text-white/90"
                />
                {isActive && (!started || !playing) && (
                  <span className="absolute inset-0 grid place-items-center rounded-3xl bg-plum/40 backdrop-blur-[2px]">
                    <span className="grid size-14 place-items-center rounded-full bg-white/95 text-plum shadow-xl">
                      <Play className="size-6 translate-x-0.5" />
                    </span>
                  </span>
                )}
              </button>

              <div className="w-full max-w-[340px] text-center">
                {it.creatorHandle ? (
                  <Link
                    href={`/createur/${it.creatorHandle}`}
                    className="inline-flex items-center gap-1.5 text-xs text-cream/70 hover:text-cream"
                  >
                    <span className="grid size-4 place-items-center rounded-full bg-white/20 text-[9px] font-bold">
                      {(it.creatorName ?? "M").charAt(0).toUpperCase()}
                    </span>
                    {it.creatorName ?? "Muzikii"}
                    {it.style && <span className="text-cream/40">· {it.style}</span>}
                  </Link>
                ) : (
                  <p className="text-xs text-cream/60">{it.style ?? "Muzikii"}</p>
                )}
                <h2 className="mt-0.5 font-display text-base font-extrabold leading-tight">
                  {it.title}
                </h2>
                <p className="mx-auto line-clamp-1 h-5 max-w-[320px] text-[13px] text-cream/70">
                  {isActive ? currentLine ?? it.occasion : ""}
                </p>
              </div>

              <div className="w-full max-w-[320px]">
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full gradient-brand transition-[width] duration-200"
                    style={{ width: `${isActive ? pct : 0}%` }}
                  />
                </div>
                <div className="mt-0.5 flex justify-between text-[11px] text-cream/50">
                  <span>{isActive ? fmt(time) : "0:00"}</span>
                  <span>{fmt(it.durationSec ?? (isActive ? duration : 0))}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => goTo(active - 1)}
                  disabled={active === 0}
                  className="text-cream/60 hover:text-cream disabled:opacity-30"
                  aria-label="Précédent"
                >
                  <SkipBack className="size-5" />
                </button>
                <button
                  onClick={toggle}
                  className="grid size-12 place-items-center rounded-full gradient-brand text-white shadow-[var(--shadow-float)]"
                  aria-label={playing && isActive ? "Pause" : "Lecture"}
                >
                  {playing && isActive ? (
                    <Pause className="size-5" />
                  ) : (
                    <Play className="size-5 translate-x-0.5" />
                  )}
                </button>
                <button
                  onClick={() => goTo(active + 1)}
                  disabled={active === items.length - 1}
                  className="text-cream/60 hover:text-cream disabled:opacity-30"
                  aria-label="Suivant"
                >
                  <SkipForward className="size-5" />
                </button>
              </div>

              <div className="flex items-center gap-4 text-cream/70">
                <button
                  onClick={() => like(it)}
                  className={`inline-flex items-center gap-1 text-sm transition-transform active:scale-95 ${
                    liked[it.id] ? "text-brand" : "hover:text-cream"
                  }`}
                  aria-label="J'aime"
                >
                  <Heart className={`size-5 ${liked[it.id] ? "fill-current" : ""}`} />
                  {likes[it.id] ?? 0}
                </button>
                <button
                  onClick={() => share(it)}
                  className="hover:text-cream"
                  aria-label="Partager"
                >
                  {copied ? <Check className="size-5" /> : <Share2 className="size-5" />}
                </button>
                <button
                  onClick={() => setShowLyrics((v) => !v)}
                  className={`inline-flex items-center gap-1 text-sm hover:text-cream ${
                    showLyrics ? "text-brand" : ""
                  }`}
                >
                  <Sparkles className="size-4" />
                  Paroles
                </button>
                <button
                  onClick={() => setMuted((m) => !m)}
                  className="hover:text-cream"
                  aria-label={muted ? "Activer le son" : "Couper le son"}
                >
                  {muted || volume === 0 ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(Number(e.target.value));
                    setMuted(false);
                  }}
                  className="hidden h-1 w-16 accent-brand lg:block"
                  aria-label="Volume"
                />
              </div>

              <Link
                href={`/commander?inspire=${it.id}${
                  it.occasion ? `&occasion=${encodeURIComponent(it.occasion)}` : ""
                }`}
                className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold hover:bg-white/15"
              >
                Créer la mienne dans ce style
              </Link>

              {i < items.length - 1 && (
                <div
                  className={`pointer-events-none absolute inset-x-0 bottom-1.5 flex flex-col items-center transition-opacity duration-500 ${
                    scrolledOnce ? "opacity-0" : "opacity-100"
                  }`}
                >
                  <ChevronDown className="size-5 animate-bounce text-cream/50" />
                  <ChevronDown className="-mt-3.5 size-5 animate-bounce text-cream/30 [animation-delay:150ms]" />
                </div>
              )}

              {isActive && showLyrics && (
                <div className="absolute inset-0 z-20 flex flex-col bg-plum/95 p-6 backdrop-blur">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gold">Paroles</p>
                    <button
                      onClick={() => setShowLyrics(false)}
                      className="grid size-8 place-items-center rounded-full bg-white/10 text-cream/70 hover:text-cream"
                      aria-label="Fermer"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  {it.lyrics ? (
                    <div className="min-h-0 flex-1">
                      <SyncedLyrics
                        lyrics={it.lyrics}
                        timing={it.timing}
                        currentTime={time}
                        duration={duration}
                        heightClass="h-full"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-cream/60">Paroles non disponibles.</p>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {items.length > 1 && (
        <div className="pointer-events-none absolute right-2.5 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1.5">
          {items.slice(0, 14).map((_, i) => (
            <span
              key={i}
              className={`w-1 rounded-full transition-all duration-300 ${
                i === active ? "h-4 bg-brand" : "h-1 bg-cream/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
