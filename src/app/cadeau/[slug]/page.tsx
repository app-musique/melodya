import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clapperboard } from "lucide-react";
import { Logo } from "@/components/logo";
import { GiftReactions } from "@/components/gift/gift-reactions";
import { GiftViewTracker } from "@/components/gift/gift-view-tracker";
import { getPublicGift } from "@/lib/songs";
import { isSupabaseConfigured } from "@/lib/env";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isSupabaseConfigured) return { title: "Cadeau" };
  const { slug } = await params;
  const gift = await getPublicGift(slug);
  if (!gift) return { title: "Cadeau introuvable" };

  const title = gift.song.recipient_name
    ? `Une chanson pour ${gift.song.recipient_name}`
    : gift.song.title || "Une chanson personnalisée";
  return {
    title,
    description: `${gift.song.occasion ?? "Un moment spécial"} — une chanson personnalisée créée avec Muzikii.`,
    openGraph: {
      title,
      images: gift.cover ? [gift.cover] : [`/api/cover/${gift.song.id}`],
    },
    robots: { index: false },
  };
}

export default async function GiftPage({ params }: Props) {
  if (!isSupabaseConfigured) notFound();
  const { slug } = await params;
  const gift = await getPublicGift(slug);
  if (!gift) notFound();

  const { song, version } = gift;

  const createParams = new URLSearchParams();
  if (gift.ownerReferralCode) createParams.set("ref", gift.ownerReferralCode);
  createParams.set("inspire", song.id);
  if (song.occasion) createParams.set("occasion", song.occasion);
  const createHref = `/commander?${createParams.toString()}`;

  return (
    <div className="flex min-h-dvh flex-col bg-plum text-cream">
      <GiftViewTracker slug={slug} />
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-6">
        <Logo className="text-cream" />
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-gold">
          {song.occasion ?? "Pour toi"}
        </p>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight sm:text-5xl">
          {song.recipient_name ? (
            <>
              {song.recipient_name},<br /> cette chanson est pour toi
            </>
          ) : (
            song.title || "Cette chanson"
          )}
        </h1>
        {song.sender_name && (
          <p className="mt-4 text-cream/70">De la part de {song.sender_name}</p>
        )}

        <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          {gift.cover && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={gift.cover}
              alt=""
              className="mx-auto mb-5 aspect-[1200/630] w-full rounded-2xl object-cover"
            />
          )}
          {version ? (
            <audio controls preload="none" src={version.audio_url} className="w-full">
              <track kind="captions" />
            </audio>
          ) : (
            <p className="text-sm text-cream/70">La chanson sera bientôt disponible.</p>
          )}
        </div>

        {version && (
          <Link
            href={`/cadeau/${slug}/clip`}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-white/5"
          >
            <Clapperboard className="size-4 text-gold" />
            Voir en clip vidéo
          </Link>
        )}

        {song.lyrics && (
          <pre className="mt-8 whitespace-pre-wrap text-left font-sans text-sm leading-relaxed text-cream/80">
            {song.lyrics}
          </pre>
        )}

        <GiftReactions slug={slug} initial={gift.reactions} />

        <div className="mt-12 rounded-3xl border border-gold/30 bg-white/5 p-6 text-center">
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
        </div>

        <div className="mt-8 border-t border-white/10 pt-6 text-sm text-cream/60">
          Créée avec{" "}
          <Link href="/" className="font-semibold text-gold">
            Muzikii
          </Link>{" "}
          — ta chanson personnalisée par IA.
        </div>
      </main>
    </div>
  );
}
