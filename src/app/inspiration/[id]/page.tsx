import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InspirationView } from "@/components/explore/inspiration-view";
import { getExploreSong } from "@/lib/explore";
import { isSupabaseConfigured } from "@/lib/env";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isSupabaseConfigured) return { title: "Inspiration" };
  const { id } = await params;
  const item = await getExploreSong(id);
  if (!item) return { title: "Chanson introuvable" };

  return {
    title: `${item.title} — écoute`,
    description: `${item.occasion ?? "Une chanson"} · ${item.style ?? "Muzikii"}. Écoute cette chanson personnalisée et crée la tienne avec Muzikii.`,
    openGraph: {
      title: item.title,
      description: `${item.occasion ?? "Une chanson"} · ${item.style ?? "Muzikii"}`,
      images: [`/api/cover/${item.id}`],
    },
  };
}

export default async function InspirationPage({ params }: Props) {
  if (!isSupabaseConfigured) notFound();
  const { id } = await params;
  const item = await getExploreSong(id);
  if (!item) notFound();
  return <InspirationView item={item} />;
}
