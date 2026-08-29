import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Song } from "@/lib/domain";

export async function getAdminStats() {
  const admin = createAdminClient();
  const [{ count: users }, songsRes, paymentsRes] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("songs").select("status"),
    admin.from("payments").select("amount, credits, status"),
  ]);

  const songs = (songsRes.data as { status: string }[]) ?? [];
  const payments =
    (paymentsRes.data as { amount: number; credits: number | null; status: string }[]) ?? [];

  const byStatus: Record<string, number> = {};
  for (const s of songs) byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;

  const paid = payments.filter((p) => p.status === "success");
  const revenue = paid.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const creditsSold = paid.reduce((sum, p) => sum + (p.credits ?? 0), 0);

  return {
    users: users ?? 0,
    songsTotal: songs.length,
    songsByStatus: byStatus,
    revenue,
    creditsSold,
  };
}

export type AdminSongRow = Pick<
  Song,
  "id" | "status" | "occasion" | "recipient_name" | "created_at"
> & { email: string | null };

export async function listAllSongs(limit = 100): Promise<AdminSongRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("songs")
    .select("id, user_id, status, occasion, recipient_name, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (data as (AdminSongRow & { user_id: string })[]) ?? [];
  return Promise.all(
    rows.map(async (r) => {
      const { data: u } = await admin.auth.admin.getUserById(r.user_id);
      return {
        id: r.id,
        status: r.status,
        occasion: r.occasion,
        recipient_name: r.recipient_name,
        created_at: r.created_at,
        email: u.user?.email ?? null,
      };
    }),
  );
}
