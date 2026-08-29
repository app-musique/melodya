/**
 * Identifiant d'auditeur stable par navigateur (localStorage) — sert à dédupliquer
 * les réactions publiques sans compte. À utiliser côté client uniquement.
 */
export function reactorKey(): string {
  try {
    const k = "muzikii_rid";
    let v = localStorage.getItem(k);
    if (!v || !/^[A-Za-z0-9_-]{8,64}$/.test(v)) {
      v = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)
        .replace(/[^A-Za-z0-9_-]/g, "")
        .slice(0, 40);
      localStorage.setItem(k, v);
    }
    return v;
  } catch {
    return `anon-${Math.random().toString(36).slice(2, 12)}`;
  }
}
