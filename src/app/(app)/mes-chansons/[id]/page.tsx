import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SongDetail } from "@/components/song/song-detail";
import { getSongBundle } from "@/lib/songs";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ma chanson", robots: { index: false } };

type Props = { params: Promise<{ id: string }> };

export default async function SongPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/mes-chansons");

  const { id } = await params;
  const bundle = await getSongBundle(id);
  if (!bundle) notFound();

  if (bundle.song.status === "draft") redirect("/commander");

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:py-10">
      <Link
        href="/mes-chansons"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Mes chansons
      </Link>
      <SongDetail initial={bundle} />
    </div>
  );
}
