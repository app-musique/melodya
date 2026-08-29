import { ShowcaseEditor, type ShowcaseRow } from "@/components/admin/showcase-editor";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Vitrines · Admin", robots: { index: false } };

export default async function AdminVitrinesPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("songs")
    .select("id, occasion, recipient_name, music_style, is_showcase, showcase_title, showcase_artist")
    .eq("status", "ready")
    .order("is_showcase", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Vitrines Explorer</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Marque une chanson comme « vitrine » pour qu&apos;elle apparaisse dans Explorer. Le
          titre et l&apos;artiste affichés remplacent le prénom réel du destinataire.
        </p>
      </div>
      <ShowcaseEditor initial={(data as ShowcaseRow[]) ?? []} />
    </div>
  );
}
