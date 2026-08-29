import type { SystemHealth } from "@/lib/admin";
import type { AppError } from "@/lib/domain";

const REAL = new Set(["suno", "claude", "moneroo", "brevo"]);

function Badge({ value }: { value: string }) {
  const real = REAL.has(value);
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        real ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
      }`}
    >
      {real ? value : `${value} (simulé)`}
    </span>
  );
}

export function SystemPanel({
  health,
  errors,
}: {
  health: SystemHealth;
  errors: AppError[];
}) {
  const lowSuno =
    health.integrations.music === "suno" &&
    health.sunoBalance !== null &&
    health.sunoBalance <= 0;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="font-display text-lg font-bold">Intégrations</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            ["Musique", health.integrations.music],
            ["Paroles", health.integrations.lyrics],
            ["Paiement", health.integrations.payments],
            ["Email", health.integrations.email],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="text-ink-soft">{label}</span>
              <Badge value={value} />
            </div>
          ))}
        </div>
        {health.integrations.music === "suno" && (
          <p className={`mt-3 text-sm ${lowSuno ? "font-semibold text-brand-strong" : "text-ink-soft"}`}>
            Solde sunoapi.org : {health.sunoBalance ?? "injoignable"}
            {lowSuno && " — recharge nécessaire, les générations échouent et sont remboursées."}
          </p>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["En génération", health.generating],
          ["Assets à synchroniser", health.assetsPending],
          ["Échecs (7 j)", health.failed7d],
        ].map(([label, n]) => (
          <div key={label} className="rounded-2xl border border-line bg-white p-4 text-center">
            <p className="font-display text-2xl font-extrabold">{n}</p>
            <p className="text-xs text-ink-soft">{label}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="font-display text-lg font-bold">Journal d&apos;erreurs</h2>
        {errors.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
            Aucune erreur enregistrée. 🎉
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-white">
            {errors.map((e) => (
              <li key={e.id} className="px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs font-semibold text-brand-strong">
                    {e.context}
                  </span>
                  <span className="shrink-0 text-xs text-ink-soft">
                    {new Date(e.created_at).toLocaleString("fr-FR")}
                  </span>
                </div>
                <p className="mt-1 text-ink-soft">{e.message}</p>
                {e.detail && (
                  <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-cream-deep p-2 text-[11px] text-ink-soft/80">
                    {e.detail}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
