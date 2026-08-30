import { PaymentsTable } from "@/components/admin/payments-table";
import { getAdminStats, listPayments } from "@/lib/admin";
import { formatXOF } from "@/lib/pricing";

export const metadata = { title: "Achats · Admin", robots: { index: false } };

export default async function AdminAchatsPage() {
  const [rows, stats] = await Promise.all([listPayments(300), getAdminStats()]);

  const real = rows.filter((r) => !r.is_test);
  const tiles = [
    { label: "Achats réels (payés)", value: stats.ordersPaid },
    { label: "CA réel", value: formatXOF(stats.revenue) },
    { label: "Crédits vendus (réels)", value: stats.creditsSold },
    { label: "Lignes de test", value: rows.length - real.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Achats de crédits</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Chaque tentative de paiement est tracée. Les lignes marquées « Test » sont exclues des
          compteurs du panneau. Bascule Réel / Test au bout de chaque ligne.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-xs text-ink-soft">{t.label}</p>
            <p className="mt-1 font-display text-xl font-extrabold">{t.value}</p>
          </div>
        ))}
      </div>

      <PaymentsTable rows={rows} />
    </div>
  );
}
