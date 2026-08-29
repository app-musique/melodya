import { apiError, json, requireUser } from "@/lib/api";
import { ownsSong, setDedication } from "@/lib/clip";
import { clipDedicationSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { user, response } = await requireUser();
  if (response) return response;
  const { id } = await params;

  if (!(await ownsSong(user!.id, id))) return apiError("Chanson introuvable", 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Corps JSON invalide");
  }
  const parsed = clipDedicationSchema.safeParse(body);
  if (!parsed.success) return apiError("Invalide", 422);

  await setDedication(id, parsed.data.dedication);
  return json({ ok: true });
}
