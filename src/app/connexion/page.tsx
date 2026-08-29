import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connecte-toi pour créer et retrouver tes chansons Muzikii.",
};

export const dynamic = "force-dynamic";

export default async function ConnexionPage() {
  if (isSupabaseConfigured) {
    const user = await getCurrentUser();
    if (user) redirect("/tableau-de-bord");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <AppHeader />
      <main className="flex flex-1 items-center justify-center px-5 py-14">
        <div className="w-full max-w-md">
          <h1 className="text-center font-display text-3xl font-extrabold tracking-tight">
            Bienvenue sur <span className="text-gradient-brand">Muzikii</span>
          </h1>
          <p className="mt-2 text-center text-sm text-ink-soft">
            Crée ta chanson personnalisée en quelques minutes.
          </p>

          <div className="mt-8 rounded-3xl border border-line bg-cream-deep/50 p-6 sm:p-8">
            {isSupabaseConfigured ? (
              <Suspense fallback={<div className="h-80 animate-pulse rounded-2xl bg-white/60" />}>
                <AuthForm />
              </Suspense>
            ) : (
              <div className="text-sm leading-relaxed text-ink-soft">
                <p className="font-semibold text-ink">Supabase n&apos;est pas encore configuré.</p>
                <p className="mt-2">
                  Crée un projet Supabase gratuit, applique{" "}
                  <code className="rounded bg-white px-1">supabase/migrations/0001_init.sql</code>,
                  puis renseigne les clés dans <code className="rounded bg-white px-1">.env.local</code>.
                </p>
                <p className="mt-2">
                  Guide complet : <code className="rounded bg-white px-1">supabase/README.md</code>.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
