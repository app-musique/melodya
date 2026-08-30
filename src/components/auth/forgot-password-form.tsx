"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/profil/securite`,
    });
    setLoading(false);
    // On affiche toujours le même message (ne révèle pas si le compte existe).
    if (error && !/rate limit|redirect/i.test(error.message)) {
      setError("Une erreur est survenue. Réessaie dans un instant.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center">
        <MailCheck className="mx-auto size-8 text-brand-strong" />
        <p className="mt-3 text-sm text-ink">
          Si un compte existe pour <span className="font-semibold">{email}</span>, un lien de
          réinitialisation vient d&apos;être envoyé. Vérifie ta boîte mail (et les spams).
        </p>
        <Link
          href="/connexion"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong"
        >
          <ArrowLeft className="size-4" />
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-ink-soft">
        Saisis ton adresse email : on t&apos;envoie un lien pour choisir un nouveau mot de passe.
      </p>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink-soft">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-line bg-white px-4 py-3 outline-none transition-colors focus:border-brand"
        />
      </label>

      {error && <p className="text-sm font-medium text-brand-strong">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl gradient-brand py-3 font-semibold text-white shadow-[var(--shadow-float)] disabled:opacity-70"
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        Envoyer le lien
      </button>

      <Link
        href="/connexion"
        className="flex items-center justify-center gap-1.5 pt-1 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Retour à la connexion
      </Link>
    </form>
  );
}
