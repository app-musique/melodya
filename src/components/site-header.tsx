"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { navLinks, orderHref } from "@/lib/site";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors ${
        scrolled ? "border-b border-line bg-cream/85 backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-5">
        <a href="#top" aria-label="Melodya — accueil">
          <Logo />
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <span className="text-sm font-medium text-ink-soft">FR</span>
          <a
            href="/connexion"
            className="text-sm font-semibold text-ink transition-colors hover:text-brand-strong"
          >
            Connexion
          </a>
          <a
            href={orderHref}
            className="inline-flex items-center gap-2 rounded-full gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-float)] transition-transform hover:-translate-y-0.5"
          >
            Créer ma chanson
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="grid size-10 place-items-center rounded-lg border border-line md:hidden"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="fixed inset-x-0 top-18 z-40 h-[calc(100dvh-4.5rem)] bg-cream px-5 py-8 md:hidden">
          <nav className="flex flex-col gap-2">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-lg font-semibold text-ink hover:bg-cream-deep"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-6 flex flex-col gap-3">
            <a
              href="/connexion"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded-full border border-ink/15 px-5 py-3 font-semibold"
            >
              Connexion
            </a>
            <a
              href={orderHref}
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded-full gradient-brand px-5 py-3 font-semibold text-white"
            >
              Créer ma chanson
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
