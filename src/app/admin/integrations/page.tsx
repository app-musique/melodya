import { IntegrationsEditor } from "@/components/admin/integrations-editor";
import { env } from "@/lib/env";
import { getFacebookConfig } from "@/lib/integrations";

export const metadata = { title: "Intégrations · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  const fb = await getFacebookConfig();
  const hint = fb.capiToken
    ? fb.capiToken.length > 4
      ? `••••${fb.capiToken.slice(-4)}`
      : "••••"
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Intégrations</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Clés des services externes, modifiables sans redéploiement.
        </p>
      </div>

      <IntegrationsEditor
        facebook={{
          pixelId: fb.pixelId ?? "",
          testEventCode: fb.testEventCode ?? "",
          capiTokenSet: !!fb.capiToken,
          capiTokenHint: hint,
          source: fb.source,
          envLocked: !!(env.facebookPixelId || env.facebookCapiToken),
        }}
      />
    </div>
  );
}
