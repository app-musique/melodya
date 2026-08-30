import { z } from "zod";
import { MOODS, MUSIC_STYLES } from "@/lib/domain";

const voiceIds = ["homme", "femme", "enfant", "duo"] as const;

export const stepOccasion = z.object({
  occasion: z.string().trim().min(2, "Choisis une occasion").max(60),
});

// Étape « détails » : tout est facultatif — une chanson peut être juste pour soi.
export const stepDetails = z.object({
  title: z.string().trim().max(100).optional().default(""),
  recipient_name: z.string().trim().max(80).optional().default(""),
  sender_name: z.string().trim().max(80).optional().default(""),
  relationship: z.string().trim().max(80).optional().default(""),
  story: z.string().trim().max(4000).optional().default(""),
  key_facts: z.string().trim().max(2000).optional().default(""),
});

export const stepStyle = z.object({
  music_style: z.enum(MUSIC_STYLES).or(z.string().trim().min(1).max(60)),
  voice: z.enum(voiceIds),
  language: z.string().trim().min(2).max(10),
  mood: z.enum(MOODS).or(z.string().trim().min(1).max(60)),
});

export const stepLyrics = z.object({
  lyrics: z.string().trim().min(40, "Les paroles semblent trop courtes").max(6000),
  lyrics_approved: z.literal(true, { message: "Valide les paroles pour continuer" }),
});

/** Patch partiel envoyé à PATCH /api/songs/[id] (autosave par étape). */
export const songDraftPatch = z
  .object({
    title: z.string().trim().max(100),
    occasion: z.string().trim().max(60),
    recipient_name: z.string().trim().max(80),
    sender_name: z.string().trim().max(80),
    relationship: z.string().trim().max(80),
    story: z.string().trim().max(4000),
    key_facts: z.string().trim().max(2000),
    music_style: z.string().trim().max(60),
    voice: z.enum(voiceIds),
    language: z.string().trim().max(10),
    mood: z.string().trim().max(60),
    lyrics: z.string().trim().max(6000),
    lyrics_approved: z.boolean(),
  })
  .partial();

export type SongDraftPatch = z.infer<typeof songDraftPatch>;

export const lyricsRequest = z.object({
  songId: z.string().uuid(),
  regenerate: z.boolean().optional().default(false),
  instructions: z.string().trim().max(500).optional(),
});

export const packCheckoutRequest = z.object({
  packId: z.string().uuid(),
  next: z.string().trim().max(200).optional(),
});

export const selectVersionRequest = z.object({
  versionId: z.string().uuid(),
});

export const shareRequest = z.object({
  is_public: z.boolean(),
});

// --- Admin ---

export const adminPackSchema = z.object({
  name: z.string().trim().min(1).max(60),
  credits: z.number().int().min(1).max(1000),
  price: z.number().int().min(0).max(10_000_000),
  is_popular: z.boolean(),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0).max(999),
});

export const adminSettingsSchema = z.object({
  credits_per_song: z.number().int().min(1).max(50),
  signup_bonus_credits: z.number().int().min(0).max(100),
  referral_referee_bonus: z.number().int().min(0).max(50),
  referral_referrer_reward: z.number().int().min(0).max(50),
});

export const adminLoyaltyTierSchema = z.object({
  name: z.string().trim().min(1).max(40),
  min_songs: z.number().int().min(0).max(10_000),
  discount_pct: z.number().int().min(0).max(90),
  sort_order: z.number().int().min(0).max(999),
});

export const adminSongShowcaseSchema = z.object({
  is_showcase: z.boolean().optional(),
  showcase_title: z.string().trim().max(80).optional(),
  showcase_artist: z.string().trim().max(80).optional(),
});

// --- Occasions ---

export const occasionSchema = z.object({
  label: z.string().trim().min(2, "Donne un intitulé").max(80),
  person_name: z.string().trim().max(80).optional().default(""),
  relationship: z.string().trim().max(80).optional().default(""),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
  is_recurring: z.boolean().default(true),
  notify_days_before: z.number().int().min(0).max(90).default(7),
});

// --- Réactions cadeau ---

export const reactionSchema = z.object({
  emoji: z.string().trim().min(1).max(8),
  message: z.string().trim().max(280).optional(),
  authorName: z.string().trim().max(60).optional(),
});

// --- Profil ---

export const profilePrefsSchema = z
  .object({
    email_notifications: z.boolean(),
  })
  .partial();

// --- Studio clip ---

export const clipDedicationSchema = z.object({
  dedication: z.string().trim().max(300),
});
