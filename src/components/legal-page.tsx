import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/app-header";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          Accueil
        </Link>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-ink-soft">Dernière mise à jour : {updated}</p>

        <div className="mt-8 space-y-4 text-sm leading-relaxed text-ink-soft [&_a]:font-medium [&_a]:text-brand-strong [&_h2]:mt-9 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink [&_li]:mt-1 [&_p]:mt-3 [&_strong]:text-ink [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>

        <div className="mt-12 flex gap-4 border-t border-line pt-6 text-sm">
          <Link href="/cgu" className="font-medium text-ink-soft hover:text-ink">
            Conditions d&apos;utilisation
          </Link>
          <Link href="/confidentialite" className="font-medium text-ink-soft hover:text-ink">
            Confidentialité
          </Link>
        </div>
      </main>
    </div>
  );
}
