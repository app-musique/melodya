export type MusicCreateInput = {
  songId: string;
  title: string;
  lyrics: string;
  style: string;
  voice: string;
  mood: string;
  language: string;
};

export type MusicTrack = {
  url: string;
  durationSec: number | null;
};

export type MusicResult =
  | { status: "pending" }
  | { status: "ready"; tracks: MusicTrack[] }
  | { status: "failed"; error: string };

export interface MusicProvider {
  readonly name: string;
  createSong(input: MusicCreateInput): Promise<{ jobId: string }>;
  getResult(jobId: string): Promise<MusicResult>;
}
