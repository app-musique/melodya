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
  /** Identifiant du clip chez le fournisseur (pour récupérer les timings). */
  providerAudioId?: string | null;
  /** Pochette générée par le fournisseur (image carrée). */
  imageUrl?: string | null;
};

export type MusicResult =
  | { status: "pending" }
  | { status: "ready"; tracks: MusicTrack[] }
  | { status: "failed"; error: string };

export type LineTiming = { t: number; line: string };

export interface MusicProvider {
  readonly name: string;
  createSong(input: MusicCreateInput): Promise<{ jobId: string }>;
  getResult(jobId: string): Promise<MusicResult>;
  /** Timings ligne par ligne (optionnel — sinon répartition uniforme côté client). */
  getLineTimings?(jobId: string, audioId: string, lyrics: string): Promise<LineTiming[] | null>;
}
