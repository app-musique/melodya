import Link from "next/link";
import { StatusBadge } from "@/components/song/status-badge";
import { listAllSongs } from "@/lib/admin";

export const metadata = { title: "Commandes · Admin", robots: { index: false } };

export default async function AdminCommandesPage() {
  const songs = await listAllSongs(150);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Commandes</h1>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Client</th>
              <th className="px-4 py-3 font-semibold">Destinataire</th>
              <th className="px-4 py-3 font-semibold">Occasion</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {songs.map((s) => (
              <tr key={s.id} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-3 text-ink-soft">
                  {new Date(s.created_at).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-4 py-3">{s.email ?? "—"}</td>
                <td className="px-4 py-3">{s.recipient_name ?? "—"}</td>
                <td className="px-4 py-3">{s.occasion ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={s.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/chansons/${s.id}`}
                    className="text-xs font-semibold text-brand-strong"
                  >
                    Ouvrir
                  </Link>
                </td>
              </tr>
            ))}
            {songs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-soft">
                  Aucune commande.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
