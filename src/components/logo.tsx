export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display font-extrabold text-xl tracking-tight ${className}`}>
      <span className="grid size-8 place-items-center rounded-xl gradient-brand text-white shadow-[var(--shadow-float)]">
        <svg viewBox="0 0 24 24" fill="none" className="size-4.5" aria-hidden>
          <path
            d="M9 18V6l10-2v12"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="6" cy="18" r="3" fill="currentColor" />
          <circle cx="16" cy="16" r="3" fill="currentColor" />
        </svg>
      </span>
      Melodya
    </span>
  );
}
