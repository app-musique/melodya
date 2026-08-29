"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2, Pause, Play } from "lucide-react";
import type { LyricsTiming } from "@/lib/domain";
import { activeLineIndex, parseLyricLines, type LyricLine } from "@/lib/lyrics-sync";

type Aspect = "9:16" | "1:1";

const proxied = (url: string) => `/api/img?u=${encodeURIComponent(url)}`;

const REC_MIMES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4",
];

const canRecord =
  typeof window !== "undefined" &&
  typeof MediaRecorder !== "undefined" &&
  typeof HTMLCanvasElement !== "undefined" &&
  typeof HTMLCanvasElement.prototype.captureStream === "function";

export function ClipStage({
  lyrics,
  timing,
  audioUrl,
  photos,
  cover,
  dedication,
  recipientName,
  occasion,
  frameClassName = "max-w-[300px]",
}: {
  lyrics: string;
  timing: LyricsTiming | null;
  audioUrl: string | null;
  photos: string[];
  cover: string;
  dedication: string | null;
  recipientName: string | null;
  occasion: string | null;
  frameClassName?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const imgsRef = useRef<HTMLImageElement[]>([]);
  const rafRef = useRef(0);

  const [playing, setPlaying] = useState(false);
  const [imgsReady, setImgsReady] = useState(0);
  const [recording, setRecording] = useState<Aspect | null>(null);
  const [recProgress, setRecProgress] = useState(0);
  const [recError, setRecError] = useState<string | null>(null);

  // --- préchargement des images (photos + pochette en secours) ---
  useEffect(() => {
    const urls = photos.length ? photos : [cover];
    const loaded: HTMLImageElement[] = [];
    let alive = true;
    let done = 0;
    urls.forEach((u, i) => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = im.onerror = () => {
        done += 1;
        if (alive) setImgsReady(done);
      };
      im.src = proxied(u);
      loaded[i] = im;
    });
    imgsRef.current = loaded;
    return () => {
      alive = false;
    };
  }, [photos, cover]);

  // --- fonction de dessin d'une frame ---
  const paint = useCallback(
    (ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dur: number) => {
      const lines = parseLyricLines(lyrics, timing, dur || 1);
      const imgs = imgsRef.current.filter((im) => im.complete && im.naturalWidth > 0);

      // fond dégradé
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#2a1338");
      g.addColorStop(1, "#4b2064");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // photo(s) plein cadre + léger Ken Burns + fondu enchaîné
      if (imgs.length) {
        const win = Math.max(3.5, (dur || imgs.length * 4) / imgs.length);
        const pos = t / win;
        const idx = Math.floor(pos) % imgs.length;
        const frac = pos - Math.floor(pos);
        const fade = imgs.length > 1 ? Math.min(1, frac / 0.14) : 1;
        const prev = (idx - 1 + imgs.length) % imgs.length;

        const drawCover = (im: HTMLImageElement, zoom: number, alpha: number) => {
          const s = Math.max(W / im.naturalWidth, H / im.naturalHeight) * zoom;
          const w = im.naturalWidth * s;
          const h = im.naturalHeight * s;
          ctx.globalAlpha = alpha;
          ctx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
          ctx.globalAlpha = 1;
        };
        if (imgs.length > 1 && fade < 1) drawCover(imgs[prev], 1.06, 1);
        drawCover(imgs[idx], 1 + 0.08 * (imgs.length > 1 ? frac : t / (dur || 60)), fade);
      }

      // voile pour lisibilité
      const scrim = ctx.createLinearGradient(0, 0, 0, H);
      scrim.addColorStop(0, "rgba(20,8,28,0.55)");
      scrim.addColorStop(0.32, "rgba(20,8,28,0.12)");
      scrim.addColorStop(0.6, "rgba(20,8,28,0.35)");
      scrim.addColorStop(1, "rgba(20,8,28,0.9)");
      ctx.fillStyle = scrim;
      ctx.fillRect(0, 0, W, H);

      ctx.textAlign = "center";
      const base = W / 720; // échelle typographique

      // occasion (haut)
      if (occasion) {
        ctx.fillStyle = "#f0c869";
        ctx.font = `700 ${Math.round(21 * base)}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
        ctx.fillText(occasion.toUpperCase().slice(0, 40), W / 2, 92 * base);
      }

      // paroles (centre)
      const ai = activeLineIndex(lines, t);
      const active = lines[ai];
      const nextLyric = (from: number) => {
        for (let i = from + 1; i < lines.length; i++) if (!lines[i].isSection) return lines[i];
        return null;
      };
      const prevLyric = (from: number) => {
        for (let i = from - 1; i >= 0; i--) if (!lines[i].isSection) return lines[i];
        return null;
      };
      const cy = H * 0.52;
      const drawWrapped = (
        line: LyricLine | null,
        y: number,
        size: number,
        color: string,
        weight: number,
      ) => {
        if (!line) return;
        ctx.fillStyle = color;
        ctx.font = `${weight} ${Math.round(size * base)}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
        const rows = wrap(ctx, line.text, W * 0.84);
        const lh = size * base * 1.2;
        rows.forEach((r, i) => ctx.fillText(r, W / 2, y + i * lh));
      };
      drawWrapped(prevLyric(ai), cy - 96 * base, 26, "rgba(255,255,255,0.42)", 500);
      drawWrapped(active ?? lines.find((l) => !l.isSection) ?? null, cy, 40, "#ffffff", 700);
      drawWrapped(nextLyric(ai), cy + 104 * base, 26, "rgba(255,255,255,0.6)", 500);

      // destinataire + dédicace (bas)
      let by = H - 210 * base;
      if (recipientName) {
        ctx.fillStyle = "#f0c869";
        ctx.font = `800 ${Math.round(30 * base)}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
        ctx.fillText(`Pour ${recipientName}`, W / 2, by);
        by += 40 * base;
      }
      if (dedication) {
        ctx.fillStyle = "rgba(255,244,230,0.9)";
        ctx.font = `400 ${Math.round(21 * base)}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
        wrap(ctx, dedication, W * 0.82)
          .slice(0, 3)
          .forEach((r, i) => ctx.fillText(r, W / 2, by + i * 27 * base));
      }

      // barre de progression
      const px0 = W * 0.08;
      const px1 = W * 0.92;
      const py = H - 64 * base;
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      round(ctx, px0, py, px1 - px0, 4 * base, 2 * base);
      ctx.fillStyle = "#f0c869";
      const pw = dur > 0 ? Math.min(1, t / dur) : 0;
      round(ctx, px0, py, (px1 - px0) * pw, 4 * base, 2 * base);

      // wordmark
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255,244,230,0.5)";
      ctx.font = `700 ${Math.round(15 * base)}px system-ui, -apple-system, sans-serif`;
      ctx.fillText("Melodya", px0, H - 34 * base);
      ctx.textAlign = "center";
    },
    [lyrics, timing, occasion, dedication, recipientName],
  );

  // --- boucle d'aperçu ---
  const renderPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dur = audio?.duration && Number.isFinite(audio.duration) ? audio.duration : 60;
    paint(ctx, canvas.width, canvas.height, audio?.currentTime ?? 0, dur);
  }, [paint]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview, imgsReady]);

  useEffect(() => {
    if (!playing) return;
    const loop = () => {
      renderPreview();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, renderPreview]);

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      void a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  }

  // --- enregistrement vidéo ---
  const record = useCallback(
    async (aspect: Aspect) => {
      if (!audioUrl || recording) return;
      setRecError(null);
      setRecording(aspect);
      setRecProgress(0);

      const [W, H] = aspect === "9:16" ? [720, 1280] : [1080, 1080];
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const cx = c.getContext("2d")!;

      const a = new Audio();
      a.crossOrigin = "anonymous";
      a.preload = "auto";
      a.src = audioUrl;

      let ac: AudioContext | null = null;
      let raf = 0;
      try {
        await new Promise<void>((res, rej) => {
          a.oncanplaythrough = () => res();
          a.onerror = () => rej(new Error("audio"));
          a.load();
          setTimeout(() => res(), 6000); // ne bloque pas indéfiniment
        });

        const AC: typeof AudioContext =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ac = new AC();
        const source = ac.createMediaElementSource(a);
        const dest = ac.createMediaStreamDestination();
        source.connect(dest);

        const stream = c.captureStream(30);
        dest.stream.getAudioTracks().forEach((tk) => stream.addTrack(tk));

        const mime = REC_MIMES.find((m) => MediaRecorder.isTypeSupported(m));
        if (!mime) throw new Error("format vidéo non supporté par ce navigateur");

        const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
        const chunks: BlobPart[] = [];
        rec.ondataavailable = (e) => {
          if (e.data.size) chunks.push(e.data);
        };
        const stopped = new Promise<Blob>((res) => {
          rec.onstop = () => res(new Blob(chunks, { type: mime.startsWith("video/mp4") ? "video/mp4" : "video/webm" }));
        });

        const dur = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : 60;
        const tick = () => {
          paint(cx, W, H, a.currentTime, dur);
          setRecProgress(Math.min(1, a.currentTime / dur));
          raf = requestAnimationFrame(tick);
        };

        a.currentTime = 0;
        await ac.resume().catch(() => {});
        rec.start(200);
        await a.play();
        tick();
        await new Promise<void>((res) => {
          a.onended = () => res();
        });
        cancelAnimationFrame(raf);
        rec.stop();
        const blob = await stopped;

        const ext = mime.startsWith("video/mp4") ? "mp4" : "webm";
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `melodya-clip-${aspect.replace(":", "x")}.${ext}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 15_000);
      } catch (err) {
        cancelAnimationFrame(raf);
        setRecError((err as Error).message || "échec de la génération");
      } finally {
        ac?.close().catch(() => {});
        setRecording(null);
        setRecProgress(0);
        renderPreview();
      }
    },
    [audioUrl, recording, paint, renderPreview],
  );

  return (
    <div className="w-full">
      <div
        className={`relative mx-auto aspect-[9/16] w-full overflow-hidden rounded-2xl bg-plum shadow-[var(--shadow-float)] ${frameClassName}`}
      >
        <canvas
          ref={canvasRef}
          width={720}
          height={1280}
          className="h-full w-full"
        />
        {audioUrl && (
          <button
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Lecture"}
            className="absolute inset-0 grid place-items-center"
          >
            {!playing && (
              <span className="grid size-14 place-items-center rounded-full bg-white/90 text-plum shadow-lg">
                <Play className="size-6 translate-x-0.5" />
              </span>
            )}
          </button>
        )}
        {playing && (
          <button
            onClick={togglePlay}
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/40 text-white"
            aria-label="Pause"
          >
            <Pause className="size-4" />
          </button>
        )}
        {recording && (
          <div className="absolute inset-0 grid place-items-center bg-plum/85 px-6 text-center text-cream">
            <div>
              <Loader2 className="mx-auto size-6 animate-spin" />
              <p className="mt-3 text-sm font-semibold">
                Génération de la vidéo — {Math.round(recProgress * 100)}%
              </p>
              <p className="mt-1 text-xs text-cream/70">
                Garde cet onglet ouvert et au premier plan.
              </p>
            </div>
          </div>
        )}
      </div>

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onEnded={() => setPlaying(false)}
          onLoadedMetadata={renderPreview}
          className="hidden"
        >
          <track kind="captions" />
        </audio>
      )}

      {canRecord && audioUrl && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => record("9:16")}
            disabled={!!recording}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            <Download className="size-4" />
            Vidéo 9:16
          </button>
          <button
            onClick={() => record("1:1")}
            disabled={!!recording}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            <Download className="size-4" />
            Vidéo 1:1
          </button>
        </div>
      )}
      {recError && (
        <p className="mt-2 text-center text-xs font-medium text-brand-strong">{recError}</p>
      )}
      {canRecord && audioUrl && (
        <p className="mt-2 text-center text-xs text-ink-soft">
          La vidéo se génère pendant la lecture complète de la chanson (~2 min).
        </p>
      )}
    </div>
  );
}

// --- utilitaires canvas ---

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const rows: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      rows.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) rows.push(line);
  return rows;
}

function round(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (w <= 0) return;
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.fill();
}
