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
