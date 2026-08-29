import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Clapperboard, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { listSongs } from "@/lib/songs";

export const metadata: Metadata = { title: "Studio clip", robots: { index: false } };

export default async function StudioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/studio");

  const songs = (await listSongs()).filter((s) => s.status === "ready");

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:py-10">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl gradient-brand text-white">
          <Clapperboard className="size-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Studio clip</h1>
          <p className="text-sm text-ink-soft">
            Transforme une chanson en clip vertical à partager : paroles animées, photos et
            dédicace.
          </p>
        </div>
      </div>

      {songs.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-line bg-white p-8 text-center">
          <p className="text-sm text-ink-soft">
            Aucune chanson prête pour l&apos;instant. Crée d&apos;abord une chanson.
          </p>
          <Link
            href="/commander"
            className="mt-4 inline-flex items-center gap-2 rounded-full gradient-brand px-5 py-3 text-sm font-semibold text-white"
          >
            <Sparkles className="size-4" />
            Créer une chanson
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {songs.map((s) => (
            <li key={s.id}>
              <Link
                href={`/studio/${s.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 transition-colors hover:bg-cream-deep"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {s.recipient_name || "Chanson"}
                  </span>
                  <span className="block truncate text-xs text-ink-soft">
                    {s.occasion || "—"} · {s.music_style || "—"}
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-brand-strong" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
