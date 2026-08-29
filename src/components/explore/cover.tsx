const GRADIENTS = [
  "linear-gradient(135deg,#ff6a1a,#e5332a)",
  "linear-gradient(135deg,#5b1e46,#c0567e)",
  "linear-gradient(135deg,#1c5b4a,#4fb98f)",
  "linear-gradient(135deg,#8a5a2b,#e5a44c)",
  "linear-gradient(135deg,#3a1533,#7a2f6d)",
];

export function coverGradient(id: string) {
  const h = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return GRADIENTS[h % GRADIENTS.length];
}

/**
 * Pochette d'une chanson : image réelle (Suno / import créateur) si disponible,
 * sinon une tuile dégradée déterministe avec l'occasion.
 */
export function Cover({
  id,
  occasion,
  image,
  className = "",
  labelClassName = "font-display text-lg font-extrabold uppercase tracking-wide text-white/90",
}: {
  id: string;
  occasion: string | null;
  image: string | null;
  className?: string;
  labelClassName?: string;
}) {
  if (image) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img src={image} alt="" className={`${className} object-cover`} loading="lazy" />
    );
  }
  return (
    <div
      className={`${className} grid place-items-center p-3 text-center`}
      style={{ backgroundImage: coverGradient(id) }}
    >
      <span className={labelClassName}>{occasion ?? "Muzikii"}</span>
    </div>
  );
}
