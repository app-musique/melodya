"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, Share2 } from "lucide-react";
import { PhotoManager } from "@/components/clip/photo-manager";
import { ClipStage } from "@/components/clip/clip-stage";
import type { LyricsTiming, SongPhoto } from "@/lib/domain";

export function ClipWorkshop({
  songId,
  initialPhotos,
  initialDedication,
  lyrics,
  timing,
  audioUrl,
  cover,
  recipientName,
  occasion,
  initialSlug,
  initialPublic,
}: {
  songId: string;
  initialPhotos: SongPhoto[];
  initialDedication: string;
  lyrics: string;
  timing: LyricsTiming | null;
  audioUrl: string | null;
  cover: string;
  recipientName: string | null;
  occasion: string | null;
  initialSlug: string | null;
  initialPublic: boolean;
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [dedication, setDedication] = useState(initialDedication);
  const [savedDedication, setSavedDedication] = useState<"idle" | "saving" | "saved">("idle");
  const [slug, setSlug] = useState(initialSlug);
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveDedication = useCallback(
    (value: string) => {
      if (timer.current) clearTimeout(timer.current);
      setSavedDedication("saving");
      timer.current = setTimeout(async () => {
        await fetch(`/api/songs/${songId}/clip`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dedication: value }),
        }).catch(() => {});
        setSavedDedication("saved");
        setTimeout(() => setSavedDedication("idle"), 1500);
      }, 700);
    },
    [songId],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function enableShare() {
    setSharing(true);
    const res = await fetch(`/api/songs/${songId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_public: true }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      setIsPublic(true);
      if (j.slug) setSlug(j.slug);
    }
    setSharing(false);
  }

  const clipUrl =
    typeof window !== "undefined" && slug ? `${window.location.origin}/cadeau/${slug}/clip` : "";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section>
          <h2 className="font-display text-lg font-bold">Photos</h2>
          <p className="mb-3 text-sm text-ink-soft">
            Ajoute jusqu&apos;à 6 photos — elles apparaissent en fond, en fondu.
          </p>
          <PhotoManager
            songId={songId}
            photos={photos}
            onAdd={(p) => setPhotos((list) => [...list, p])}
            onRemove={(id) => setPhotos((list) => list.filter((x) => x.id !== id))}
          />
        </section>

        <section>
          <h2 className="font-display text-lg font-bold">Dédicace</h2>
          <p className="mb-2 text-sm text-ink-soft">Un mot affiché en bas du clip (optionnel).</p>
          <textarea
            value={dedication}
            maxLength={300}
            rows={3}
            onChange={(e) => {
              setDedication(e.target.value);
              saveDedication(e.target.value);
            }}
            placeholder="Joyeux anniversaire mon amour, merci pour ces 10 années…"
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-brand"
          />
          <p className="mt-1 h-4 text-xs text-ink-soft">
            {savedDedication === "saving"
              ? "Enregistrement…"
              : savedDedication === "saved"
                ? "Enregistré ✓"
                : `${dedication.length}/300`}
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center gap-2">
            <Share2 className="size-4 text-brand-strong" />
            <h2 className="font-display text-lg font-bold">Partager le clip</h2>
          </div>
          {isPublic && slug ? (
            <>
              <p className="mt-1 text-sm text-ink-soft">
                Envoie ce lien : la page joue le clip en plein écran.
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-cream-deep p-3">
                <input
                  readOnly
                  value={clipUrl}
                  className="flex-1 bg-transparent text-xs outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(clipUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-strong"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Copié" : "Copier"}
                </button>
              </div>
              <a
                href={`/cadeau/${slug}/clip`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong"
              >
                <ExternalLink className="size-4" />
                Ouvrir la page clip
              </a>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-ink-soft">
                Active la page cadeau pour obtenir un lien de clip partageable.
              </p>
              <button
                onClick={enableShare}
                disabled={sharing}
                className="mt-3 inline-flex items-center gap-2 rounded-full gradient-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
              >
                {sharing && <Loader2 className="size-4 animate-spin" />}
                Activer le partage
              </button>
            </>
          )}
        </section>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-ink-soft">
          Aperçu
        </p>
        <ClipStage
          lyrics={lyrics}
          timing={timing}
          audioUrl={audioUrl}
          photos={photos.map((p) => p.url)}
          cover={cover}
          dedication={dedication.trim() || null}
          recipientName={recipientName}
          occasion={occasion}
        />
      </div>
    </div>
  );
}
