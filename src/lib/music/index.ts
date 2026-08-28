import { isMockMusic } from "@/lib/env";
import type { MusicProvider } from "./types";
import { mockMusicProvider } from "./mock";
import { sunoMusicProvider } from "./suno";

export type { MusicProvider, MusicResult, MusicTrack, MusicCreateInput } from "./types";

export function getMusicProvider(): MusicProvider {
  return isMockMusic ? mockMusicProvider : sunoMusicProvider;
}
