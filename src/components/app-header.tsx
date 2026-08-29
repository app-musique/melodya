import Link from "next/link";
import { Logo } from "@/components/logo";
import { AccountNav } from "@/components/account-nav";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function AppHeader() {
  const user = isSupabaseConfigured ? await getCurrentUser() : null;

  return (
    <header className="border-b border-line bg-cream/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <Link href="/" aria-label="Muzikii — accueil">
          <Logo />
        </Link>
        {user ? (
          <AccountNav email={user.email ?? ""} />
        ) : (
          <Link
            href="/connexion"
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold transition-colors hover:bg-cream-deep"
          >
            Connexion
          </Link>
        )}
      </div>
    </header>
  );
}
