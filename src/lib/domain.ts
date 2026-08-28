import type { AddonId } from "@/lib/pricing";

export type SongStatus =
  | "draft"
  | "pending_payment"
  | "paid"
  | "generating"
  | "ready"
  | "failed";

export type VoiceType = "homme" | "femme" | "enfant" | "duo";

export const MUSIC_STYLES = [
  "Afrobeat",
  "Amapiano",
  "Coupé-décalé",
  "Rumba congolaise",
  "Zouk",
  "Gospel",
  "Highlife",
  "RnB",
  "Acoustique",
  "Rap / Hip-hop",
  "Ndombolo",
  "Reggae",
] as const;

export const VOICES: { id: VoiceType; label: string }[] = [
  { id: "femme", label: "Voix féminine" },
  { id: "homme", label: "Voix masculine" },
  { id: "enfant", label: "Voix d'enfant" },
  { id: "duo", label: "Duo" },
];

export const MOODS = [
  "Festive et dansante",
  "Douce et tendre",
  "Émouvante",
  "Solennelle",
  "Joyeuse",
  "Nostalgique",
] as const;

export const LANGUAGES: { id: string; label: string }[] = [
  { id: "fr", label: "Français" },
  { id: "en", label: "Anglais" },
  { id: "fr-en", label: "Français + Anglais" },
];

export const RELATIONSHIPS = [
  "Ma femme / mon mari",
  "Mon copain / ma copine",
  "Ma mère",
  "Mon père",
  "Mon frère / ma sœur",
  "Mon ami(e)",
  "Mon enfant",
  "Un(e) collègue",
  "Autre",
] as const;

export type Song = {
  id: string;
  user_id: string;
  status: SongStatus;
  occasion: string | null;
  recipient_name: string | null;
  sender_name: string | null;
  relationship: string | null;
  story: string | null;
  key_facts: string | null;
  language: string;
  music_style: string | null;
  voice: VoiceType | null;
  mood: string | null;
  lyrics: string | null;
  lyrics_approved: boolean;
  regen_count: number;
  addons: AddonId[];
  price_total: number;
  currency: string;
  provider: string | null;
  provider_job_id: string | null;
  generation_started_at: string | null;
  error: string | null;
  gift_slug: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type SongVersion = {
  id: string;
  song_id: string;
  idx: number;
  audio_url: string;
  duration_sec: number | null;
  is_selected: boolean;
  created_at: string;
};

export type SongAsset = {
  id: string;
  song_id: string;
  type: "cover" | "clip" | "instrumental" | "wav";
  url: string;
  created_at: string;
};

export const STATUS_LABEL: Record<SongStatus, string> = {
  draft: "Brouillon",
  pending_payment: "En attente de paiement",
  paid: "Payée",
  generating: "En cours de création",
  ready: "Prête",
  failed: "Échec",
};

export const MAX_REGENERATIONS = 3;
