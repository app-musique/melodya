"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Music2 } from "lucide-react";

export function AccountNav({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initial = email.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-2.5 text-sm font-semibold transition-colors hover:bg-cream-deep"
      >
        <span className="grid size-7 place-items-center rounded-full gradient-brand text-xs text-white">
          {initial}
        </span>
        <ChevronDown className="size-4 text-ink-soft" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-soft)]">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-xs text-ink-soft">Connecté en tant que</p>
            <p className="truncate text-sm font-semibold">{email}</p>
          </div>
          <Link
            href="/mes-chansons"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-cream-deep"
          >
            <Music2 className="size-4" />
            Mes chansons
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-brand-strong hover:bg-cream-deep"
            >
              <LogOut className="size-4" />
              Se déconnecter
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
