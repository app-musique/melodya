import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/components/song/status-badge";
import { AdminSongPlayer } from "@/components/admin/admin-song-player";
import { getAdminSongDetail } from "@/lib/admin";

export const metadata = { title: "Chanson · Admin", robots: { index: false } };

type Props = { params: Promise<{ id: string }> };

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/60 py-2 last:border-0">
      <span className="text-ink-soft">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}

export default async function AdminSongPage({ params }: Props) {
  const { id } = await params;
  const detail = await getAdminSongDetail(id);
  if (!detail) notFound();

  const { song, versions, ownerEmail } = detail;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <Link
        href="/admin/commandes"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Commandes
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            {song.title || song.recipient_name || "Chanson"}
          </h1>
          <p className="text-sm text-ink-soft">{ownerEmail ?? song.user_id}</p>
        </div>
        <StatusBadge status={song.status} />
      </header>

      <AdminSongPlayer versions={versions} />

      <section className="rounded-2xl border border-line bg-white p-5 text-sm">
        <h2 className="mb-2 font-display text-base font-bold">Détails</h2>
        <Row label="Occasion" value={song.occasion} />
        <Row label="Destinataire" value={song.recipient_name} />
        <Row label="Expéditeur" value={song.sender_name} />
        <Row label="Style" value={song.music_style} />
        <Row label="Ambiance" value={song.mood} />
        <Row label="Voix" value={song.voice} />
        <Row label="Langue" value={song.language} />
        <Row label="Dans « s'inspirer »" value={song.in_explore ? "oui" : "non"} />
        <Row label="Lien public" value={song.is_public ? "actif" : "privé"} />
        <Row label="Créée le" value={new Date(song.created_at).toLocaleString("fr-FR")} />
      </section>

      {song.lyrics && (
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="mb-2 font-display text-base font-bold">Paroles</h2>
          <pre className="whitespace-pre-wrap font-sans text-sm text-ink-soft">{song.lyrics}</pre>
        </section>
      )}
    </div>
  );
}
