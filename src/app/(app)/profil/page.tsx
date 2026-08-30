import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Coins, Music4, Settings, Sparkles } from "lucide-react";
import { ReferralCard } from "@/components/profile/referral-card";
import { getCurrentUser } from "@/lib/supabase/server";
import { getCurrentProfile, listTransactions } from "@/lib/credits";
import { getUserLoyalty } from "@/lib/loyalty";
import { getReferralStats } from "@/lib/referral";
import { getFollowStats } from "@/lib/follows";
import { listSongs } from "@/lib/songs";
import { env } from "@/lib/env";
import type { CreditTransaction } from "@/lib/domain";

export const metadata: Metadata = { title: "Profil", robots: { index: false } };

const REASON_LABEL: Record<CreditTransaction["reason"], string> = {
  purchase: "Achat de crédits",
  song: "Chanson créée",
  bonus: "Bonus de bienvenue",
  refund: "Remboursement",
  referral: "Parrainage",
  adjustment: "Ajustement",
};

export default async function ProfilPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  const [profile, songs, txns, loyalty, referral, followStats] = await Promise.all([
    getCurrentProfile(),
    listSongs(),
    listTransactions(user.id),
    getUserLoyalty(user.id),
    getReferralStats(user.id),
    getFollowStats(user.id),
  ]);

  const loyaltyProgress =
    loyalty.tier && loyalty.nextTier
      ? Math.min(
          100,
          Math.round(
            ((loyalty.creditsPurchased - loyalty.tier.min_credits) /
              Math.max(1, loyalty.nextTier.min_credits - loyalty.tier.min_credits)) *
              100,
          ),
        )
      : 100;

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : "—";
  const songCount = songs.filter((s) => s.status !== "draft").length;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:py-10">
      <div className="flex flex-col items-center text-center">
        <span className="grid size-20 place-items-center rounded-full gradient-brand text-2xl font-bold text-white">
          {(profile?.full_name || user.email || "?").charAt(0).toUpperCase()}
        </span>
        <h1 className="mt-3 font-display text-xl font-extrabold">
          {profile?.full_name || "Mon compte"}
        </h1>
        <p className="max-w-full break-all text-sm text-ink-soft">{user.email}</p>
        {profile?.handle && (
          <Link
            href={`/createur/${profile.handle}`}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-brand-strong"
          >
            Voir mon profil public
            <ArrowRight className="size-3.5" />
          </Link>
        )}
      </div>

      {(followStats.followers > 0 || followStats.following > 0) && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-line bg-white p-4 text-center">
            <p className="font-display text-lg font-extrabold">{followStats.followers}</p>
            <p className="text-xs text-ink-soft">Abonné{followStats.followers > 1 ? "s" : ""}</p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-4 text-center">
            <p className="font-display text-lg font-extrabold">{followStats.following}</p>
            <p className="text-xs text-ink-soft">Abonnements</p>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { label: "Crédits", value: profile?.credit_balance ?? 0 },
          { label: "Chansons", value: songCount },
          { label: "Membre depuis", value: memberSince },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-white p-4 text-center">
            <p className="font-display text-lg font-extrabold">{s.value}</p>
            <p className="text-xs text-ink-soft">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link
          href="/credits"
          className="flex items-center justify-center gap-2 rounded-full gradient-brand px-5 py-3 text-sm font-semibold text-white"
        >
          <Coins className="size-4" />
          Acheter des crédits
        </Link>
        <Link
          href="/mes-chansons"
          className="flex items-center justify-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold"
        >
          <Music4 className="size-4" />
          Mes chansons
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {loyalty.tier && (
          <div className="rounded-2xl border border-line bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-brand-strong" />
              Palier {loyalty.tier.name}
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              {loyalty.discountPct > 0
                ? `−${loyalty.discountPct}% sur les packs de crédits`
                : "Aucune remise pour l'instant"}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-cream-deep">
              <div
                className="h-full rounded-full gradient-brand"
                style={{ width: `${loyaltyProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              {loyalty.nextTier
                ? `Encore ${loyalty.creditsToNext} crédit${
                    loyalty.creditsToNext > 1 ? "s" : ""
                  } acheté${loyalty.creditsToNext > 1 ? "s" : ""} pour ${loyalty.nextTier.name} (−${loyalty.nextTier.discount_pct}%)`
                : "Palier maximum atteint 🎉"}
            </p>
          </div>
        )}

        {profile?.referral_code && (
          <ReferralCard
            code={profile.referral_code}
            siteUrl={env.siteUrl}
            filleuls={referral.filleuls}
            credits={referral.credits}
          />
        )}
      </div>

      <div className="mt-3">
        <Link
          href="/profil/parametres"
          className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 text-sm font-medium hover:bg-cream-deep"
        >
          <span className="flex items-center gap-2">
            <Settings className="size-4" />
            Réglages
          </span>
          <ArrowRight className="size-4 text-ink-soft" />
        </Link>
      </div>

      {txns.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-bold">Historique des crédits</h2>
          <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-white">
            {txns.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  <span className="block font-medium">{REASON_LABEL[t.reason]}</span>
                  <span className="block text-xs text-ink-soft">
                    {new Date(t.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </span>
                <span
                  className={`font-semibold ${t.amount >= 0 ? "text-green-700" : "text-ink-soft"}`}
                >
                  {t.amount >= 0 ? "+" : ""}
                  {t.amount}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
