import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { getCurrentUser } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/credits";
import { syncOccasionNotifications, unreadCount } from "@/lib/notifications";
import { isSupabaseConfigured } from "@/lib/env";
import type { Profile } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) redirect("/connexion");
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  // Génère les rappels d'occasions AVANT de compter les non-lues (badge à jour).
  await syncOccasionNotifications(user.id).catch(() => {});

  const [profileData, unread] = await Promise.all([
    getCurrentProfile(),
    unreadCount(user.id),
  ]);

  const profile: Profile = profileData ?? {
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
    <AppShell profile={profile} email={user.email ?? ""} unread={unread}>
      {children}
    </AppShell>
  );
}
