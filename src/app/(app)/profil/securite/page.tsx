import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, KeyRound } from "lucide-react";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mot de passe", robots: { index: false } };

export default async function SecuritePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/profil/securite");

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:py-10">
      <Link
        href="/profil/parametres"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Réglages
      </Link>

      <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight">
        <KeyRound className="size-5 text-brand-strong" />
        Mot de passe
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        Définis ou change ton mot de passe. Tu pourras te connecter avec {user.email} et ce mot de
        passe, en plus de « Continuer avec Google ».
      </p>

      <div className="mt-6 rounded-3xl border border-line bg-white p-6">
        <SetPasswordForm />
      </div>
    </div>
  );
}
