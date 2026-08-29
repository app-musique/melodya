import { STATUS_LABEL, type SongStatus } from "@/lib/domain";
import { getAdminStats } from "@/lib/admin";
import { formatXOF } from "@/lib/pricing";

export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminHome() {
  const s = await getAdminStats();

  const tiles = [
    { label: "Utilisateurs", value: s.users },
    { label: "Chansons", value: s.songsTotal },
    { label: "Crédits vendus", value: s.creditsSold },
    { label: "Chiffre d'affaires", value: formatXOF(s.revenue) },
  ];

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Vue d&apos;ensemble</h1>

      <div className="grid gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-xs text-ink-soft">{t.label}</p>
            <p className="mt-1 font-display text-xl font-extrabold">{t.value}</p>
          </div>
        ))}
      </div>

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
