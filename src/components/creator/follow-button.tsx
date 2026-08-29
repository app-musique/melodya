"use client";

import { useEffect, useState } from "react";
import { BellRing, Check, Loader2 } from "lucide-react";

type Props = {
  handle: string;
  isLoggedIn: boolean;
  initialFollowing: boolean;
  initialCount: number;
  variant?: "solid" | "outline";
};

const lsKey = (h: string) => `muzikii_follow_${h}`;

export function FollowButton({
  handle,
  isLoggedIn,
  initialFollowing,
  initialCount,
  variant = "solid",
}: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isLoggedIn) return;
    try {
      if (localStorage.getItem(lsKey(handle))) setFollowing(true);
    } catch {
      /* ignore */
    }
  }, [handle, isLoggedIn]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function followLoggedIn(unfollow: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/creators/${handle}/follow`, {
        method: unfollow ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: unfollow ? undefined : JSON.stringify({}),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Impossible");
      setFollowing(j.following);
      setCount(j.followerCount);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function followByEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/creators/${handle}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Impossible");
      setFollowing(true);
      setCount(j.followerCount);
      setShowEmail(false);
      try {
        localStorage.setItem(lsKey(handle), email.trim().toLowerCase());
      } catch {
        /* ignore */
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const base =
    variant === "solid"
      ? "bg-white text-plum"
      : "border border-white/25 text-cream hover:bg-white/10";

  if (following) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={isLoggedIn ? () => followLoggedIn(true) : undefined}
          disabled={busy || !isLoggedIn}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold ${base} ${
            isLoggedIn ? "" : "cursor-default"
          } disabled:opacity-70`}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Abonné{isLoggedIn ? " — se désabonner" : ""}
        </button>
        <p className="text-xs text-cream/50">
          {count} abonné{count > 1 ? "s" : ""}
        </p>
      </div>
    );
  }

  if (showEmail && !isLoggedIn) {
    return (
      <form onSubmit={followByEmail} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ton@email.com"
            className="w-48 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-cream placeholder:text-cream/40 outline-none focus:border-gold"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-plum disabled:opacity-70"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : "OK"}
          </button>
        </div>
        <p className="text-xs text-cream/50">
          Un email à chaque nouvelle chanson. Désabonnement en 1 clic.
        </p>
        {error && <p className="text-xs text-gold">{error}</p>}
      </form>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => (isLoggedIn ? followLoggedIn(false) : setShowEmail(true))}
        disabled={busy}
        className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold ${base} disabled:opacity-70`}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />}
        S&apos;abonner
      </button>
      <p className="text-xs text-cream/50">
        {count} abonné{count > 1 ? "s" : ""}
      </p>
      {error && <p className="text-xs text-gold">{error}</p>}
    </div>
  );
}
