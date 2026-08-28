import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { Wizard } from "@/components/wizard/wizard";
import { createDraft } from "@/lib/songs";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Créer ma chanson",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function CommanderPage() {
  if (!isSupabaseConfigured) redirect("/connexion");
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/commander");

  const song = await createDraft();

  // Une commande déjà payée ne repasse pas par le wizard.
  if (!["draft", "pending_payment"].includes(song.status)) {
    redirect(`/mes-chansons/${song.id}`);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <h1 className="mb-8 text-center font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          Crée ta chanson
        </h1>
        <Wizard song={song} />
      </main>
    </div>
  );
}
