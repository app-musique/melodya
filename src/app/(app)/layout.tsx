import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { getCurrentUser } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/credits";
import { unreadCount } from "@/lib/notifications";
import { onAppEnter } from "@/lib/app-enter";
import { isSupabaseConfigured } from "@/lib/env";
import type { Profile } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) redirect("/connexion");
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  // Rappels d'occasions, rattachement parrainage, email de bienvenue —
  // AVANT de compter les non-lues (badge à jour).
  await onAppEnter(user.id).catch(() => {});

  const [profileData, unread] = await Promise.all([
    getCurrentProfile(),
    unreadCount(user.id),
  ]);

  const profile: Profile = profileData ?? {
    id: user.id,
    full_name: null,
    handle: null,
    phone: null,
    country: null,
    is_admin: false,
    credit_balance: 0,
    referral_code: null,
    referred_by: null,
    referral_rewarded: false,
    email_notifications: true,
    welcomed_at: null,
    created_at: "",
    updated_at: "",
  };

  return (
    <AppShell profile={profile} email={user.email ?? ""} unread={unread}>
      {children}
    </AppShell>
  );
}
