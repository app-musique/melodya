import { redirect } from "next/navigation";

// L'écoute d'une chanson « s'inspirer » vit désormais sur une page publique
// partageable (/inspiration/[id]). On redirige les anciens liens.
type Props = { params: Promise<{ id: string }> };

export default async function LegacyExploreSongPage({ params }: Props) {
  const { id } = await params;
  redirect(`/inspiration/${id}`);
}
