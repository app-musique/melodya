"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { MAX_CLIP_PHOTOS, type SongPhoto } from "@/lib/domain";

async function downscale(file: File, maxDim = 1440): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return await new Promise<Blob>((res) =>
    c.toBlob((b) => res(b ?? file), "image/jpeg", 0.85),
  );
}

export function PhotoManager({
  songId,
  photos,
  onAdd,
  onRemove,
}: {
  songId: string;
  photos: SongPhoto[];
  onAdd: (photo: SongPhoto) => void;
  onRemove: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setError(null);
    setBusy(true);
    try {
      let slots = MAX_CLIP_PHOTOS - photos.length;
      for (const file of Array.from(files)) {
        if (slots <= 0) break;
        if (!file.type.startsWith("image/")) continue;
        const blob = await downscale(file);
        const fd = new FormData();
        fd.append("file", blob, "photo.jpg");
        const res = await fetch(`/api/songs/${songId}/photos`, { method: "POST", body: fd });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(j.error ?? "Envoi impossible");
          break;
        }
        onAdd(j.photo as SongPhoto);
        slots -= 1;
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(id: string) {
    onRemove(id);
    await fetch(`/api/songs/${songId}/photos/${id}`, { method: "DELETE" }).catch(() => {});
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((p) => (
          <div
            key={p.id}
            className="group relative aspect-square overflow-hidden rounded-xl border border-line"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" className="h-full w-full object-cover" />
            <button
              onClick={() => remove(p.id)}
              className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Retirer"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}

        {photos.length < MAX_CLIP_PHOTOS && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="grid aspect-square place-items-center rounded-xl border border-dashed border-line text-ink-soft hover:border-brand/40 hover:text-ink disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />

      <p className="mt-2 text-xs text-ink-soft">
        {photos.length}/{MAX_CLIP_PHOTOS} photos · elles défilent au rythme de la chanson.
      </p>
      {error && <p className="mt-1 text-xs font-medium text-brand-strong">{error}</p>}
    </div>
  );
}
