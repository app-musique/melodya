import { json, requireUser } from "@/lib/api";
import { markRead } from "@/lib/notifications";

export async function POST(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  let ids: string[] | undefined;
  try {
    const body = (await req.json()) as { ids?: string[] };
    if (Array.isArray(body.ids)) ids = body.ids.filter((x) => typeof x === "string");
  } catch {
    // corps vide = tout marquer lu
  }

  await markRead(user!.id, ids);
  return json({ ok: true });
}
