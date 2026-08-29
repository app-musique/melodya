import { json } from "@/lib/api";
import { bumpCounter } from "@/lib/explore";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    await bumpCounter(id, "inspire_count");
  } catch {
    // best effort
  }
  return json({ ok: true });
}
