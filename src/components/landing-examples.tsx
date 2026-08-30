"use client";

import { useRef, useState } from "react";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { orderHref } from "@/lib/site";

export type Example = {
  title: string;
  subtitle: string;
  style: string;
  tags: string[];
  from: string;
  to: string;
  /** Renseignés quand une vraie chanson vitrine est épinglée sur ce créneau. */
  songId?: string;
  audioUrl?: string | null;
  coverImage?: string | null;
};

export function LandingExamples({ items }: { items: Example[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  function toggle(ex: Example) {
    const el = audioRef.current;
    if (!el || !ex.audioUrl || !ex.songId) return;
    if (current === ex.songId) {
      if (el.paused) void el.play();
      else el.pause();
      return;
    }
    el.src = ex.audioUrl;
    el.currentTime = 0;
    setProgress(0);
    setCurrent(ex.songId);
    void el.play();
  }

  return (
    <>
      <audio
        ref={audioRef}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration) setProgress(el.currentTime / el.duration);
        }}
        onEnded={() => {
          setCurrent(null);
          setPlaying(false);
          setProgress(0);
        }}
      />

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((ex) => {
          const playable = !!ex.audioUrl && !!ex.songId;
          const active = playable && current === ex.songId;
          const isPlaying = active && playing;

          const tile = (
            <div
              className="relative aspect-[4/3] overflow-hidden p-5"
              style={
                ex.coverImage
                  ? undefined
                  : { backgroundImage: `linear-gradient(140deg, ${ex.from}, ${ex.to})` }
              }
            >
              {ex.coverImage && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={ex.coverImage}
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                  loading="lazy"
                />
              )}
              <div className="relative flex flex-wrap gap-2">
                {ex.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm"
                  >
                    {t}
                  </span>
                ))}
              </div>

              {playable ? (
                <button
                  type="button"
                  onClick={() => toggle(ex)}
                  aria-label={isPlaying ? `Mettre en pause ${ex.title}` : `Écouter ${ex.title}`}
                  className="absolute inset-0 z-10 grid place-items-center"
                >
                  <span className="grid size-14 place-items-center rounded-full bg-white/90 text-plum shadow-[var(--shadow-float)] transition-transform group-hover:scale-105">
                    {isPlaying ? (
                      <Pause className="size-6 fill-current" />
                    ) : (
                      <Play className="size-6 translate-x-0.5 fill-current" />
                    )}
                  </span>
                </button>
              ) : (
                <ArrowUpRight className="absolute bottom-5 right-5 size-5 text-white/80 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              )}

              {active && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
                  <div
                    className="h-full bg-white transition-[width] duration-300"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
              )}
            </div>
          );

          const caption = (
            <div className="p-5">
              <h3 className="font-display text-lg font-bold">{ex.title}</h3>
              <p className="text-sm text-ink-soft">
                {ex.subtitle} · {ex.style}
              </p>
            </div>
          );

          const shell =
            "group block overflow-hidden rounded-3xl border border-line bg-white shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5";

          return playable ? (
            <div key={ex.title} className={shell}>
              {tile}
              {caption}
            </div>
          ) : (
            <a key={ex.title} href={orderHref} className={shell}>
              {tile}
              {caption}
            </a>
          );
        })}
      </div>
    </>
  );
}
