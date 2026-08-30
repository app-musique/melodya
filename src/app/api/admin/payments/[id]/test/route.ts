import { apiError, json, requireAdmin } from "@/lib/api";
import { setPaymentTest } from "@/lib/admin";

type Params = { params: Promise<{ id: string }> };

/** Marque / démarque un paiement comme « test » (exclu des compteurs admin). */
export async function POST(req: Request, { params }: Params) {
  const { response } = await requireAdmin();
  if (response) return response;
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Corps JSON invalide");
  }
  const isTest = (body as { is_test?: unknown })?.is_test;
  if (typeof isTest !== "boolean") return apiError("is_test booléen requis", 422);

  await setPaymentTest(id, isTest);
  return json({ ok: true, is_test: isTest });
}
