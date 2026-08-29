import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GiftViewTracker } from "@/components/gift/gift-view-tracker";
import { ClipViewer } from "@/components/clip/clip-viewer";
import { getPublicClip } from "@/lib/clip";
import { isSupabaseConfigured } from "@/lib/env";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = {
  title: "Clip cadeau",
  robots: { index: false },
};

export default async function GiftClipPage({ params }: Props) {
  if (!isSupabaseConfigured) notFound();
  const { slug } = await params;
  const clip = await getPublicClip(slug);
  if (!clip || !clip.song.lyrics) notFound();

  const { song } = clip;
  const lyrics = song.lyrics ?? "";
  const params2 = new URLSearchParams();
  if (clip.ownerReferralCode) params2.set("ref", clip.ownerReferralCode);
  params2.set("inspire", song.id);
  if (song.occasion) params2.set("occasion", song.occasion);

  return (
    <>
      <GiftViewTracker slug={slug} />
      <ClipViewer
        slug={slug}
        lyrics={lyrics}
        timing={clip.timing}
        audioUrl={clip.audioUrl}
        photos={clip.photos}
        cover={clip.cover}
        dedication={clip.dedication}
        recipientName={song.recipient_name}
        occasion={song.occasion}
        createHref={`/commander?${params2.toString()}`}
      />
    </>
  );
}
