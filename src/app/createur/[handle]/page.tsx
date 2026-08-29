import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Headphones, Heart, Music4 } from "lucide-react";
import { Logo } from "@/components/logo";
import { Cover } from "@/components/explore/cover";
import { FollowButton } from "@/components/creator/follow-button";
import { getCreatorByHandle, isUserFollowing } from "@/lib/follows";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isSupabaseConfigured) return { title: "Créateur" };
  const { handle } = await params;
  const creator = await getCreatorByHandle(handle);
  if (!creator) return { title: "Créateur introuvable" };
  return {
    title: `${creator.name} — créateur sur Muzikii`,
    description: `${creator.songCount} chanson${creator.songCount > 1 ? "s" : ""} · ${creator.followerCount} abonné${
      creator.followerCount > 1 ? "s" : ""
    }. Abonne-toi pour être prévenu à chaque nouvelle chanson.`,
    openGraph: { title: `${creator.name} sur Muzikii` },
  };
}

export default async function CreatorPage({ params }: Props) {
  if (!isSupabaseConfigured) notFound();
  const { handle } = await params;
  const creator = await getCreatorByHandle(handle);
  if (!creator) notFound();

  const user = await getCurrentUser();
  const following = user ? await isUserFollowing(creator.id, user.id) : false;

  return (
    <div className="min-h-dvh bg-plum text-cream">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-6">
        <Link href="/">
          <Logo className="text-cream" />
        </Link>
        <Link href="/explorer" className="text-sm text-cream/70 hover:text-cream">
          Explorer
        </Link>
      </header>

      <div className="mx-auto max-w-4xl px-5 pb-16">
        <div className="flex flex-col items-center text-center">
          <span className="grid size-20 place-items-center rounded-full bg-gradient-to-br from-brand/80 to-brand-strong text-2xl font-extrabold">
            {creator.name.charAt(0).toUpperCase()}
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold">{creator.name}</h1>
          <p className="mt-1 text-sm text-cream/60">
            {creator.songCount} chanson{creator.songCount > 1 ? "s" : ""} partagée
            {creator.songCount > 1 ? "s" : ""}
          </p>
          <div className="mt-5">
            <FollowButton
              handle={creator.handle}
              isLoggedIn={!!user}
              initialFollowing={following}
              initialCount={creator.followerCount}
            />
          </div>
        </div>

        {creator.songs.length === 0 ? (
          <p className="mt-14 rounded-3xl border border-dashed border-white/15 p-10 text-center text-sm text-cream/60">
            Ce créateur n&apos;a pas encore partagé de chanson avec ses abonnés.
            Abonne-toi pour être prévenu dès la première.
          </p>
        ) : (
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {creator.songs.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/inspiration/${s.id}`}
                  className="group block overflow-hidden rounded-3xl border border-white/10 bg-white/5 transition-transform hover:-translate-y-0.5"
                >
                  <Cover
                    id={s.id}
                    occasion={s.occasion}
                    image={s.coverImage}
                    className="aspect-square w-full"
                  />
                  <div className="p-4">
                    <p className="font-display text-base font-bold">{s.title}</p>
                    <p className="mt-1 flex items-center gap-3 text-xs text-cream/50">
                      <span className="inline-flex items-center gap-1">
                        <Music4 className="size-3.5" />
                        {s.style ?? "—"}
                      </span>
                      {s.reactions > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Heart className="size-3.5" />
                          {s.reactions}
                        </span>
                      )}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-14 border-t border-white/10 pt-6 text-center text-sm text-cream/60">
          <Headphones className="mx-auto mb-2 size-5" />
          Crée ta propre chanson personnalisée sur{" "}
          <Link href="/" className="font-semibold text-gold">
            Muzikii
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
