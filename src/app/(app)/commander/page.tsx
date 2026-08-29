import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wizard } from "@/components/wizard/wizard";
import { createDraft } from "@/lib/songs";
import { getBalance, getCreditsPerSong } from "@/lib/credits";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Créer ma chanson",
  robots: { index: false },
};

export default async function CommanderPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/commander");

  const song = await createDraft();
  if (song.status !== "draft") {
    redirect(`/mes-chansons/${song.id}`);
  }

  const [balance, creditsPerSong] = await Promise.all([
    getBalance(user.id),
    getCreditsPerSong(),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:py-10">
      <h1 className="mb-8 text-center font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
        Crée ta chanson
      </h1>
      <Wizard song={song} balance={balance} creditsPerSong={creditsPerSong} />
    </div>
  );
}
