import "server-only";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Occasion } from "@/lib/domain";

export type UpcomingOccasion = Occasion & { nextDate: string; daysUntil: number };

export async function listOccasions(userId: string): Promise<Occasion[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("occasions")
    .select("*")
    .eq("user_id", userId)
    .order("event_date");
  return (data as Occasion[]) ?? [];
}

function nextOccurrence(dateStr: string, recurring: boolean): { next: Date; days: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const base = new Date(dateStr + "T00:00:00");
  let next = base;
  if (recurring) {
    next = new Date(today.getFullYear(), base.getMonth(), base.getDate());
    if (next < today) next = new Date(today.getFullYear() + 1, base.getMonth(), base.getDate());
  }
  const days = Math.round((next.getTime() - today.getTime()) / 86_400_000);
  return { next, days };
}

export async function upcomingOccasions(
  userId: string,
  withinDays = 60,
): Promise<UpcomingOccasion[]> {
  const list = await listOccasions(userId);
  return list
    .map((o) => {
      const { next, days } = nextOccurrence(o.event_date, o.is_recurring);
      return { ...o, nextDate: next.toISOString().slice(0, 10), daysUntil: days };
    })
    .filter((o) => o.daysUntil >= 0 && o.daysUntil <= withinDays)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}
