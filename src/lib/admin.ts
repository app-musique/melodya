import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSunoCredits } from "@/lib/music/suno";
import { isMockEmail, isMockLyrics, isMockMusic, isMockPayments } from "@/lib/env";
import type { AppError, Song, SongVersion } from "@/lib/domain";

const DAY = 86_400_000;

export type AdminStats = {
  users: number;
  newUsers30d: number;
  songsTotal: number;
  songsByStatus: Record<string, number>;
  songsReady: number;
  songs30d: number;
  /** Réel : hors paiements marqués `is_test`. */
  revenue: number;
  revenue30d: number;
  creditsSold: number;
  creditsSold30d: number;
  payingCustomers: number;
  avgOrderValue: number;
  ordersPaid: number;
  testRevenueExcluded: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  const admin = createAdminClient();
  const since30 = new Date(Date.now() - 30 * DAY).toISOString();

  const [{ count: users }, { count: newUsers30d }, songsRes, paymentsRes] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since30),
    admin.from("songs").select("status, created_at"),
    admin.from("payments").select("amount, credits, status, is_test, user_id, created_at"),
  ]);

  const songs = (songsRes.data as { status: string; created_at: string }[]) ?? [];
  const payments =
    (paymentsRes.data as {
      amount: number;
      credits: number | null;
      status: string;
      is_test: boolean;
      user_id: string;
      created_at: string;
    }[]) ?? [];

  const byStatus: Record<string, number> = {};
  for (const s of songs) byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;

  const paidAll = payments.filter((p) => p.status === "success");
  const paid = paidAll.filter((p) => !p.is_test);
  const paid30 = paid.filter((p) => p.created_at >= since30);

  const sum = (rows: typeof paid, k: "amount" | "credits") =>
    rows.reduce((s, p) => s + (p[k] ?? 0), 0);

  const revenue = sum(paid, "amount");
  const ordersPaid = paid.length;

  return {
    users: users ?? 0,
    newUsers30d: newUsers30d ?? 0,
    songsTotal: songs.length,
    songsByStatus: byStatus,
    songsReady: byStatus.ready ?? 0,
    songs30d: songs.filter((s) => s.created_at >= since30).length,
    revenue,
    revenue30d: sum(paid30, "amount"),
    creditsSold: sum(paid, "credits"),
    creditsSold30d: sum(paid30, "credits"),
    payingCustomers: new Set(paid.map((p) => p.user_id)).size,
    avgOrderValue: ordersPaid ? Math.round(revenue / ordersPaid) : 0,
    ordersPaid,
    testRevenueExcluded: sum(
      paidAll.filter((p) => p.is_test),
      "amount",
    ),
  };
}

// ------------------------------------------------------------------
// Achats de crédits — journal complet (test inclus, badgé)
// ------------------------------------------------------------------

export type AdminPaymentRow = {
  id: string;
  created_at: string;
  email: string | null;
  packName: string | null;
  amount: number;
  currency: string;
  credits: number | null;
  status: string;
  method: string | null;
  provider: string;
  provider_ref: string | null;
  is_test: boolean;
};

export async function listPayments(limit = 200): Promise<AdminPaymentRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("payments")
    .select(
      "id, user_id, created_at, amount, currency, credits, status, method, provider, provider_ref, is_test, pack_id",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows =
    (data as ({ user_id: string; pack_id: string | null } & Omit<
      AdminPaymentRow,
      "email" | "packName"
    >)[]) ?? [];

  const packIds = [...new Set(rows.map((r) => r.pack_id).filter(Boolean))] as string[];
  const { data: packs } = packIds.length
    ? await admin.from("credit_packs").select("id, name").in("id", packIds)
    : { data: [] };
  const packName = new Map(
    ((packs as { id: string; name: string }[]) ?? []).map((p) => [p.id, p.name]),
  );

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const emailById = new Map<string, string | null>();
  await Promise.all(
    userIds.map(async (uid) => {
      const { data: u } = await admin.auth.admin.getUserById(uid);
      emailById.set(uid, u.user?.email ?? null);
    }),
  );

  return rows.map((r) => ({
    id: r.id,
    created_at: r.created_at,
    email: emailById.get(r.user_id) ?? null,
    packName: r.pack_id ? (packName.get(r.pack_id) ?? null) : null,
    amount: r.amount,
    currency: r.currency,
    credits: r.credits,
    status: r.status,
    method: r.method,
    provider: r.provider,
    provider_ref: r.provider_ref,
    is_test: r.is_test,
  }));
}

export async function setPaymentTest(id: string, isTest: boolean): Promise<void> {
  const admin = createAdminClient();
  await admin.from("payments").update({ is_test: isTest }).eq("id", id);
}

// ------------------------------------------------------------------
// Fiche chanson (admin) — n'importe quelle chanson, service role
// ------------------------------------------------------------------

export type AdminSongDetail = {
  song: Song;
  versions: SongVersion[];
  ownerEmail: string | null;
};

export async function getAdminSongDetail(id: string): Promise<AdminSongDetail | null> {
  const admin = createAdminClient();
  const { data: song } = await admin.from("songs").select("*").eq("id", id).maybeSingle();
  if (!song) return null;

  const [{ data: versions }, { data: u }] = await Promise.all([
    admin.from("song_versions").select("*").eq("song_id", id).order("idx"),
    admin.auth.admin.getUserById((song as Song).user_id),
  ]);

  return {
    song: song as Song,
    versions: (versions as SongVersion[]) ?? [],
    ownerEmail: u.user?.email ?? null,
  };
}

export type SystemHealth = {
  integrations: {
    music: "mock" | "suno";
    lyrics: "template" | "claude";
    payments: "mock" | "moneroo";
    email: "mock" | "brevo";
  };
  sunoBalance: number | null;
  generating: number;
  assetsPending: number;
  failed7d: number;
};

export async function getSystemHealth(): Promise<SystemHealth> {
  const admin = createAdminClient();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [sunoBalance, gen, pending, failed] = await Promise.all([
    getSunoCredits(),
    admin.from("songs").select("id", { count: "exact", head: true }).eq("status", "generating"),
    admin
      .from("songs")
      .select("id", { count: "exact", head: true })
      .eq("status", "ready")
      .is("assets_synced_at", null),
    admin
      .from("songs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", weekAgo),
  ]);

  return {
    integrations: {
      music: isMockMusic ? "mock" : "suno",
      lyrics: isMockLyrics ? "template" : "claude",
      payments: isMockPayments ? "mock" : "moneroo",
      email: isMockEmail ? "mock" : "brevo",
    },
    sunoBalance,
    generating: gen.count ?? 0,
    assetsPending: pending.count ?? 0,
    failed7d: failed.count ?? 0,
  };
}

export async function listErrors(limit = 50): Promise<AppError[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("app_errors")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as AppError[]) ?? [];
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
