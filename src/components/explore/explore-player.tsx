"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, Headphones, Pause, Play, Sparkles } from "lucide-react";
import { SyncedLyrics } from "@/components/explore/synced-lyrics";
import type { ExploreDetail } from "@/lib/explore";

function fmt(s: number) {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function ExplorePlayer({ item }: { item: ExploreDetail }) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [copied, setCopied] = useState(false);
  const counted = useRef(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setTime(a.currentTime);
    const onMeta = () => setDuration(a.duration);
    const onEnd = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play();
      setPlaying(true);
      if (!counted.current) {
        counted.current = true;
        fetch(`/api/explore/${item.id}/play`, { method: "POST" }).catch(() => {});
      }
    } else {
      a.pause();
      setPlaying(false);
    }
  }

  async function inspire() {
    fetch(`/api/explore/${item.id}/inspire`, { method: "POST" }).catch(() => {});
    router.push(`/commander?inspire=${item.id}`);
  }

  function share() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const pct = duration ? (time / duration) * 100 : 0;

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-plum text-cream">
      <div className="mx-auto max-w-5xl px-5 py-6">
        <button
          onClick={() => router.push("/explorer")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-cream/70 hover:text-cream"
        >
          <ArrowLeft className="size-4" />
          Explorer
        </button>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          {/* Colonne lecteur */}
          <div>
            <div className="grid aspect-square w-full max-w-sm place-items-center rounded-3xl bg-gradient-to-br from-brand/80 to-brand-strong">
              <span className="font-display text-2xl font-extrabold text-white/90">
                {(item.occasion ?? "Muzikii").toUpperCase()}
              </span>
            </div>
            <div className="mt-5 max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-gold">
                {item.occasion ?? "Inspiration"}
              </p>
              <h1 className="mt-1 font-display text-2xl font-extrabold">{item.title}</h1>
              <p className="text-sm text-cream/60">
                {item.artist ? `${item.artist} · ` : ""}
                {item.style ?? "—"}
                {" · "}
                <span className="inline-flex items-center gap-1">
                  <Headphones className="size-3.5" />
                  {item.plays}
                </span>
              </p>

              {item.audioUrl ? (
                <>
                  <audio ref={audioRef} src={item.audioUrl} preload="auto" className="hidden">
                    <track kind="captions" />
                  </audio>
                  <div className="mt-4">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full gradient-brand transition-[width]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-cream/50">
                      <span>{fmt(time)}</span>
                      <span>{fmt(duration)}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={toggle}
                      className="grid size-14 place-items-center rounded-full gradient-brand text-white shadow-[var(--shadow-float)]"
                      aria-label={playing ? "Pause" : "Lecture"}
                    >
                      {playing ? (
                        <Pause className="size-6" />
                      ) : (
                        <Play className="size-6 translate-x-0.5" />
                      )}
                    </button>
                    <button
                      onClick={share}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold hover:bg-white/5"
                    >
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                      {copied ? "Lien copié" : "Partager"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-cream/60">Aperçu audio bientôt disponible.</p>
              )}

              <button
                onClick={inspire}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 font-semibold text-plum transition-transform hover:-translate-y-0.5"
              >
                <Sparkles className="size-4" />
                M&apos;en inspirer
              </button>
              <p className="mt-2 text-center text-xs text-cream/50">
                Lance le wizard avec ce style et cette ambiance
              </p>
            </div>
          </div>

          {/* Colonne paroles */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="mb-2 text-sm font-semibold text-gold">Paroles</p>
            {item.lyrics ? (
              <SyncedLyrics
                lyrics={item.lyrics}
                timing={item.timing}
                currentTime={time}
                duration={duration}
              />
            ) : (
              <p className="text-sm text-cream/60">Paroles non disponibles.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
