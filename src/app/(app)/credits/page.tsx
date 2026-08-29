import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, Coins, Sparkles } from "lucide-react";
import { PackPicker } from "@/components/credits/pack-picker";
import { getBalance, getCreditsPerSong, getPacks } from "@/lib/credits";
import { getUserLoyalty } from "@/lib/loyalty";
import { getCurrentUser } from "@/lib/supabase/server";
import { paymentMethods } from "@/lib/site";

export const metadata: Metadata = { title: "Crédits", robots: { index: false } };

type Props = { searchParams: Promise<{ paid?: string; next?: string }> };

export default async function CreditsPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/credits");

  const { paid, next } = await searchParams;
  const [packs, creditsPerSong, balance, loyalty] = await Promise.all([
    getPacks(),
    getCreditsPerSong(),
    getBalance(user.id),
    getUserLoyalty(user.id),
  ]);

  const safeNext = next && next.startsWith("/") ? next : undefined;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:py-10">
      <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
        Acheter des crédits
      </h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
        <Coins className="size-4 text-gold" />
        Solde actuel : <span className="font-semibold text-ink">{balance} crédits</span>
      </p>

      {paid === "1" && (
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          <Check className="size-4" />
          Paiement pris en compte. Tes crédits sont à jour.
          {safeNext && (
            <Link href={safeNext} className="ml-auto font-semibold underline">
              Continuer
            </Link>
          )}
        </div>
      )}

      {loyalty.tier && (
        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-brand/25 bg-brand/5 px-4 py-3 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-brand-strong">
            <Sparkles className="size-4" />
            Palier {loyalty.tier.name}
          </span>
          {loyalty.discountPct > 0 ? (
            <span className="text-ink-soft">
              −{loyalty.discountPct}% appliqué sur tous les packs ci-dessous.
            </span>
          ) : (
            <span className="text-ink-soft">Crée des chansons pour débloquer des remises.</span>
          )}
          {loyalty.nextTier && (
            <span className="text-ink-soft">
              Encore {loyalty.songsToNext} chanson{loyalty.songsToNext > 1 ? "s" : ""} pour{" "}
              {loyalty.nextTier.name} (−{loyalty.nextTier.discount_pct}%).
            </span>
          )}
        </div>
      )}

      <div className="mt-8">
        <PackPicker
          packs={packs}
          creditsPerSong={creditsPerSong}
          discountPct={loyalty.discountPct}
          next={safeNext}
        />
      </div>

      <div className="mt-10 rounded-3xl border border-line bg-white p-6">
        <h2 className="font-display text-lg font-bold">Comment ça marche</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-soft">
          <li className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-brand-strong" />
            1 chanson = {creditsPerSong} crédit{creditsPerSong > 1 ? "s" : ""}, tout inclus (MP3,
            pochette, 2 versions).
          </li>
          <li className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-brand-strong" />
            Tes crédits n&apos;expirent jamais.
          </li>
          <li className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-brand-strong" />
            Paiement sécurisé via Moneroo.
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft/80">
          {paymentMethods.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
