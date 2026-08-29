import { z } from "zod";
import { apiError, json, requireAdmin } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  email: z.string().trim().email(),
  make_admin: z.boolean(),
});

type AdminRow = { id: string; full_name: string | null; email: string | null };

async function emailForId(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
): Promise<string | null> {
  const { data } = await admin.auth.admin.getUserById(id);
  return data.user?.email ?? null;
}

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("is_admin", true);

  const rows: AdminRow[] = await Promise.all(
    ((profiles as { id: string; full_name: string | null }[]) ?? []).map(async (p) => ({
      id: p.id,
      full_name: p.full_name,
      email: await emailForId(admin, p.id),
    })),
  );

  return json({ admins: rows });
}

export async function POST(req: Request) {
  const { user, response } = await requireAdmin();
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Corps JSON invalide");
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return apiError("Email invalide", 422);

  const admin = createAdminClient();

  // Recherche de l'utilisateur par email (pagination simple).
  let target: { id: string } | undefined;
  for (let page = 1; page <= 20 && !target; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (!data.users.length) break;
    const found = data.users.find(
      (u) => u.email?.toLowerCase() === parsed.data.email.toLowerCase(),
    );
    if (found) target = { id: found.id };
    if (data.users.length < 200) break;
  }

  if (!target) {
    return apiError("Aucun compte avec cet email (il doit d'abord s'inscrire).", 404);
  }
  if (!parsed.data.make_admin && target.id === user!.id) {
    return apiError("Tu ne peux pas retirer ton propre accès admin.", 400);
  }

  const { error } = await admin
    .from("profiles")
    .update({ is_admin: parsed.data.make_admin })
    .eq("id", target.id);
  if (error) return apiError(error.message, 500);

  return json({ ok: true });
}
