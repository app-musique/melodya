import { json } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { registerGiftView } from "@/lib/songs";

type Params = { params: Promise<{ slug: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { slug } = await params;
  const admin = createAdminClient();
  const { data } = await admin
    .from("songs")
    .select("id, user_id, recipient_name")
    .eq("gift_slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (data) {
    const s = data as { id: string; user_id: string; recipient_name: string | null };
    try {
      await registerGiftView(s.id, s.user_id, s.recipient_name);
    } catch {
      // best effort
    }
  }
  return json({ ok: true });
}
