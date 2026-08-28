export const CURRENCY = "XOF";
export const BASE_PRICE = 9900;

export type AddonId = "clip" | "express" | "instrumental" | "wav";

export const ADDONS: { id: AddonId; label: string; price: number; hint: string }[] = [
  { id: "clip", label: "Clip vidéo lyrics", price: 3000, hint: "Vidéo paroles à partager" },
  { id: "express", label: "Livraison express 6h", price: 2000, hint: "Au lieu de 24h" },
  {
    id: "instrumental",
    label: "Version instrumentale (karaoké)",
    price: 1500,
    hint: "Sans la voix",
  },
  { id: "wav", label: "Fichier WAV studio", price: 2500, hint: "Qualité non compressée" },
];

const ADDON_PRICE = Object.fromEntries(ADDONS.map((a) => [a.id, a.price])) as Record<
  AddonId,
  number
>;

export function isAddonId(value: string): value is AddonId {
  return value in ADDON_PRICE;
}

export function computeTotal(addons: string[]): number {
  const clean = [...new Set(addons)].filter(isAddonId);
  return clean.reduce((sum, id) => sum + ADDON_PRICE[id], BASE_PRICE);
}

const nf = new Intl.NumberFormat("fr-FR");

/** 9900 -> "9 900 F CFA" */
export function formatXOF(amount: number): string {
  return `${nf.format(amount)} F CFA`;
}
