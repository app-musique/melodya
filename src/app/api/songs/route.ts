import { apiError, json, requireUser } from "@/lib/api";
import { createDraft } from "@/lib/songs";

export async function POST() {
  const { response } = await requireUser();
  if (response) return response;

  try {
    const song = await createDraft();
    return json({ song });
  } catch (err) {
    return apiError((err as Error).message, 500);
  }
}
