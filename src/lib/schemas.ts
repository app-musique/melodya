import { z } from "zod";
import { MOODS, MUSIC_STYLES, RELATIONSHIPS } from "@/lib/domain";
import { ADDONS, type AddonId } from "@/lib/pricing";

const addonIds = ADDONS.map((a) => a.id) as [AddonId, ...AddonId[]];
const voiceIds = ["homme", "femme", "enfant", "duo"] as const;

export const stepOccasion = z.object({
  occasion: z.string().trim().min(2, "Choisis une occasion").max(60),
});

export const stepStory = z.object({
  recipient_name: z.string().trim().min(1, "Indique le prénom du destinataire").max(80),
  sender_name: z.string().trim().min(1, "Indique ton prénom (ou celui de l'expéditeur)").max(80),
  relationship: z.enum(RELATIONSHIPS).or(z.string().trim().min(1).max(80)),
  story: z.string().trim().min(20, "Raconte au moins quelques phrases").max(4000),
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

export const stepAddons = z.object({
  addons: z.array(z.enum(addonIds)).default([]),
});

/** Patch partiel envoyé à PATCH /api/songs/[id] (autosave par étape). */
export const songDraftPatch = z
  .object({
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
    addons: z.array(z.enum(addonIds)),
  })
  .partial();

export type SongDraftPatch = z.infer<typeof songDraftPatch>;

export const lyricsRequest = z.object({
  songId: z.string().uuid(),
  regenerate: z.boolean().optional().default(false),
  instructions: z.string().trim().max(500).optional(),
});

export const checkoutRequest = z.object({
  songId: z.string().uuid(),
});

export const selectVersionRequest = z.object({
  versionId: z.string().uuid(),
});

export const shareRequest = z.object({
  is_public: z.boolean(),
});
