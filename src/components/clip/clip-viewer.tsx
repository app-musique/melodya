"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Share2 } from "lucide-react";
import { ClipStage } from "@/components/clip/clip-stage";
import { Logo } from "@/components/logo";
import type { LyricsTiming } from "@/lib/domain";

export function ClipViewer({
  slug,
  lyrics,
  timing,
  audioUrl,
  photos,
  cover,
  dedication,
  recipientName,
  occasion,
  createHref,
}: {
  slug: string;
  lyrics: string;
  timing: LyricsTiming | null;
  audioUrl: string | null;
  photos: string[];
  cover: string;
  dedication: string | null;
  recipientName: string | null;
  occasion: string | null;
  createHref: string;
}) {
  const [shared, setShared] = useState(false);

  async function share() {
    const url = `${window.location.origin}/cadeau/${slug}/clip`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Un clip pour toi", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {}
  }

  return (
    <div className="flex min-h-dvh flex-col items-center bg-plum px-5 py-6 text-cream">
      <header className="w-full max-w-md">
        <Logo className="text-cream" />
      </header>

      <main className="flex w-full max-w-md flex-1 flex-col items-center justify-center py-6">
        <ClipStage
          lyrics={lyrics}
          timing={timing}
          audioUrl={audioUrl}
          photos={photos}
          cover={cover}
          dedication={dedication}
          recipientName={recipientName}
          occasion={occasion}
          frameClassName="max-w-[340px]"
        />

        <button
          onClick={share}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-cream"
        >
          <Share2 className="size-4" />
          {shared ? "Lien copié" : "Partager"}
        </button>
      </main>

      <section className="w-full max-w-md rounded-3xl border border-gold/30 bg-white/5 p-6 text-center">
        <p className="font-display text-xl font-bold">Touché ? Crée la tienne.</p>
        <p className="mt-1 text-sm text-cream/70">
          Une chanson personnalisée pour quelqu&apos;un que tu aimes, en quelques minutes.
        </p>
        <Link
          href={createHref}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-bold text-plum"
        >
          Créer ma chanson
          <ArrowRight className="size-4" />
        </Link>
      </section>

      <footer className="mt-6 text-xs text-cream/50">
        Créée avec{" "}
        <Link href="/" className="font-semibold text-gold">
          Melodya
        </Link>
      </footer>
    </div>
  );
}
