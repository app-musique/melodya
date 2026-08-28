import { env } from "@/lib/env";
import type { MusicProvider, MusicResult } from "./types";

/** Délai simulé avant que la « génération » soit prête. */
const MOCK_DELAY_MS = 15_000;

const SAMPLES = ["sample-1.wav", "sample-2.wav", "sample-3.wav"];

export const mockMusicProvider: MusicProvider = {
  name: "mock",

  async createSong() {
    // Le timestamp de départ est encodé dans le jobId (provider stateless).
    return { jobId: `mock_${Date.now()}` };
  },

  async getResult(jobId: string): Promise<MusicResult> {
    const startedAt = Number(jobId.replace("mock_", ""));
    if (!Number.isFinite(startedAt)) {
      return { status: "failed", error: "jobId invalide" };
    }
    if (Date.now() - startedAt < MOCK_DELAY_MS) {
      return { status: "pending" };
    }
    return {
      status: "ready",
      tracks: SAMPLES.map((file) => ({
        url: `${env.siteUrl}/samples/${file}`,
        durationSec: 12,
      })),
    };
  },
};
