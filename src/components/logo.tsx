export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-display text-xl font-extrabold tracking-tight ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/muzikii-icon.png"
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0"
        aria-hidden
      />
      <span>
        Muzi<span className="text-gradient-brand">kii</span>
      </span>
    </span>
  );
}
