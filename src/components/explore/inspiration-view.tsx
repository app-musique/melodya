"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, Headphones, Pause, Play, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { SyncedLyrics } from "@/components/explore/synced-lyrics";
import { FollowButton } from "@/components/creator/follow-button";
import { REACTION_EMOJIS } from "@/lib/domain";
import type { ExploreDetail } from "@/lib/explore";
import type { CreatorMini } from "@/lib/follows";

function fmt(s: number) {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/** Identifiant d'auditeur, stable par navigateur (anti double-comptage). */
function reactorKey(): string {
  try {
    const k = "muzikii_rid";
    let v = localStorage.getItem(k);
    if (!v || !/^[A-Za-z0-9_-]{8,64}$/.test(v)) {
      v = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
      localStorage.setItem(k, v);
    }
    return v;
  } catch {
    return `anon-${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function InspirationView({
  item,
  creator,
  isLoggedIn,
  following,
  selfCreator,
}: {
  item: ExploreDetail;
  creator: CreatorMini | null;
  isLoggedIn: boolean;
  following: boolean;
  selfCreator: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [copied, setCopied] = useState(false);
  const counted = useRef(false);

  const [counts, setCounts] = useState<Record<string, number>>(item.reactionsByEmoji);
  const [mine, setMine] = useState<string | null>(null);
  const [reacting, setReacting] = useState(false);

  const total = useMemo(
    () => Object.values(counts).reduce((a, b) => a + b, 0),
    [counts],
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  // Restaure la réaction de ce navigateur (API navigateur — pas dispo au SSR).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`muzikii_react_${item.id}`);
      if (saved) setMine(saved);
    } catch {
      /* ignore */
    }
  }, [item.id]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
      a.play().catch(() => {});
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

  const react = useCallback(
    async (emoji: string) => {
      if (reacting || emoji === mine) return;
      setReacting(true);
      const prev = mine;
      // Optimiste : retire l'ancien vote, ajoute le nouveau.
      setCounts((c) => ({
        ...c,
        [emoji]: (c[emoji] ?? 0) + 1,
        ...(prev ? { [prev]: Math.max((c[prev] ?? 0) - 1, 0) } : {}),
      }));
      setMine(emoji);
      try {
        localStorage.setItem(`muzikii_react_${item.id}`, emoji);
      } catch {
        /* ignore */
      }
      try {
        const res = await fetch(`/api/inspiration/${item.id}/react`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji, reactorKey: reactorKey() }),
        });
        const j = await res.json();
        if (res.ok && j.summary?.byEmoji) setCounts(j.summary.byEmoji);
      } catch {
        /* garde l'optimiste */
      } finally {
        setReacting(false);
      }
    },
    [reacting, mine, item.id],
  );

  function share() {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const pct = duration ? (time / duration) * 100 : 0;
  const createHref = `/commander?inspire=${item.id}${item.occasion ? `&occasion=${encodeURIComponent(item.occasion)}` : ""}`;

  return (
    <div className="min-h-dvh bg-plum text-cream">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-6">
        <Link href="/">
          <Logo className="text-cream" />
        </Link>
        <Link
          href={createHref}
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
        >
          Créer ma chanson
        </Link>
      </header>

      <div className="mx-auto max-w-5xl px-5 pb-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          {/* Colonne lecteur */}
          <div>
            <div className="grid aspect-square w-full max-w-sm place-items-center rounded-3xl bg-gradient-to-br from-brand/80 to-brand-strong">
              <span className="px-6 text-center font-display text-2xl font-extrabold text-white/90">
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
                      {playing ? <Pause className="size-6" /> : <Play className="size-6 translate-x-0.5" />}
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

              {/* Créateur — n'importe qui peut s'abonner, même sans compte */}
              {creator && (
                <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Link href={`/createur/${creator.handle}`} className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand/80 to-brand-strong text-sm font-extrabold">
                      {creator.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs text-cream/50">Par</span>
                      <span className="block truncate font-semibold">{creator.name}</span>
                    </span>
                  </Link>
                  {selfCreator ? (
                    <span className="shrink-0 text-xs text-cream/50">C&apos;est toi 🎤</span>
                  ) : (
                    <div className="shrink-0">
                      <FollowButton
                        handle={creator.handle}
                        isLoggedIn={isLoggedIn}
                        initialFollowing={following}
                        initialCount={creator.followerCount}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Réactions — visibles par tous, ouvertes à tous */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold">
                  {total > 0 ? (
                    <>
                      {total} réaction{total > 1 ? "s" : ""}
                    </>
                  ) : (
                    "Sois le premier à réagir"
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {REACTION_EMOJIS.map((e) => {
                    const n = counts[e] ?? 0;
                    const active = mine === e;
                    return (
                      <button
                        key={e}
                        type="button"
                        onClick={() => react(e)}
                        disabled={reacting}
                        aria-pressed={active}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-60 ${
                          active
                            ? "border-gold bg-gold/15 text-cream"
                            : "border-white/15 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        <span className="text-base leading-none">{e}</span>
                        {n > 0 && <span className="text-xs tabular-nums text-cream/70">{n}</span>}
                      </button>
                    );
                  })}
                </div>
                {mine && <p className="mt-2 text-xs text-cream/50">Ta réaction est enregistrée 💛</p>}
              </div>

              <Link
                href={createHref}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 font-semibold text-plum transition-transform hover:-translate-y-0.5"
              >
                <Sparkles className="size-4" />
                Créer la mienne dans ce style
              </Link>
              <p className="mt-2 text-center text-xs text-cream/50">
                Ta chanson personnalisée, prête en quelques minutes.
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

        <div className="mt-12 flex items-center justify-between border-t border-white/10 pt-6 text-sm text-cream/60">
          <Link href="/explorer" className="hover:text-cream">
            ← Explorer d&apos;autres chansons
          </Link>
          <Link href={createHref} className="inline-flex items-center gap-1.5 font-semibold text-gold">
            Créer ma chanson <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
