export const CURRENCY = "XOF";

const nf = new Intl.NumberFormat("fr-FR");

/** 9900 -> "9 900 F CFA" */
export function formatXOF(amount: number): string {
  return `${nf.format(amount)} F CFA`;
}

/** Prix effectif d'une chanson dans un pack, arrondi. */
export function pricePerSong(price: number, credits: number, creditsPerSong: number): number {
  if (credits <= 0) return price;
  return Math.round((price / credits) * creditsPerSong);
}

/** Applique une remise fidélité (%) et arrondit à la centaine de F CFA inférieure. */
export function discountedPrice(price: number, pct: number): number {
  if (!pct || pct <= 0) return price;
  return Math.max(0, Math.round((price * (1 - pct / 100)) / 100) * 100);
}

/** Deux styles distincts (un par version) = 2 générations => coût doublé. */
export function songCreditCost(
  creditsPerSong: number,
  styleA: string | null | undefined,
  styleB: string | null | undefined,
): number {
  const a = (styleA ?? "").trim().toLowerCase();
  const b = (styleB ?? "").trim().toLowerCase();
  return creditsPerSong * (b && b !== a ? 2 : 1);
}
