import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";

type Params = { params: Promise<{ id: string }> };

const GRADIENTS = [
  ["#ff6a1a", "#e5332a"],
  ["#5b1e46", "#c0567e"],
  ["#1c5b4a", "#4fb98f"],
  ["#8a5a2b", "#e5a44c"],
  ["#3a1533", "#7a2f6d"],
];

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;

  let heading = "Une chanson personnalisée";
  let occasion = "Muzikii";
  let coverUrl: string | null = null;

  if (isSupabaseConfigured) {
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from("songs")
        .select("title, recipient_name, occasion, cover_url")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        const d = data as {
          title: string | null;
          recipient_name: string | null;
          occasion: string | null;
          cover_url: string | null;
        };
        heading = d.recipient_name
          ? `Pour ${d.recipient_name}`
          : d.title || "Une chanson personnalisée";
        occasion = d.occasion || "Muzikii";
        coverUrl = d.cover_url;
      }
    } catch {
      // valeurs par défaut
    }
  }

  // Pochette réelle disponible : on la sert telle quelle (carrée) pour l'aperçu social.
  if (coverUrl) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      ),
      { width: 1200, height: 1200 },
    );
  }

  const hash = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const [from, to] = GRADIENTS[hash % GRADIENTS.length];

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>♫ Muzikii</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 34, opacity: 0.85, letterSpacing: 2 }}>
            {occasion.toUpperCase()}
          </div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, marginTop: 8 }}>
            {heading}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 26, opacity: 0.8 }}>
          Une chanson unique, créée avec l&apos;IA
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
