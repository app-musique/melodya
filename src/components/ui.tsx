"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

export function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-sm font-semibold text-ink">{children}</span>;
}

export const TextField = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }
>(function TextField({ label, error, className = "", ...props }, ref) {
  return (
    <label className="block">
      {label && <Label>{label}</Label>}
      <input
        ref={ref}
        {...props}
        className={`w-full rounded-xl border bg-white px-4 py-3 outline-none transition-colors focus:border-brand ${
          error ? "border-brand-strong" : "border-line"
        } ${className}`}
      />
      {error && <span className="mt-1 block text-xs font-medium text-brand-strong">{error}</span>}
    </label>
  );
});

export function TextArea({
  label,
  error,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }) {
  return (
    <label className="block">
      {label && <Label>{label}</Label>}
      <textarea
        {...props}
        className={`w-full rounded-xl border bg-white px-4 py-3 outline-none transition-colors focus:border-brand ${
          error ? "border-brand-strong" : "border-line"
        } ${className}`}
      />
      {error && <span className="mt-1 block text-xs font-medium text-brand-strong">{error}</span>}
    </label>
  );
}

export function SelectField({
  label,
  error,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }) {
  return (
    <label className="block">
      {label && <Label>{label}</Label>}
      <select
        {...props}
        className={`w-full appearance-none rounded-xl border bg-white px-4 py-3 outline-none transition-colors focus:border-brand ${
          error ? "border-brand-strong" : "border-line"
        }`}
      >
        {children}
      </select>
      {error && <span className="mt-1 block text-xs font-medium text-brand-strong">{error}</span>}
    </label>
  );
}

export function ChoiceGrid<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: readonly T[] | { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  columns?: 2 | 3 | 4;
}) {
  const items = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  const cols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[
    columns
  ];
  return (
    <div className={`grid grid-cols-1 gap-2 ${cols}`}>
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          onClick={() => onChange(it.value)}
          className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
            value === it.value
              ? "border-brand bg-brand/5 text-ink"
              : "border-line bg-white text-ink-soft hover:border-brand/40"
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function Button({
  loading,
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "primary" | "ghost" | "outline";
}) {
  const styles = {
    primary:
      "gradient-brand text-white shadow-[var(--shadow-float)] hover:-translate-y-0.5 disabled:opacity-70",
    outline: "border border-line bg-white hover:bg-cream-deep disabled:opacity-60",
    ghost: "text-ink-soft hover:text-ink",
  }[variant];
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed ${styles} ${className}`}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
