import { getSystemHealth, listErrors } from "@/lib/admin";
import { SystemPanel } from "@/components/admin/system-panel";

export const metadata = { title: "Système · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminSystemePage() {
  const [health, errors] = await Promise.all([getSystemHealth(), listErrors(50)]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Système</h1>
      <SystemPanel health={health} errors={errors} />
    </div>
  );
}
