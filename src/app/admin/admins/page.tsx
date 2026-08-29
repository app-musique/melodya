import { AdminsManager } from "@/components/admin/admins-manager";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Admins · Admin", robots: { index: false } };

export default async function AdminAdminsPage() {
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("is_admin", true);

  const initial = await Promise.all(
    ((profiles as { id: string; full_name: string | null }[]) ?? []).map(async (p) => {
      const { data } = await admin.auth.admin.getUserById(p.id);
      return { id: p.id, full_name: p.full_name, email: data.user?.email ?? null };
    }),
  );

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Admins</h1>
      <p className="text-sm text-ink-soft">
        Un admin peut modifier les tarifs, voir toutes les commandes et nommer d&apos;autres
        admins.
      </p>
      <AdminsManager initial={initial} />
    </div>
  );
}
