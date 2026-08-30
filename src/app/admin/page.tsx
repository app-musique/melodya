import { STATUS_LABEL, type SongStatus } from "@/lib/domain";
import { getAdminStats } from "@/lib/admin";
import { formatXOF } from "@/lib/pricing";

export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminHome() {
  const s = await getAdminStats();

  const money = [
    { label: "Chiffre d'affaires", value: formatXOF(s.revenue), hint: `${formatXOF(s.revenue30d)} sur 30 j` },
    { label: "Crédits vendus", value: s.creditsSold, hint: `${s.creditsSold30d} sur 30 j` },
    { label: "Clients payants", value: s.payingCustomers, hint: `${s.ordersPaid} achat${s.ordersPaid > 1 ? "s" : ""}` },
    { label: "Panier moyen", value: formatXOF(s.avgOrderValue), hint: "par achat" },
  ];

  const activity = [
    { label: "Utilisateurs", value: s.users, hint: `+${s.newUsers30d} sur 30 j` },
    { label: "Chansons", value: s.songsTotal, hint: `+${s.songs30d} sur 30 j` },
    { label: "Chansons prêtes", value: s.songsReady, hint: `${s.songsTotal ? Math.round((s.songsReady / s.songsTotal) * 100) : 0}% du total` },
    { label: "En échec", value: s.songsByStatus.failed ?? 0, hint: "à surveiller" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Vue d&apos;ensemble</h1>

      {s.testRevenueExcluded > 0 && (
        <p className="rounded-xl bg-brand/10 px-4 py-2.5 text-xs text-brand-strong">
          {formatXOF(s.testRevenueExcluded)} de paiements de test sont exclus de ces compteurs
          (visibles dans l&apos;onglet Achats).
        </p>
      )}

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Revenus
        </h2>
        <div className="grid gap-3 sm:grid-cols-4">
          {money.map((t) => (
            <div key={t.label} className="rounded-2xl border border-line bg-white p-4">
              <p className="text-xs text-ink-soft">{t.label}</p>
              <p className="mt-1 font-display text-xl font-extrabold">{t.value}</p>
              <p className="mt-0.5 text-[11px] text-ink-soft/80">{t.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Activité
        </h2>
        <div className="grid gap-3 sm:grid-cols-4">
          {activity.map((t) => (
            <div key={t.label} className="rounded-2xl border border-line bg-white p-4">
              <p className="text-xs text-ink-soft">{t.label}</p>
              <p className="mt-1 font-display text-xl font-extrabold">{t.value}</p>
              <p className="mt-0.5 text-[11px] text-ink-soft/80">{t.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-2xl border border-line bg-white p-5">
        <h2 className="font-display text-lg font-bold">Chansons par statut</h2>
        <ul className="mt-3 space-y-1.5 text-sm">
          {(Object.keys(STATUS_LABEL) as SongStatus[]).map((st) => (
            <li key={st} className="flex justify-between">
              <span className="text-ink-soft">{STATUS_LABEL[st]}</span>
              <span className="font-semibold">{s.songsByStatus[st] ?? 0}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
