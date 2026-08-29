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
  credits_cost: number;
  provider: string | null;
  provider_job_id: string | null;
  generation_started_at: string | null;
  error: string | null;
  gift_slug: string | null;
  is_public: boolean;
  is_showcase: boolean;
  showcase_title: string | null;
  showcase_artist: string | null;
  plays_count: number;
  gift_view_count: number;
  inspire_count: number;
  lyrics_timing: LyricsTiming | null;
  clip_dedication: string | null;
  assets_synced_at: string | null;
  shared_with_followers: boolean;
  followers_notified_at: string | null;
  cover_url: string | null;
  cover_custom: boolean;
  created_at: string;
  updated_at: string;
};

/** Timings des lignes de paroles pour l'affichage synchronisé. */
export type LyricsTiming = { t: number; line: string }[];

export type SongVersion = {
  id: string;
  song_id: string;
  idx: number;
  audio_url: string;
  duration_sec: number | null;
  is_selected: boolean;
  provider_audio_id: string | null;
  persisted_at: string | null;
  image_url: string | null;
  created_at: string;
};

export type SongAsset = {
  id: string;
  song_id: string;
  type: "cover" | "clip" | "instrumental" | "wav";
  url: string;
  created_at: string;
};

export type SongPhoto = {
  id: string;
  song_id: string;
  url: string;
  sort_order: number;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  handle: string | null;
  phone: string | null;
  country: string | null;
  is_admin: boolean;
  credit_balance: number;
  referral_code: string | null;
  referred_by: string | null;
  referral_rewarded: boolean;
  email_notifications: boolean;
  welcomed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LoyaltyTier = {
  id: string;
  name: string;
  min_songs: number;
  discount_pct: number;
  sort_order: number;
};

export type CreditPack = {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
};

export type CreditTransaction = {
  id: string;
  user_id: string;
  amount: number;
  reason: "purchase" | "song" | "refund" | "bonus" | "referral" | "adjustment";
  song_id: string | null;
  payment_id: string | null;
  balance_after: number;
  created_at: string;
};

export type Occasion = {
  id: string;
  user_id: string;
  label: string;
  person_name: string | null;
  relationship: string | null;
  event_date: string; // YYYY-MM-DD
  is_recurring: boolean;
  notify_days_before: number;
  created_at: string;
  updated_at: string;
};

export type NotificationType =
  | "song_ready"
  | "song_failed"
  | "gift_viewed"
  | "gift_reaction"
  | "occasion_soon"
  | "creator_new_song";

export type AppNotification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export type GiftReaction = {
  id: string;
  song_id: string;
  emoji: string;
  message: string | null;
  author_name: string | null;
  created_at: string;
};

export const REACTION_EMOJIS = ["❤️", "🥹", "🎉", "🙏", "🔥", "✨"];

export type AppError = {
  id: string;
  context: string;
  message: string;
  detail: string | null;
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

export const MAX_CLIP_PHOTOS = 6;
