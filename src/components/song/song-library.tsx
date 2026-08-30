"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BellRing,
  Check,
  ChevronUp,
  Clapperboard,
  Compass,
  Copy,
  Download,
  Link2,
  Loader2,
  Pause,
  Play,
  Settings2,
} from "lucide-react";
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
                      {s.title || s.recipient_name || "Chanson"}
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
                  <p className="mt-2 text-xs text-ink-soft">
                    {playable ? "Appuie pour écouter avec les paroles" : "Paroles disponibles"}
                  </p>
                )}

                {s.status === "ready" && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <SongControls song={s} dark={active} />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SongControls({ song, dark }: { song: SongListItem; dark: boolean }) {
  const [inExplore, setInExplore] = useState(song.in_explore);
  const [followers, setFollowers] = useState(song.shared_with_followers);
  const [isPublic, setIsPublic] = useState(song.is_public);
  const [slug, setSlug] = useState(song.gift_slug);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function patch(key: string, payload: Record<string, unknown>, apply: (j: unknown) => void) {
    setBusy(key);
    try {
      const res = await fetch(`/api/songs/${song.id}/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (res.ok) apply(j);
    } finally {
      setBusy(null);
    }
  }

  const base = dark
    ? "border-white/15 text-cream/80 hover:bg-white/10"
    : "border-line text-ink-soft hover:bg-cream-deep";
  const onCls = "border-brand bg-brand/10 text-brand-strong";
  const pill = (on: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
      on ? onCls : base
    }`;

  const shareUrl =
    typeof window !== "undefined" && slug ? `${window.location.origin}/cadeau/${slug}` : "";

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/60 pt-3">
      <button
        type="button"
        onClick={() =>
          patch("explore", { in_explore: !inExplore }, () => setInExplore((v) => !v))
        }
        disabled={busy !== null}
        className={pill(inExplore)}
        title="Apparaître dans la section Inspiration"
      >
        {busy === "explore" ? <Loader2 className="size-3.5 animate-spin" /> : <Compass className="size-3.5" />}
        Inspiration
      </button>

      <button
        type="button"
        onClick={() =>
          patch("followers", { shared_with_followers: !followers }, () => setFollowers((v) => !v))
        }
        disabled={busy !== null}
        className={pill(followers)}
        title="Prévenir mes abonnés et l'afficher sur mon profil"
      >
        {busy === "followers" ? <Loader2 className="size-3.5 animate-spin" /> : <BellRing className="size-3.5" />}
        Abonnés
      </button>

      <button
        type="button"
        onClick={() =>
          patch("public", { is_public: !isPublic }, (j) => {
            const r = j as { is_public?: boolean; slug?: string | null };
            setIsPublic(!!r.is_public);
            if (r.slug) setSlug(r.slug);
          })
        }
        disabled={busy !== null}
        className={pill(isPublic)}
        title="Lien de partage / page cadeau"
      >
        {busy === "public" ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />}
        Lien de partage
      </button>

      {isPublic && shareUrl && (
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(shareUrl).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-semibold ${base}`}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copié" : "Copier le lien"}
        </button>
      )}

      <a
        href={`/api/songs/${song.id}/download`}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-semibold ${base}`}
      >
        <Download className="size-3.5" />
        MP3
      </a>
      <Link
        href={`/studio/${song.id}`}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-semibold ${base}`}
      >
        <Clapperboard className="size-3.5" />
        Clip
      </Link>
      <Link
        href={`/mes-chansons/${song.id}`}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-semibold ${base}`}
      >
        <Settings2 className="size-3.5" />
        Gérer
      </Link>
    </div>
  );
}
