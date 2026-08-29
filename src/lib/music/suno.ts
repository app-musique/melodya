import { env } from "@/lib/env";
import type {
  LineTiming,
  MusicCreateInput,
  MusicProvider,
  MusicResult,
} from "./types";

/**
 * Adaptateur sunoapi.org — https://docs.sunoapi.org
 *   POST /api/v1/generate                     -> { data: { taskId } }
 *   GET  /api/v1/generate/record-info?taskId  -> { data: { status, response: { sunoData: [...] } } }
 *   POST /api/v1/generate/get-timestamped-lyrics -> { data: { alignedWords: [...] } }
 */

const SUNO_MODEL = process.env.SUNO_MODEL?.trim() || "V4_5";

function base(path: string) {
  return `${(env.sunoApiBaseUrl ?? "https://api.sunoapi.org").replace(/\/$/, "")}${path}`;
}
function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${env.sunoApiKey}`,
  };
}

function vocalGender(voice: string): "m" | "f" | undefined {
  if (voice === "homme") return "m";
  if (voice === "femme" || voice === "enfant") return "f";
  return undefined; // duo / inconnu -> laissé au modèle
}

const PENDING = new Set(["PENDING", "TEXT_SUCCESS", "FIRST_SUCCESS"]);
const FAILED = new Set([
  "CREATE_TASK_FAILED",
  "GENERATE_AUDIO_FAILED",
  "CALLBACK_EXCEPTION",
  "SENSITIVE_WORD_ERROR",
]);

type SunoClip = {
  id?: string;
  audioUrl?: string;
  streamAudioUrl?: string;
  duration?: number;
  imageUrl?: string;
  sourceImageUrl?: string;
};

/** Solde de crédits sunoapi.org (null si non configuré / injoignable). */
export async function getSunoCredits(): Promise<number | null> {
  if (!env.sunoApiKey || !env.sunoApiBaseUrl) return null;
  try {
    const res = await fetch(base("/api/v1/generate/credit"), { headers: headers() });
    const json = (await res.json().catch(() => ({}))) as { code?: number; data?: number };
    if (!res.ok || typeof json.data !== "number") return null;
    return json.data;
  } catch {
    return null;
  }
}

export const sunoMusicProvider: MusicProvider = {
  name: "suno",

  async createSong(input: MusicCreateInput): Promise<{ jobId: string }> {
    const body: Record<string, unknown> = {
      customMode: true,
      instrumental: false,
      model: SUNO_MODEL,
      title: input.title.slice(0, 100),
      style: `${input.style}, ${input.mood}`.slice(0, 1000),
      prompt: input.lyrics.slice(0, 5000),
      callBackUrl: `${env.siteUrl}/api/webhooks/suno`,
    };
    const vg = vocalGender(input.voice);
    if (vg) body.vocalGender = vg;

    const res = await fetch(base("/api/v1/generate"), {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as {
      code?: number;
      msg?: string;
      data?: { taskId?: string };
    };
    if (!res.ok || json.code !== 200 || !json.data?.taskId) {
      throw new Error(`Suno generate (${res.status}) : ${json.msg ?? "réponse inattendue"}`);
    }
    return { jobId: json.data.taskId };
  },

  async getResult(jobId: string): Promise<MusicResult> {
    const res = await fetch(
      base(`/api/v1/generate/record-info?taskId=${encodeURIComponent(jobId)}`),
      { headers: headers() },
    );
    if (!res.ok) return { status: "failed", error: `Suno record-info (${res.status})` };

    const json = (await res.json().catch(() => ({}))) as {
      data?: { status?: string; response?: { sunoData?: SunoClip[] } };
    };
    const status = json.data?.status ?? "PENDING";
    const clips = json.data?.response?.sunoData ?? [];

    if (status === "SUCCESS" && clips.length > 0) {
      return {
        status: "ready",
        tracks: clips
          .filter((c) => c.audioUrl || c.streamAudioUrl)
          .map((c) => ({
            url: (c.audioUrl || c.streamAudioUrl)!,
            durationSec: c.duration ? Math.round(c.duration) : null,
            providerAudioId: c.id ?? null,
            imageUrl: c.sourceImageUrl || c.imageUrl || null,
          })),
      };
    }
    if (FAILED.has(status)) return { status: "failed", error: `Suno : ${status}` };
    if (PENDING.has(status)) return { status: "pending" };
    return { status: "pending" };
  },

  async getLineTimings(jobId, audioId): Promise<LineTiming[] | null> {
    try {
      const res = await fetch(base("/api/v1/generate/get-timestamped-lyrics"), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ taskId: jobId, audioId }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: { alignedWords?: { word: string; startS: number }[] };
      };
      const words = json.data?.alignedWords ?? [];
      if (!words.length) return null;

      // Les mots alignés Suno reprennent le texte d'origine avec ses \n et ses
      // balises [Section] : on reconstruit chaque ligne chantée + son instant de
      // départ (fiable, pas de dérive liée au comptage de mots).
      const timings: LineTiming[] = [];
      let lineStart: number | null = null;
      let current = "";
      for (const w of words) {
        const text = String(w.word ?? "").replace(/\[[^\]]*\]/g, "");
        const parts = text.split("\n");
        for (let k = 0; k < parts.length; k++) {
          if (lineStart === null && parts[k].trim()) lineStart = Number(w.startS) || 0;
          current += parts[k];
          if (k < parts.length - 1) {
            if (current.trim()) {
              timings.push({ t: lineStart ?? (Number(w.startS) || 0), line: current.trim() });
            }
            current = "";
            lineStart = null;
          }
        }
      }
      if (current.trim()) timings.push({ t: lineStart ?? 0, line: current.trim() });

      return timings.length ? timings : null;
    } catch {
      return null;
    }
  },
};
