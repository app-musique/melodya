import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { UnsubscribeButton } from "@/components/creator/unsubscribe-button";

export const metadata: Metadata = { title: "Se désabonner", robots: { index: false } };

type Props = { params: Promise<{ token: string }> };

export default async function UnsubscribePage({ params }: Props) {
  const { token } = await params;

  return (
    <div className="flex min-h-dvh flex-col bg-plum text-cream">
      <header className="mx-auto w-full max-w-2xl px-5 py-6">
        <Link href="/">
          <Logo className="text-cream" />
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-16 text-center">
        <h1 className="font-display text-2xl font-extrabold">Se désabonner</h1>
        <p className="mt-2 text-sm text-cream/70">
          Tu ne recevras plus les emails quand ce créateur publie une nouvelle chanson.
        </p>
        <UnsubscribeButton token={token} />
        <Link href="/" className="mt-6 text-sm text-cream/60 hover:text-cream">
          Retour à l&apos;accueil
        </Link>
      </main>
    </div>
  );
}
