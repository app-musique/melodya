import { Headphones, Music2, Music4 } from "lucide-react";

/**
 * Éléments musicaux flottants, décoratifs, positionnés autour du hero.
 * `pointer-events-none` : ils n'interceptent jamais les clics.
 * La plupart sont masqués sous `lg` pour ne pas encombrer le mobile.
 */
export function HeroFloaties() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Vinyle qui tourne — haut gauche */}
      <div
        className="float-el absolute left-[6%] top-[18%] hidden lg:block"
        style={{ animation: "floaty 8s ease-in-out infinite" }}
      >
        <div className="relative grid size-24 place-items-center rounded-full bg-plum shadow-[var(--shadow-float)]">
          <div
            className="absolute inset-2 rounded-full border-2 border-white/10"
            style={{ animation: "spin-slow 6s linear infinite" }}
          >
            <span className="absolute inset-0 rounded-full border-t-2 border-white/25" />
          </div>
          <div className="size-7 rounded-full gradient-brand" />
        </div>
      </div>

      {/* Chip occasion — gauche */}
      <div
        className="float-el absolute left-[3%] top-[52%] hidden rounded-2xl bg-white px-4 py-2.5 shadow-[var(--shadow-soft)] lg:flex"
        style={{ animation: "floaty-b 7s ease-in-out infinite 0.6s" }}
      >
        <span className="text-sm font-semibold">Anniversaire 🎂</span>
      </div>

      {/* Égaliseur — bas gauche */}
      <div
        className="float-el absolute bottom-[12%] left-[12%] hidden items-end gap-1 rounded-2xl bg-white p-3.5 shadow-[var(--shadow-soft)] lg:flex"
        style={{ animation: "floaty-c 9s ease-in-out infinite" }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="w-1.5 origin-bottom rounded-full gradient-brand"
            style={{
              height: 26,
              animation: `eq-bar ${0.9 + i * 0.15}s ease-in-out infinite`,
              animationDelay: `${i * 0.12}s`,
            }}
          />
        ))}
      </div>

      {/* Note dans une bulle — haut droite */}
      <div
        className="float-el absolute right-[7%] top-[14%] hidden lg:block"
        style={{ animation: "floaty-b 6.5s ease-in-out infinite" }}
      >
        <div className="grid size-16 place-items-center rounded-2xl gradient-brand text-white shadow-[var(--shadow-float)]">
          <Music4 className="size-7" />
        </div>
      </div>

      {/* Chip occasion — droite */}
      <div
        className="float-el absolute right-[3%] top-[44%] hidden rounded-2xl bg-white px-4 py-2.5 shadow-[var(--shadow-soft)] lg:flex"
        style={{ animation: "floaty 7.5s ease-in-out infinite 0.3s" }}
      >
        <span className="text-sm font-semibold">Mariage 💍</span>
      </div>

      {/* Casque — bas droite */}
      <div
        className="float-el absolute bottom-[14%] right-[10%] hidden lg:block"
        style={{ animation: "floaty-c 8.5s ease-in-out infinite 0.4s" }}
      >
        <div className="grid size-14 place-items-center rounded-2xl bg-white text-plum shadow-[var(--shadow-soft)]">
          <Headphones className="size-6" />
        </div>
      </div>

      {/* Petites notes semées, visibles aussi sur mobile en très discret */}
      <Music2
        className="float-el absolute left-[8%] top-[8%] size-6 text-brand/40 sm:size-8"
        style={{ animation: "floaty 6s ease-in-out infinite" }}
      />
      <Music4
        className="float-el absolute right-[9%] bottom-[8%] size-6 text-brand-strong/35 sm:size-8"
        style={{ animation: "floaty-b 7s ease-in-out infinite 0.5s" }}
      />
    </div>
  );
}
