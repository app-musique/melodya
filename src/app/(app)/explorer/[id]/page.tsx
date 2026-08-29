import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExplorePlayer } from "@/components/explore/explore-player";
import { getExploreSong } from "@/lib/explore";

export const metadata: Metadata = { title: "Écoute", robots: { index: false } };

type Props = { params: Promise<{ id: string }> };

export default async function ExploreSongPage({ params }: Props) {
  const { id } = await params;
  const item = await getExploreSong(id);
  if (!item) notFound();
  return <ExplorePlayer item={item} />;
}
