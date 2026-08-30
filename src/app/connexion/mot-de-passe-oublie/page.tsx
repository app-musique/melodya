import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MotDePasseOubliePage() {
  if (isSupabaseConfigured) {
    const user = await getCurrentUser();
    if (user) redirect("/profil/securite");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <AppHeader />
      <main className="flex flex-1 items-center justify-center px-5 py-14">
        <div className="w-full max-w-md">
          <h1 className="text-center font-display text-2xl font-extrabold tracking-tight">
            Mot de passe oublié
          </h1>
          <div className="mt-8 rounded-3xl border border-line bg-cream-deep/50 p-6 sm:p-8">
            <ForgotPasswordForm />
          </div>
        </div>
      </main>
    </div>
  );
}
