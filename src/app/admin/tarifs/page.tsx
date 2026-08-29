import { PricingEditor } from "@/components/admin/pricing-editor";
import { getAllPacks, getSettings } from "@/lib/credits";

export const metadata = { title: "Tarifs · Admin", robots: { index: false } };

export default async function AdminTarifsPage() {
  const [packs, settings] = await Promise.all([getAllPacks(), getSettings()]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Tarifs</h1>
      <PricingEditor initialPacks={packs} initialSettings={settings} />
    </div>
  );
}
