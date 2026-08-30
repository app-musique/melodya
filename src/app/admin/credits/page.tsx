import { CreditGranter } from "@/components/admin/credit-granter";
import { listCreditGrants } from "@/lib/admin";

export const metadata = { title: "Crédits · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminCreditsPage() {
  const grants = await listCreditGrants(40);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Crédits</h1>

      <CreditGranter />

      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="font-display text-lg font-bold">Derniers ajustements manuels</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Compte</th>
                <th className="px-3 py-2 font-semibold">Crédits</th>
                <th className="px-3 py-2 font-semibold">Solde après</th>
              </tr>
            </thead>
            <tbody>
              {grants.map((g) => (
                <tr key={g.id} className="border-b border-line/60 last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap text-ink-soft">
                    {new Date(g.created_at).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2">{g.email ?? "—"}</td>
                  <td
                    className={`px-3 py-2 font-semibold ${
                      g.amount < 0 ? "text-brand-strong" : "text-green-700"
                    }`}
                  >
                    {g.amount > 0 ? "+" : ""}
                    {g.amount}
                  </td>
                  <td className="px-3 py-2 text-ink-soft">{g.balance_after}</td>
                </tr>
              ))}
              {grants.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-ink-soft">
                    Aucun ajustement pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
