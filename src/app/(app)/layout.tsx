import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { getCurrentUser } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/credits";
import { isSupabaseConfigured } from "@/lib/env";
import type { Profile } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) redirect("/connexion");
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  const profile: Profile =
    (await getCurrentProfile()) ?? {
      id: user.id,
      full_name: null,
      phone: null,
      country: null,
      is_admin: false,
      credit_balance: 0,
      created_at: "",
      updated_at: "",
    };

  return (
    <AppShell profile={profile} email={user.email ?? ""}>
      {children}
    </AppShell>
  );
}
