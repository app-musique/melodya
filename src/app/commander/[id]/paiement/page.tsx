import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { PaymentReturn } from "@/components/wizard/payment-return";
import { getOwnedSong } from "@/lib/songs";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mock?: string }>;
};

export const metadata = { title: "Paiement", robots: { index: false } };

export default async function PaiementPage({ params, searchParams }: Props) {
  if (!isSupabaseConfigured) redirect("/connexion");
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  const { id } = await params;
  const { mock } = await searchParams;

  const song = await getOwnedSong(id);
  if (!song) redirect("/mes-chansons");
  if (["paid", "generating", "ready"].includes(song.status)) {
    redirect(`/mes-chansons/${id}`);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <AppHeader />
      <main className="flex flex-1 items-center justify-center px-5 py-16">
        <PaymentReturn songId={id} mock={mock === "1"} />
      </main>
    </div>
  );
}
