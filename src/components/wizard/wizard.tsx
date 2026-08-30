"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Coins, Sparkles, Wand2 } from "lucide-react";
import { Button, ChoiceGrid, SelectField, TextArea, TextField } from "@/components/ui";
import {
  LANGUAGES,
  MAX_REGENERATIONS,
  MOODS,
  MUSIC_STYLES,
  RELATIONSHIPS,
  VOICES,
  type Song,
} from "@/lib/domain";
import { occasions } from "@/lib/site";
import { stepDetails, stepLyrics, stepOccasion, stepStyle } from "@/lib/schemas";

type FormState = {
  title: string;
  occasion: string;
  recipient_name: string;
  sender_name: string;
  relationship: string;
  story: string;
  key_facts: string;
  music_style: string;
  music_style_b: string;
  voice: Song["voice"] | "";
  language: string;
  mood: string;
  lyrics: string;
  lyrics_approved: boolean;
  in_explore: boolean;
};

const STEPS = ["Occasion", "Détails", "Style & voix", "Paroles", "Créer"];

// Modifier un de ces champs invalide des paroles déjà validées (le titre non :
// c'est juste un libellé).
const BRIEF_KEYS: (keyof FormState)[] = [
  "occasion",
  "recipient_name",
  "sender_name",
  "relationship",
  "story",
  "key_facts",
  "music_style",
  "voice",
  "language",
  "mood",
];

/** Étape où reprendre un brouillon : la première qui n'est pas terminée. */
function resumeStep(s: Song): number {
  if (s.lyrics_approved) return 4;
  if ((s.lyrics ?? "").trim().length >= 40) return 3;
  const styleDone = !!s.music_style && !!s.voice && !!s.mood;
  const detailsTouched =
    !!s.title || !!s.recipient_name || (s.story ?? "").trim().length > 0;
  if (styleDone) return 3;
  if (detailsTouched) return 2;
  if (s.occasion) return 1;
  return 0;
}

/** Corps du PATCH d'autosave : tous les champs, `voice` seulement si renseignée
 * (l'enum côté serveur rejette la chaîne vide). */
function autosavePayload(f: FormState) {
  const p: Record<string, unknown> = {
    title: f.title,
    occasion: f.occasion,
    recipient_name: f.recipient_name,
    sender_name: f.sender_name,
    relationship: f.relationship,
    story: f.story,
    key_facts: f.key_facts,
    music_style: f.music_style,
    music_style_b: f.music_style_b,
    language: f.language,
    mood: f.mood,
    lyrics: f.lyrics,
    lyrics_approved: f.lyrics_approved,
    in_explore: f.in_explore,
  };
  if (f.voice) p.voice = f.voice;
  return p;
}

export function Wizard({
  song,
  balance,
  creditsPerSong,
}: {
  song: Song;
  balance: number;
  creditsPerSong: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    title: song.title ?? "",
    occasion: song.occasion ?? "",
    recipient_name: song.recipient_name ?? "",
    sender_name: song.sender_name ?? "",
    relationship: song.relationship ?? "",
    story: song.story ?? "",
    key_facts: song.key_facts ?? "",
    music_style: song.music_style ?? "",
    music_style_b: song.music_style_b ?? "",
    voice: song.voice ?? "",
    language: song.language || "fr",
    mood: song.mood ?? "",
    lyrics: song.lyrics ?? "",
    lyrics_approved: song.lyrics_approved,
    in_explore: song.in_explore ?? true,
  });
  const [step, setStep] = useState(() => resumeStep(song));
  const [busy, setBusy] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [regenCount, setRegenCount] = useState(song.regen_count);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [showResumeHint, setShowResumeHint] = useState(
    () =>
      !!song.title ||
      !!song.recipient_name ||
      (song.story ?? "").length > 0 ||
      (song.lyrics ?? "").length > 0 ||
      resumeStep(song) >= 2,
  );

  const enoughCredits = balance >= creditsPerSong;
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => {
      const nextForm = { ...f, [k]: v };
      // Modifier le brief invalide les paroles déjà validées.
      if (BRIEF_KEYS.includes(k) && f.lyrics_approved) nextForm.lyrics_approved = false;
      return nextForm;
    });

  const patch = useCallback(
    async (fields: Record<string, unknown>) => {
      const res = await fetch(`/api/songs/${song.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Enregistrement impossible");
      }
    },
    [song.id],
  );

  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const savedSnapshotRef = useRef(JSON.stringify(autosavePayload(form)));

  // Autosave : enregistre le brouillon ~1 s après la dernière modification.
  useEffect(() => {
    if (busy || genBusy) return;
    const payload = autosavePayload(form);
    const snap = JSON.stringify(payload);
    if (snap === savedSnapshotRef.current) return;
    setSaveState("saving");
    const t = window.setTimeout(async () => {
      try {
        await patch(payload);
        savedSnapshotRef.current = snap;
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 1000);
    return () => window.clearTimeout(t);
  }, [form, busy, genBusy, patch]);

  // Filet : si l'onglet se ferme avant l'autosave, on force l'envoi.
  useEffect(() => {
    const flush = () => {
      const payload = autosavePayload(formRef.current);
      if (JSON.stringify(payload) === savedSnapshotRef.current) return;
      fetch(`/api/songs/${song.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [song.id]);

  function validateStep(): string | null {
    if (step === 0) {
      const r = stepOccasion.safeParse({ occasion: form.occasion });
      return r.success ? null : r.error.issues[0].message;
    }
    if (step === 1) {
      // Étape « Détails » : tout est facultatif, on vérifie juste les longueurs max.
      const r = stepDetails.safeParse(form);
      return r.success ? null : r.error.issues[0].message;
    }
    if (step === 2) {
      const r = stepStyle.safeParse(form);
      return r.success ? null : r.error.issues[0].message;
    }
    if (step === 3) {
      const r = stepLyrics.safeParse({
        lyrics: form.lyrics,
        lyrics_approved: form.lyrics_approved,
      });
      return r.success ? null : r.error.issues[0].message;
    }
    return null;
  }

  async function save(): Promise<boolean> {
    const payload = autosavePayload(form);
    try {
      await patch(payload);
      savedSnapshotRef.current = JSON.stringify(payload);
      setSaveState("saved");
      return true;
    } catch (e) {
      setSaveState("error");
      setError((e as Error).message);
      return false;
    }
  }

  async function next() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setShowResumeHint(false);
    setBusy(true);
    try {
      if (await save()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
    } finally {
      setBusy(false);
    }
  }

  function back() {
    setError(null);
    setShowResumeHint(false);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function generateLyrics(regenerate: boolean) {
    setError(null);
    setGenBusy(true);
    try {
      const payload = autosavePayload(form);
      await patch(payload);
      savedSnapshotRef.current = JSON.stringify(payload);
      const res = await fetch("/api/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: song.id, regenerate }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Génération impossible");
      setForm((f) => ({
        ...f,
        lyrics: j.lyrics,
        lyrics_approved: false,
        title: f.title || (typeof j.title === "string" ? j.title.slice(0, 100) : f.title),
      }));
      if (regenerate) setRegenCount((c) => c + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenBusy(false);
    }
  }

  async function createSong() {
    setError(null);
    setBusy(true);
    try {
      if (!(await save())) {
        setBusy(false);
        return;
      }
      const res = await fetch(`/api/songs/${song.id}/create`, { method: "POST" });
      const j = await res.json();
      if (res.status === 402) {
        router.push("/credits?next=/commander");
        return;
      }
      if (!res.ok) throw new Error(j.error ?? "Création impossible");
      router.push(j.redirectUrl ?? `/mes-chansons/${song.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ol className="mb-8 flex items-center gap-1.5">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 flex-col gap-1.5">
            <span
              className={`h-1.5 rounded-full transition-colors ${i <= step ? "gradient-brand" : "bg-line"}`}
            />
            <span
              className={`hidden text-[11px] font-semibold sm:block ${
                i === step ? "text-ink" : "text-ink-soft/60"
              }`}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>

      {showResumeHint && (
        <p className="mb-4 rounded-xl bg-brand/10 px-4 py-3 text-sm text-brand-strong">
          Tu reprends ta chanson là où tu t&apos;étais arrêté — tout est enregistré au fur et à
          mesure.
        </p>
      )}

      <div className="rounded-3xl border border-line bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
        {step === 0 && (
          <Section title="Quelle est l'occasion ?" subtitle="Le moment que cette chanson doit célébrer.">
            <ChoiceGrid
              options={occasions}
              value={occasions.includes(form.occasion) ? form.occasion : null}
              onChange={(v) => set("occasion", v)}
              columns={3}
            />
            <TextField
              label="Autre occasion"
              placeholder="Ex. Demande en mariage"
              value={occasions.includes(form.occasion) ? "" : form.occasion}
              onChange={(e) => set("occasion", e.target.value)}
            />
          </Section>
        )}

        {step === 1 && (
          <Section
            title="Les détails"
            subtitle="Tout est facultatif. Une chanson peut être juste pour toi. Ce que tu remplis ici aide l'IA si tu lui demandes d'écrire les paroles."
          >
            <TextField
              label="Titre de la chanson"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Ex. Reviens à la maison"
              maxLength={100}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Prénom du destinataire (optionnel)"
                value={form.recipient_name}
                onChange={(e) => set("recipient_name", e.target.value)}
                placeholder="Ex. Sarah"
              />
              <TextField
                label="Ton prénom (optionnel)"
                value={form.sender_name}
                onChange={(e) => set("sender_name", e.target.value)}
                placeholder="Ex. Kevin"
              />
            </div>
            <SelectField
              label="Ton lien avec cette personne (optionnel)"
              value={form.relationship}
              onChange={(e) => set("relationship", e.target.value)}
            >
              <option value="">— Aucun / sans objet —</option>
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </SelectField>
            <TextArea
              label="L'histoire, les souvenirs, ce que tu veux dire (optionnel)"
              rows={5}
              maxLength={4000}
              value={form.story}
              onChange={(e) => set("story", e.target.value)}
              placeholder="Comment vous vous êtes rencontrés, une anecdote, ce que ce moment représente… ou ce que tu ressens si la chanson est pour toi."
            />
            <TextArea
              label="Détails précis à intégrer (optionnel)"
              rows={3}
              maxLength={2000}
              value={form.key_facts}
              onChange={(e) => set("key_facts", e.target.value)}
              placeholder="Dates, lieux, surnoms, blagues internes, métier…"
            />
          </Section>
        )}

        {step === 2 && (
          <Section title="Le style de la chanson" subtitle="Genre, voix et ambiance.">
            <div>
              <p className="mb-1.5 text-sm font-semibold">
                {form.music_style_b ? "Style de la version 1" : "Style musical"}
              </p>
              <ChoiceGrid
                options={MUSIC_STYLES}
                value={form.music_style || null}
                onChange={(v) => set("music_style", v)}
                columns={3}
              />
            </div>

            <div className="rounded-2xl border border-line bg-cream-deep/40 p-4">
              <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 accent-brand"
                  checked={!!form.music_style_b}
                  onChange={(e) =>
                    set(
                      "music_style_b",
                      e.target.checked
                        ? MUSIC_STYLES.find((s) => s !== form.music_style) ?? ""
                        : "",
                    )
                  }
                />
                <span>
                  <span className="font-semibold">La version 2 dans un autre style</span>
                  <span className="mt-0.5 block text-xs text-ink-soft">
                    Chaque création donne 2 versions. Coche pour que la 2ᵉ soit composée dans un
                    genre différent — tu choisis ensuite ta préférée.
                  </span>
                </span>
              </label>
              {form.music_style_b && (
                <div className="mt-3">
                  <p className="mb-1.5 text-sm font-semibold">Style de la version 2</p>
                  <ChoiceGrid
                    options={MUSIC_STYLES.filter((s) => s !== form.music_style)}
                    value={form.music_style_b || null}
                    onChange={(v) => set("music_style_b", v)}
                    columns={3}
                  />
                </div>
              )}
            </div>

            <div>
              <p className="mb-1.5 text-sm font-semibold">Voix</p>
              <ChoiceGrid
                options={VOICES.map((v) => ({ value: v.id, label: v.label }))}
                value={(form.voice || null) as Song["voice"] | null}
                onChange={(v) => set("voice", v)}
                columns={4}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Langue"
                value={form.language}
                onChange={(e) => set("language", e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </SelectField>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold">Ambiance</p>
              <ChoiceGrid
                options={MOODS}
                value={form.mood || null}
                onChange={(v) => set("mood", v)}
                columns={3}
              />
            </div>
          </Section>
        )}

        {step === 3 && (
          <Section
            title="Les paroles"
            subtitle="Écris tes propres paroles — elles sont utilisées telles quelles. Ou laisse l'IA les écrire pour toi."
          >
            {!form.title && (
              <TextField
                label="Titre de la chanson"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Ex. Reviens à la maison"
                maxLength={100}
              />
            )}

            <TextArea
              label="Tes paroles"
              rows={14}
              maxLength={6000}
              value={form.lyrics}
              onChange={(e) => set("lyrics", e.target.value)}
              className="font-mono text-[13px] leading-relaxed"
              placeholder={
                "Colle ou écris tes paroles ici.\nUtilise [Couplet 1], [Refrain]… pour marquer les sections (facultatif)."
              }
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                loading={genBusy}
                onClick={() => generateLyrics(!!form.lyrics)}
                disabled={regenCount >= MAX_REGENERATIONS && !!form.lyrics}
              >
                {form.lyrics ? <Sparkles className="size-4" /> : <Wand2 className="size-4" />}
                {form.lyrics
                  ? `Régénérer (${Math.max(MAX_REGENERATIONS - regenCount, 0)} restantes)`
                  : "Pas d'inspiration ? Écris-les pour moi"}
              </Button>
              {form.lyrics && (
                <span className="text-xs text-ink-soft">
                  {form.lyrics.trim().split(/\s+/).length} mots
                </span>
              )}
            </div>

            <label className="flex items-start gap-3 rounded-xl bg-cream-deep p-4 text-sm">
              <input
                type="checkbox"
                checked={form.lyrics_approved}
                onChange={(e) => set("lyrics_approved", e.target.checked)}
                className="mt-0.5 size-4"
              />
              <span>
                Je valide ces paroles. Elles seront chantées telles quelles ; je pourrai demander
                une petite correction après livraison.
              </span>
            </label>
          </Section>
        )}

        {step === 4 && (
          <Section title="Créer ta chanson" subtitle="Récapitulatif avant lancement.">
            <dl className="divide-y divide-line rounded-xl border border-line">
              <Row label="Titre" value={form.title || "—"} />
              <Row label="Occasion" value={form.occasion || "—"} />
              <Row
                label="Pour"
                value={
                  form.recipient_name
                    ? `${form.recipient_name}${form.relationship ? ` (${form.relationship})` : ""}`
                    : "Moi / sans destinataire"
                }
              />
              <Row
                label="Style"
                value={
                  form.music_style_b
                    ? `V1 ${form.music_style || "—"} · V2 ${form.music_style_b} · ${form.mood || "—"}`
                    : `${form.music_style || "—"} · ${form.mood || "—"}`
                }
              />
              <Row label="Voix" value={VOICES.find((v) => v.id === form.voice)?.label ?? "—"} />
            </dl>

            <label className="flex items-start gap-3 rounded-xl border border-line p-4 text-sm">
              <input
                type="checkbox"
                checked={form.in_explore}
                onChange={(e) => set("in_explore", e.target.checked)}
                className="mt-0.5 size-4"
              />
              <span>
                Afficher ma chanson dans la section <strong>Inspiration</strong> (écoutable par
                d&apos;autres, avec les paroles). Tu pourras la retirer à tout moment depuis « Mes
                chansons ».
              </span>
            </label>

            <div className="flex items-center justify-between rounded-xl bg-cream-deep px-4 py-3 text-sm">
              <span className="flex items-center gap-2 font-semibold">
                <Coins className="size-4 text-gold" />
                Coût : {creditsPerSong} crédit{creditsPerSong > 1 ? "s" : ""}
              </span>
              <span className="text-ink-soft">Solde : {balance}</span>
            </div>

            {enoughCredits ? (
              <Button loading={busy} onClick={createSong} className="w-full">
                Créer ma chanson ({creditsPerSong} crédit{creditsPerSong > 1 ? "s" : ""})
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <>
                <p className="text-sm text-ink-soft">
                  Il te faut {creditsPerSong - balance} crédit
                  {creditsPerSong - balance > 1 ? "s" : ""} de plus.
                </p>
                <Button
                  onClick={() => router.push("/credits?next=/commander")}
                  className="w-full"
                >
                  <Coins className="size-4" />
                  Acheter des crédits
                </Button>
              </>
            )}
            <p className="text-center text-xs text-ink-soft">
              Paroles, MP3, pochette et 2 versions incluses. Prête en quelques minutes.
            </p>
          </Section>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-brand-strong/10 px-4 py-3 text-sm font-medium text-brand-strong">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={back} disabled={step === 0 || busy}>
            <ArrowLeft className="size-4" />
            {step === 4 ? "Modifier" : "Retour"}
          </Button>
          <span className="text-xs text-ink-soft" aria-live="polite">
            {saveState === "saving"
              ? "Enregistrement…"
              : saveState === "error"
                ? "Non enregistré — vérifie ta connexion"
                : "Brouillon enregistré"}
          </span>
          {step < 4 && (
            <Button loading={busy} onClick={next}>
              Continuer
              {step === 3 ? <Check className="size-4" /> : <ArrowRight className="size-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
