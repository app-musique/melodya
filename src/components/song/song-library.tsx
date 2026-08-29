"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronUp, Pause, Play, Settings2 } from "lucide-react";
import { StatusBadge } from "@/components/song/status-badge";
import { SyncedLyrics } from "@/components/explore/synced-lyrics";
import type { SongListItem } from "@/lib/songs";

function fmt(s: number) {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function SongLibrary({ songs }: { songs: SongListItem[] }) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setTime(a.currentTime);
    const onMeta = () => setDuration(a.duration);
    const onEnd = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, []);

  function openSong(s: SongListItem) {
    const a = audioRef.current;
    if (s.status !== "ready" || !s.audio_url || !a) {
      router.push(`/mes-chansons/${s.id}`);
      return;
    }
    if (activeId === s.id) {
      if (a.paused) void a.play();
      else a.pause();
      return;
    }
    setActiveId(s.id);
    setTime(0);
    setDuration(0);
    a.src = s.audio_url;
    a.currentTime = 0;
    a.play().catch(() => setPlaying(false));
  }

  function collapse() {
    audioRef.current?.pause();
    setActiveId(null);
  }

  return (
    <div>
      <audio ref={audioRef} preload="auto" className="hidden">
        <track kind="captions" />
      </audio>

      <ul className="space-y-4">
        {songs.map((s) => {
          const active = activeId === s.id;
          const playable = s.status === "ready" && !!s.audio_url;
          return (
            <li key={s.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => openSong(s)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openSong(s);
                  }
                }}
                className={`cursor-pointer rounded-3xl border p-5 shadow-[var(--shadow-soft)] transition-colors ${
                  active
                    ? "border-plum bg-plum text-cream"
                    : "border-line bg-white hover:border-brand/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={`text-[11px] font-semibold uppercase tracking-widest ${
                        active ? "text-gold" : "text-ink-soft"
                      }`}
                    >
                      {s.occasion || "Chanson"}
                    </p>
                    <p className="font-display text-lg font-bold">
                      {s.recipient_name || "Chanson"}
                    </p>
                    <p className={`truncate text-sm ${active ? "text-cream/60" : "text-ink-soft"}`}>
                      {s.music_style || "—"} · {s.mood || "—"}
                    </p>
                  </div>

                  {active ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        collapse();
                      }}
                      aria-label="Réduire"
                      className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-cream hover:bg-white/20"
                    >
                      <ChevronUp className="size-4" />
                    </button>
                  ) : playable ? (
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/10 text-brand-strong">
                      <Play className="size-4 translate-x-0.5" />
                    </span>
                  ) : (
                    <StatusBadge status={s.status} />
                  )}
                </div>

                {active && (
                  <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full gradient-brand"
                        style={{ width: `${duration ? (time / duration) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-cream/50">
                      <span>{fmt(time)}</span>
                      <span>{fmt(duration)}</span>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <button
                        onClick={() => openSong(s)}
                        aria-label={playing ? "Pause" : "Lecture"}
                        className="grid size-12 place-items-center rounded-full gradient-brand text-white shadow-[var(--shadow-float)]"
                      >
                        {playing ? (
                          <Pause className="size-5" />
                        ) : (
                          <Play className="size-5 translate-x-0.5" />
                        )}
                      </button>
                      <Link
                        href={`/mes-chansons/${s.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-cream hover:bg-white/5"
                      >
                        <Settings2 className="size-4" />
                        Gérer
                      </Link>
                    </div>

                    {s.lyrics && (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="mb-1 text-xs font-semibold text-gold">Paroles</p>
                        <SyncedLyrics
                          lyrics={s.lyrics}
                          timing={s.lyrics_timing}
                          currentTime={time}
                          duration={duration}
                          heightClass="h-[260px]"
                        />
                      </div>
                    )}
                  </div>
                )}

                {!active && s.lyrics && (
                  <p className={`mt-2 text-xs ${playable ? "text-ink-soft" : "text-ink-soft"}`}>
                    {playable ? "Appuie pour écouter avec les paroles" : "Paroles disponibles"}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
