import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarHeart } from "lucide-react";
import { OccasionsManager } from "@/components/occasions/occasions-manager";
import { getCurrentUser } from "@/lib/supabase/server";
import { listOccasions } from "@/lib/occasions";

export const metadata: Metadata = { title: "Occasions", robots: { index: false } };

export default async function OccasionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  const occasions = await listOccasions(user.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:py-10">
      <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight">
        <CalendarHeart className="size-6 text-brand-strong" />
        Carnet d&apos;occasions
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Note les dates à ne pas oublier. On te prévient à l&apos;avance pour que tu aies le
        temps de créer une chanson.
      </p>
      <div className="mt-8">
        <OccasionsManager initial={occasions} />
      </div>
    </div>
  );
}
