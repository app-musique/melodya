"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { fbqTrack } from "@/components/analytics/facebook-pixel";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

/**
 * Client ID Google (public). S'il est défini, on utilise Google Identity Services
 * (bouton officiel + signInWithIdToken) : tout le flux reste sur muzikii.com,
 * l'URL …supabase.co n'apparaît jamais. Sinon, repli sur signInWithOAuth (redirect).
 */
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GSI_SRC = "https://accounts.google.com/gsi/client";

type GoogleIdApi = {
  accounts: {
    id: {
      initialize: (config: Record<string, unknown>) => void;
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
};
declare global {
  interface Window {
    google?: GoogleIdApi;
  }
}

/** Charge le SDK GIS et attend que `google.accounts.id` soit réellement prêt. */
function waitForGis(): Promise<GoogleIdApi | null> {
  return new Promise((resolve) => {
    if (window.google?.accounts?.id) return resolve(window.google);
    if (!document.querySelector(`script[src="${GSI_SRC}"]`)) {
      const s = document.createElement("script");
      s.src = GSI_SRC;
      s.async = true;
      document.head.appendChild(s);
    }
    let tries = 0;
    const iv = window.setInterval(() => {
      if (window.google?.accounts?.id) {
        window.clearInterval(iv);
        resolve(window.google);
      } else if (++tries > 120) {
        window.clearInterval(iv);
        resolve(null);
      }
    }, 50);
  });
}

async function generateNonce(): Promise<[string, string]> {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce));
  const hashedNonce = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return [nonce, hashedNonce];
}

export function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/tableau-de-bord";

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(() => {
    const e = params.get("error");
    if (!e) return null;
    return e === "auth"
      ? "La connexion a échoué. Réessaie."
      : `Connexion impossible : ${decodeURIComponent(e)}`;
  });
  const [gsiFailed, setGsiFailed] = useState(false);

  const [supabase] = useState(() => createClient());
  const gsiRef = useRef<HTMLDivElement>(null);
  const nonceRef = useRef<string | null>(null);

  const callbackUrl = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const finishSignIn = useCallback(() => {
    router.push(next);
    router.refresh();
  }, [next, router]);

  const onGoogleCredential = useCallback(
    async (response: { credential?: string }) => {
      if (!response.credential) return;
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
        nonce: nonceRef.current ?? undefined,
      });
      if (error) {
        setError(`Connexion Google impossible : ${error.message}`);
        setLoading(false);
        return;
      }
      finishSignIn();
    },
    [supabase, finishSignIn],
  );

  // Callback à jour sans faire redémarrer l'effet GSI.
  const credentialRef = useRef(onGoogleCredential);
  useEffect(() => {
    credentialRef.current = onGoogleCredential;
  }, [onGoogleCredential]);

  // --- Google Identity Services (si NEXT_PUBLIC_GOOGLE_CLIENT_ID) ---
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    (async () => {
      try {
        const gis = await waitForGis();
        if (cancelled || !gsiRef.current) return;
        if (!gis) {
          setGsiFailed(true);
          return;
        }
        const [nonce, hashedNonce] = await generateNonce();
        if (cancelled || !gsiRef.current) return;
        nonceRef.current = nonce;
        gis.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (r: { credential?: string }) => credentialRef.current(r),
          nonce: hashedNonce,
          use_fedcm_for_prompt: true,
        });
        gsiRef.current.innerHTML = "";
        gis.accounts.id.renderButton(gsiRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "left",
          locale: "fr",
        });
      } catch {
        setGsiFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Filet indépendant : si le bouton Google ne s'est pas affiché (client ID /
  // origine non autorisée, réseau…), on bascule sur le bouton redirect.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const t = window.setTimeout(() => {
      if (gsiRef.current && gsiRef.current.childElementCount === 0) setGsiFailed(true);
    }, 4000);
    return () => window.clearTimeout(t);
  }, []);

  // Repli : bouton redirect classique (pas de client ID, ou GSI KO).
  async function handleGoogleRedirect() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: callbackUrl(),
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      fbqTrack("CompleteRegistration", { method: "email" });
      if (!data.session) {
        setNotice("Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.");
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("Email ou mot de passe incorrect.");
        setLoading(false);
        return;
      }
    }

    finishSignIn();
  }

  const useGsi = !!GOOGLE_CLIENT_ID && !gsiFailed;

  return (
    <div className="w-full">
      <div className="mb-6 flex rounded-full border border-line bg-white p-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-full py-2 transition-colors ${
            mode === "login" ? "gradient-brand text-white" : "text-ink-soft"
          }`}
        >
          Connexion
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-full py-2 transition-colors ${
            mode === "signup" ? "gradient-brand text-white" : "text-ink-soft"
          }`}
        >
          Inscription
        </button>
      </div>

      {useGsi ? (
        <div ref={gsiRef} className="flex min-h-[44px] justify-center" />
      ) : (
        <button
          type="button"
          onClick={handleGoogleRedirect}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-white py-3 font-semibold transition-colors hover:bg-cream-deep disabled:opacity-60"
        >
          <GoogleIcon />
          Continuer avec Google
        </button>
      )}

      <div className="my-5 flex items-center gap-3 text-xs text-ink-soft">
        <span className="h-px flex-1 bg-line" />
        ou
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "signup" && (
          <Field
            label="Prénom"
            type="text"
            value={fullName}
            onChange={setFullName}
            required
            autoComplete="given-name"
          />
        )}
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          required
          autoComplete="email"
        />
        <Field
          label="Mot de passe"
          type="password"
          value={password}
          onChange={setPassword}
          required
          minLength={6}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />

        {error && <p className="text-sm font-medium text-brand-strong">{error}</p>}
        {notice && <p className="text-sm font-medium text-ink-soft">{notice}</p>}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl gradient-brand py-3 font-semibold text-white shadow-[var(--shadow-float)] disabled:opacity-70"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {mode === "login" ? "Se connecter" : "Créer mon compte"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  onChange,
  ...props
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink-soft">{label}</span>
      <input
        {...props}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-white px-4 py-3 outline-none transition-colors focus:border-brand"
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75Z"
      />
    </svg>
  );
}
