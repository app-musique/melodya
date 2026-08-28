import { env } from "@/lib/env";
import type { MusicProvider, MusicResult, MusicCreateInput } from "./types";

/**
 * Adaptateur pour une API HTTP compatible Suno (fournisseur tiers).
 * Le schéma exact varie selon le fournisseur — les endpoints/champs ci-dessous
 * suivent le format le plus répandu (« /api/v1/generate » + « /api/v1/generate/record-info »).
 * À ajuster quand la vraie clé et la doc du fournisseur sont disponibles.
 */
function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${env.sunoApiKey}`,
  };
}

function base(path: string) {
  return `${env.sunoApiBaseUrl!.replace(/\/$/, "")}${path}`;
}

export const sunoMusicProvider: MusicProvider = {
  name: "suno",

  async createSong(input: MusicCreateInput): Promise<{ jobId: string }> {
    const res = await fetch(base("/api/v1/generate"), {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        prompt: input.lyrics,
        title: input.title,
        style: `${input.style}, ${input.mood}, voix ${input.voice}`,
        customMode: true,
        instrumental: false,
        model: process.env.SUNO_MODEL?.trim() || "V4_5",
        callBackUrl: `${env.siteUrl}/api/webhooks/suno`,
      }),
    });
    if (!res.ok) {
      throw new Error(`Suno generate a échoué (${res.status}): ${await res.text()}`);
    }
    const json = (await res.json()) as { data?: { taskId?: string }; taskId?: string };
    const taskId = json.data?.taskId ?? json.taskId;
    if (!taskId) throw new Error("Suno: taskId manquant dans la réponse");
    return { jobId: taskId };
  },

  async getResult(jobId: string): Promise<MusicResult> {
    const res = await fetch(base(`/api/v1/generate/record-info?taskId=${encodeURIComponent(jobId)}`), {
      headers: headers(),
    });
    if (!res.ok) {
      return { status: "failed", error: `Suno record-info (${res.status})` };
    }
    const json = (await res.json()) as {
      data?: {
        status?: string;
        response?: { sunoData?: { audioUrl?: string; duration?: number }[] };
      };
    };
    const status = json.data?.status;
    const items = json.data?.response?.sunoData ?? [];

    if (status === "SUCCESS" && items.length > 0) {
      return {
        status: "ready",
        tracks: items
          .filter((i) => i.audioUrl)
          .map((i) => ({ url: i.audioUrl!, durationSec: i.duration ? Math.round(i.duration) : null })),
      };
    }
    if (status && /FAIL|ERROR/i.test(status)) {
      return { status: "failed", error: `Suno: ${status}` };
    }
    return { status: "pending" };
  },
};
