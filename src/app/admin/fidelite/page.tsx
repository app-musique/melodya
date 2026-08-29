import { LoyaltyEditor } from "@/components/admin/loyalty-editor";
import { getReferralSettings } from "@/lib/credits";
import { getTiers } from "@/lib/loyalty";

export const metadata = { title: "Fidélité · Admin", robots: { index: false } };

export default async function AdminFidelitePage() {
  const [tiers, referral] = await Promise.all([getTiers(), getReferralSettings()]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Fidélité &amp; parrainage</h1>
      <LoyaltyEditor initialTiers={tiers} initialReferral={referral} />
    </div>
  );
}
