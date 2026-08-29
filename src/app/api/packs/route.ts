import { json } from "@/lib/api";
import { getCreditsPerSong, getPacks } from "@/lib/credits";
import { isSupabaseConfigured } from "@/lib/env";

export async function GET() {
  if (!isSupabaseConfigured) return json({ packs: [], creditsPerSong: 1 });
  const [packs, creditsPerSong] = await Promise.all([getPacks(), getCreditsPerSong()]);
  return json({ packs, creditsPerSong });
}
