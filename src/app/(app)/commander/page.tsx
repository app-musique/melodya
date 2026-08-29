import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wizard } from "@/components/wizard/wizard";
import { createDraft } from "@/lib/songs";
import { getBalance, getCreditsPerSong } from "@/lib/credits";
import { getInspiration } from "@/lib/explore";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Créer ma chanson",
  robots: { index: false },
};

type Props = {
  searchParams: Promise<{ inspire?: string; occasion?: string; recipient?: string }>;
};

export default async function CommanderPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/commander");

  const song = await createDraft();
  if (song.status !== "draft") {
    redirect(`/mes-chansons/${song.id}`);
  }

  // Pré-remplissage (occasion / destinataire / inspiration d'une chanson vitrine).
  const { inspire, occasion, recipient } = await searchParams;
  const patch: Record<string, unknown> = {};
  if (occasion && !song.occasion) patch.occasion = occasion.slice(0, 60);
  if (recipient && !song.recipient_name) patch.recipient_name = recipient.slice(0, 80);
  if (inspire && !song.music_style) {
    const insp = await getInspiration(inspire);
    if (insp) {
      if (insp.music_style) patch.music_style = insp.music_style;
      if (insp.mood) patch.mood = insp.mood;
      if (insp.voice) patch.voice = insp.voice;
      if (insp.language) patch.language = insp.language;
    }
  }
  let current = song;
  if (Object.keys(patch).length) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("songs")
      .update(patch)
      .eq("id", song.id)
      .eq("status", "draft")
      .select("*")
      .single();
    if (data) current = data as typeof song;
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
      <Wizard song={current} balance={balance} creditsPerSong={creditsPerSong} />
    </div>
  );
}
