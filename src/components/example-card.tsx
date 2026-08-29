import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { orderHref } from "@/lib/site";

export type Example = {
  title: string;
  subtitle: string;
  style: string;
  tags: string[];
  from: string;
  to: string;
};

export function ExampleCard({ ex }: { ex: Example }) {
  return (
    <Link
      href={orderHref}
      className="group block overflow-hidden rounded-3xl border border-line bg-white shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5"
    >
      <div
        className="relative aspect-[4/3] p-5"
        style={{ backgroundImage: `linear-gradient(140deg, ${ex.from}, ${ex.to})` }}
      >
        <div className="flex flex-wrap gap-2">
          {ex.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm"
            >
              {t}
            </span>
          ))}
        </div>
        <ArrowUpRight className="absolute bottom-5 right-5 size-5 text-white/80 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>

      <div className="p-5">
        <h3 className="font-display text-lg font-bold">{ex.title}</h3>
        <p className="text-sm text-ink-soft">
          {ex.subtitle} · {ex.style}
        </p>
      </div>
    </Link>
  );
}
