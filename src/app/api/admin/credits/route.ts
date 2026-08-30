import { apiError, json, requireAdmin } from "@/lib/api";
import { grantCreditsByEmail } from "@/lib/admin";

/** Crédite le compte d'un utilisateur depuis l'admin. */
export async function POST(req: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Corps JSON invalide");
  }
  const { email, amount } = (body ?? {}) as { email?: unknown; amount?: unknown };
  if (typeof email !== "string" || !email.trim()) return apiError("Email requis", 422);
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isInteger(n)) return apiError("Montant invalide", 422);

  const result = await grantCreditsByEmail(email, n);
  if (!result.ok) return apiError(result.error, 400);
  return json(result);
}
