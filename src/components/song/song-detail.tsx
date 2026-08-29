"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Clapperboard,
  Clock,
  Copy,
  Download,
  Eye,
  Headphones,
  Loader2,
  Music4,
  RefreshCw,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui";
import { StatusBadge } from "@/components/song/status-badge";
import type { GiftReaction, Song, SongAsset, SongVersion } from "@/lib/domain";

type Bundle = {
  song: Song;
  versions: SongVersion[];
  assets: SongAsset[];
  reactions: GiftReaction[];
};

export function SongDetail({ initial }: { initial: Bundle }) {
  const [bundle, setBundle] = useState<Bundle>(initial);
  const { song, versions } = bundle;
  const polling = song.status === "generating" || song.status === "paid";

  const poll = useCallback(async () => {
    const res = await fetch(`/api/songs/${song.id}/status`);
    if (res.ok) setBundle(await res.json());
  }, [song.id]);

  useEffect(() => {
    if (!polling) return;
    let active = true;
    const tick = async () => {
      const res = await fetch(`/api/songs/${song.id}/status`);
      if (active && res.ok) setBundle(await res.json());
    };
    void tick();
    const handle = setInterval(tick, 4000);
    return () => {
      active = false;
      clearInterval(handle);
    };
  }, [polling, song.id]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            {song.recipient_name || "Ta chanson"}
          </h1>
          <p className="text-sm text-ink-soft">
            {song.occasion || "—"} · {song.music_style || "—"} · {song.mood || "—"}
          </p>
        </div>
        <StatusBadge status={song.status} />
      </header>

      {(song.status === "paid" || song.status === "generating") && (
        <Card>
          <div className="flex items-center gap-3">
            <Loader2 className="size-5 animate-spin text-brand" />
            <div>
              <p className="font-semibold">Création en cours…</p>
              <p className="text-sm text-ink-soft">
                Notre studio IA compose plusieurs versions. Ça prend en général quelques minutes —
                reste sur cette page, elle se met à jour toute seule.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-ink-soft">
            <Clock className="size-3.5" />
            Lancé{" "}
            {song.generation_started_at
              ? new Date(song.generation_started_at).toLocaleString("fr-FR")
              : "à l'instant"}
          </div>
        </Card>
      )}

      {song.status === "failed" && (
        <Card>
          <p className="font-semibold text-brand-strong">La génération a échoué</p>
          <p className="mt-1 text-sm text-ink-soft">{song.error || "Erreur inconnue."}</p>
          <RetryButton songId={song.id} onDone={poll} />
        </Card>
      )}

      {song.status === "ready" && versions.length > 0 && (
        <>
          <VersionPicker bundle={bundle} onChange={setBundle} />
          <ShareCard song={song} />
          <Link
            href={`/studio/${song.id}`}
            className="flex items-center gap-3 rounded-3xl border border-line bg-white p-5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl gradient-brand text-white">
              <Clapperboard className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block font-display font-bold">Créer le clip vidéo</span>
              <span className="block text-sm text-ink-soft">
                Paroles animées + photos + dédicace, à partager en 9:16 ou 1:1
              </span>
            </span>
          </Link>
          {song.is_public && <ImpactCard song={song} reactions={bundle.reactions} />}
        </>
      )}

      {song.lyrics && (
        <Card>
          <div className="mb-2 flex items-center gap-2">
            <Music4 className="size-4 text-brand-strong" />
            <h2 className="font-display text-lg font-bold">Paroles</h2>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-soft">
            {song.lyrics}
          </pre>
        </Card>
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-6 shadow-[var(--shadow-soft)]">
      {children}
    </div>
  );
}

function ImpactCard({ song, reactions }: { song: Song; reactions: GiftReaction[] }) {
  return (
    <Card>
      <h2 className="font-display text-lg font-bold">L&apos;impact de ton cadeau</h2>
      <div className="mt-3 flex gap-6 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <Eye className="size-4 text-brand-strong" />
          <b>{song.gift_view_count}</b> ouverture{song.gift_view_count === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Headphones className="size-4 text-brand-strong" />
          <b>{song.plays_count}</b> écoute{song.plays_count === 1 ? "" : "s"}
        </span>
      </div>

      {reactions.length > 0 ? (
        <ul className="mt-4 space-y-3 border-t border-line pt-4">
          {reactions.map((r) => (
            <li key={r.id} className="flex gap-3 text-sm">
              <span className="text-xl">{r.emoji}</span>
              <span className="min-w-0">
                {r.message && <span className="block">« {r.message} »</span>}
                <span className="text-xs text-ink-soft">
                  {r.author_name || "Anonyme"} ·{" "}
                  {new Date(r.created_at).toLocaleDateString("fr-FR")}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-ink-soft">
          Pas encore de réaction. Elles apparaîtront ici quand ton destinataire laissera un mot
          sur la page cadeau.
        </p>
      )}
    </Card>
  );
}

function RetryButton({ songId, onDone }: { songId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      loading={busy}
      className="mt-4"
      onClick={async () => {
        setBusy(true);
        await fetch(`/api/songs/${songId}/generate`, { method: "POST" });
        await onDone();
        setBusy(false);
      }}
    >
      <RefreshCw className="size-4" />
      Relancer la création
    </Button>
  );
}

function VersionPicker({
  bundle,
  onChange,
}: {
  bundle: Bundle;
  onChange: (b: Bundle) => void;
}) {
  const { song, versions } = bundle;
  const [saving, setSaving] = useState<string | null>(null);

  async function select(versionId: string) {
    setSaving(versionId);
    const res = await fetch(`/api/songs/${song.id}/select-version`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId }),
    });
    if (res.ok) {
      onChange({
        ...bundle,
        versions: versions.map((v) => ({ ...v, is_selected: v.id === versionId })),
      });
    }
    setSaving(null);
  }

  return (
    <Card>
      <h2 className="font-display text-lg font-bold">
        {versions.length > 1 ? `Tes ${versions.length} versions` : "Ta chanson"}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Écoute-les, choisis ta préférée, puis télécharge.
      </p>
      <ul className="mt-4 space-y-3">
        {versions.map((v) => (
          <li
            key={v.id}
            className={`rounded-2xl border p-4 transition-colors ${
              v.is_selected ? "border-brand bg-brand/5" : "border-line"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">Version {v.idx}</span>
              {v.is_selected ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-strong">
                  <Check className="size-3.5" />
                  Choisie
                </span>
              ) : (
                <button
                  onClick={() => select(v.id)}
                  disabled={saving !== null}
                  className="text-xs font-semibold text-ink-soft hover:text-ink"
                >
                  {saving === v.id ? "…" : "Choisir celle-ci"}
                </button>
              )}
            </div>
            <audio controls preload="none" src={v.audio_url} className="mt-3 w-full">
              <track kind="captions" />
            </audio>
            <a
              href={`/api/songs/${song.id}/download?v=${v.id}`}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-strong"
            >
              <Download className="size-3.5" />
              Télécharger la version {v.idx}
            </a>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-3 border-t border-line pt-4">
        <a
          href={`/api/cover/${song.id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink"
        >
          <Download className="size-4" />
          Pochette
        </a>
      </div>
    </Card>
  );
}

function ShareCard({ song }: { song: Song }) {
  const [isPublic, setIsPublic] = useState(song.is_public);
  const [slug, setSlug] = useState(song.gift_slug);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== "undefined" && slug ? `${window.location.origin}/cadeau/${slug}` : "";

  async function toggle(value: boolean) {
    setBusy(true);
    const res = await fetch(`/api/songs/${song.id}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_public: value }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      setIsPublic(value);
      if (j.slug) setSlug(j.slug);
    }
    setBusy(false);
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Share2 className="size-4 text-brand-strong" />
        <h2 className="font-display text-lg font-bold">Page cadeau</h2>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        Active un lien public avec dédicace et lecteur, à envoyer à la personne le jour J.
      </p>

      <label className="mt-4 flex items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          checked={isPublic}
          disabled={busy}
          onChange={(e) => toggle(e.target.checked)}
          className="size-4"
        />
        Rendre la page cadeau publique
      </label>

      {isPublic && url && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-cream-deep p-3">
          <input readOnly value={url} className="flex-1 bg-transparent text-xs outline-none" />
          <button
            onClick={() => {
              navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-strong"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copié" : "Copier"}
          </button>
        </div>
      )}
    </Card>
  );
}
