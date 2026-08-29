"use client";

import { useState } from "react";
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
import { stepLyrics, stepOccasion, stepStory, stepStyle } from "@/lib/schemas";

type FormState = {
  occasion: string;
  recipient_name: string;
  sender_name: string;
  relationship: string;
  story: string;
  key_facts: string;
  music_style: string;
  voice: Song["voice"] | "";
  language: string;
  mood: string;
  lyrics: string;
  lyrics_approved: boolean;
};

const STEPS = ["Occasion", "Histoire", "Style & voix", "Paroles", "Créer"];

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
    occasion: song.occasion ?? "",
    recipient_name: song.recipient_name ?? "",
    sender_name: song.sender_name ?? "",
    relationship: song.relationship ?? "",
    story: song.story ?? "",
    key_facts: song.key_facts ?? "",
    music_style: song.music_style ?? "",
    voice: song.voice ?? "",
    language: song.language || "fr",
    mood: song.mood ?? "",
    lyrics: song.lyrics ?? "",
    lyrics_approved: song.lyrics_approved,
  });
  const [step, setStep] = useState(song.lyrics_approved ? 4 : 0);
  const [busy, setBusy] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [regenCount, setRegenCount] = useState(song.regen_count);
  const [error, setError] = useState<string | null>(null);

  const enoughCredits = balance >= creditsPerSong;
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function patch(fields: Partial<FormState>) {
    const res = await fetch(`/api/songs/${song.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error ?? "Enregistrement impossible");
    }
  }

  function validateStep(): string | null {
    if (step === 0) {
      const r = stepOccasion.safeParse({ occasion: form.occasion });
      return r.success ? null : r.error.issues[0].message;
    }
    if (step === 1) {
      const r = stepStory.safeParse(form);
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

  async function next() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const slices: Partial<FormState>[] = [
        { occasion: form.occasion },
        {
          recipient_name: form.recipient_name,
          sender_name: form.sender_name,
          relationship: form.relationship,
          story: form.story,
          key_facts: form.key_facts,
        },
        {
          music_style: form.music_style,
          voice: form.voice as FormState["voice"],
          language: form.language,
          mood: form.mood,
        },
        { lyrics: form.lyrics, lyrics_approved: form.lyrics_approved },
      ];
      await patch(slices[step]);
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function generateLyrics(regenerate: boolean) {
    setError(null);
    setGenBusy(true);
    try {
      await patch({
        occasion: form.occasion,
        recipient_name: form.recipient_name,
        sender_name: form.sender_name,
        relationship: form.relationship,
        story: form.story,
        key_facts: form.key_facts,
        music_style: form.music_style,
        voice: form.voice as FormState["voice"],
        language: form.language,
        mood: form.mood,
      });
      const res = await fetch("/api/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: song.id, regenerate }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Génération impossible");
      setForm((f) => ({ ...f, lyrics: j.lyrics, lyrics_approved: false }));
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
      await patch({ lyrics: form.lyrics, lyrics_approved: form.lyrics_approved });
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
          <Section title="Raconte l'histoire" subtitle="Plus tu donnes de détails, plus la chanson sera juste.">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Prénom du destinataire"
                value={form.recipient_name}
                onChange={(e) => set("recipient_name", e.target.value)}
                placeholder="Ex. Sarah"
              />
              <TextField
                label="Ton prénom (expéditeur)"
                value={form.sender_name}
                onChange={(e) => set("sender_name", e.target.value)}
                placeholder="Ex. Kevin"
              />
            </div>
            <SelectField
              label="Qui est cette personne pour toi ?"
              value={form.relationship}
              onChange={(e) => set("relationship", e.target.value)}
            >
              <option value="">— Choisir —</option>
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </SelectField>
            <TextArea
              label="L'histoire, les souvenirs, ce que tu veux dire"
              rows={5}
              value={form.story}
              onChange={(e) => set("story", e.target.value)}
              placeholder="Comment vous vous êtes rencontrés, une anecdote marquante, ce que cette personne représente…"
            />
            <TextArea
              label="Détails précis à intégrer (optionnel)"
              rows={3}
              value={form.key_facts}
              onChange={(e) => set("key_facts", e.target.value)}
              placeholder="Dates, lieux, surnoms, blagues internes, métier…"
            />
          </Section>
        )}

        {step === 2 && (
          <Section title="Le style de la chanson" subtitle="Genre, voix et ambiance.">
            <div>
              <p className="mb-1.5 text-sm font-semibold">Style musical</p>
              <ChoiceGrid
                options={MUSIC_STYLES}
                value={form.music_style || null}
                onChange={(v) => set("music_style", v)}
                columns={3}
              />
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
            subtitle="Générées par l'IA à partir de ton histoire, puis modifiables librement."
          >
            {!form.lyrics ? (
              <Button loading={genBusy} onClick={() => generateLyrics(false)}>
                <Wand2 className="size-4" />
                Générer les paroles
              </Button>
            ) : (
              <>
                <TextArea
                  label="Paroles (modifiables)"
                  rows={14}
                  value={form.lyrics}
                  onChange={(e) => set("lyrics", e.target.value)}
                  className="font-mono text-[13px] leading-relaxed"
                />
                <Button
                  variant="outline"
                  loading={genBusy}
                  onClick={() => generateLyrics(true)}
                  disabled={regenCount >= MAX_REGENERATIONS}
                >
                  <Sparkles className="size-4" />
                  Régénérer ({MAX_REGENERATIONS - regenCount} restantes)
                </Button>
                <label className="flex items-start gap-3 rounded-xl bg-cream-deep p-4 text-sm">
                  <input
                    type="checkbox"
                    checked={form.lyrics_approved}
                    onChange={(e) => set("lyrics_approved", e.target.checked)}
                    className="mt-0.5 size-4"
                  />
                  <span>
                    Je valide ces paroles. Je pourrai encore demander une petite correction après
                    livraison.
                  </span>
                </label>
              </>
            )}
          </Section>
        )}

        {step === 4 && (
          <Section title="Créer ta chanson" subtitle="Récapitulatif avant lancement.">
            <dl className="divide-y divide-line rounded-xl border border-line">
              <Row label="Occasion" value={form.occasion} />
              <Row label="Pour" value={`${form.recipient_name} (${form.relationship})`} />
              <Row label="Style" value={`${form.music_style} · ${form.mood}`} />
              <Row label="Voix" value={VOICES.find((v) => v.id === form.voice)?.label ?? "—"} />
            </dl>

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
              Paroles, MP3, pochette et 3 versions inclus. Prête en 24h.
            </p>
          </Section>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-brand-strong/10 px-4 py-3 text-sm font-medium text-brand-strong">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={back} disabled={step === 0 || busy}>
            <ArrowLeft className="size-4" />
            {step === 4 ? "Modifier" : "Retour"}
          </Button>
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
