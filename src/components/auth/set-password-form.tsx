"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SetPasswordForm() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Choisis un mot de passe d'au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(
        /session|jwt|expired/i.test(error.message)
          ? "Ton lien a expiré. Redemande un email de réinitialisation."
          : error.message,
      );
      return;
    }
    setDone(true);
    setPassword("");
    setConfirm("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink-soft">Nouveau mot de passe</span>
        <input
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-line bg-white px-4 py-3 outline-none transition-colors focus:border-brand"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink-soft">Confirme le mot de passe</span>
        <input
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-xl border border-line bg-white px-4 py-3 outline-none transition-colors focus:border-brand"
        />
      </label>

      {error && <p className="text-sm font-medium text-brand-strong">{error}</p>}
      {done && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-green-700">
          <Check className="size-4" />
          Mot de passe mis à jour. Tu peux maintenant te connecter avec.
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl gradient-brand py-3 font-semibold text-white shadow-[var(--shadow-float)] disabled:opacity-70 sm:w-auto sm:px-6"
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        Enregistrer
      </button>
    </form>
  );
}
