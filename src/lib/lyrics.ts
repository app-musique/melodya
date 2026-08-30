import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env, isMockLyrics } from "@/lib/env";
import type { Song } from "@/lib/domain";

const LYRICS_MODEL = process.env.LYRICS_MODEL?.trim() || "claude-sonnet-5";

export type GeneratedLyrics = { title: string; lyrics: string };

function brief(song: Song): string {
  const val = (s: string | null | undefined) => (s && s.trim() ? s.trim() : "—");
  const lines = [
    `Titre souhaité : ${val(song.title)}`,
    `Occasion : ${val(song.occasion)}`,
    `Pour : ${val(song.recipient_name)}${song.relationship ? ` (${song.relationship})` : ""}`,
    `De la part de : ${val(song.sender_name)}`,
    `Style musical : ${val(song.music_style)}`,
    `Voix : ${val(song.voice)}`,
    `Ambiance : ${val(song.mood)}`,
    `Langue : ${song.language}`,
    `Histoire / message : ${val(song.story)}`,
  ];
  if (song.key_facts?.trim()) lines.push(`Détails à intégrer : ${song.key_facts}`);
  return lines.join("\n");
}

export function buildLyricsPrompt(song: Song, instructions?: string) {
  const system = [
    "Tu es parolier professionnel pour Muzikii, un service de chansons personnalisées.",
    "Tu écris des paroles originales, chaleureuses et chantables, jamais niaises.",
    "Structure attendue : un titre, puis des sections balisées [Couplet 1], [Refrain], [Couplet 2], [Pont], [Refrain], [Outro].",
    "Le refrain revient à l'identique. Rimes naturelles, phrases courtes, vocabulaire concret.",
    "Intègre les prénoms et les détails fournis sans forcer. Respecte la langue et l'ambiance demandées.",
    "Si aucun destinataire ni histoire n'est fourni : écris une chanson personnelle et universelle à partir du titre et de l'occasion (parle à la première personne si c'est pertinent). Ne mentionne aucun prénom inventé.",
    "Si un titre est donné, garde-le tel quel dans la ligne TITRE.",
    "Réponds UNIQUEMENT au format :",
    "TITRE: <titre>",
    "<ligne vide>",
    "<paroles avec les balises de section>",
  ].join("\n");

  const user = [
    "Écris les paroles de la chanson à partir de ce brief :",
    "",
    brief(song),
    instructions?.trim() ? `\nConsignes supplémentaires : ${instructions.trim()}` : "",
  ].join("\n");

  return { system, user };
}

function parseLyrics(raw: string, fallbackTitle: string): GeneratedLyrics {
  const text = raw.trim();
  const match = text.match(/^\s*TITRE\s*:\s*(.+)$/im);
  const title = match?.[1]?.trim() || fallbackTitle;
  const lyrics = text
    .replace(/^\s*TITRE\s*:\s*.+$/im, "")
    .trim();
  return { title, lyrics: lyrics || text };
}

function mockLyrics(song: Song): GeneratedLyrics {
  const to = song.recipient_name?.trim() || "toi";
  const from = song.sender_name?.trim() || "moi";
  const occ = (song.occasion || "ce moment").toLowerCase();
  const facts = song.key_facts?.trim();
  const factLine = facts
    ? facts.split(/[.,;\n]/).map((s) => s.trim()).filter(Boolean)[0]
    : null;

  const title = song.title?.trim() || `${to}, cette chanson est pour toi`;
  const lyrics = `[Couplet 1]
${to}, aujourd'hui c'est ${occ}
Et j'avais tant de choses à te dire
De la part de ${from}, du fond du cœur
Un message que le temps ne peut trahir

[Refrain]
${to}, ${to}, écoute bien ces mots
Ils viennent de loin, ils viennent d'en haut
On est là pour toi, on chante ton nom
${to}, cette nuit t'appartient pour de bon

[Couplet 2]
${factLine ? `Je repense à ${factLine.toLowerCase()}` : "Je repense à tous ces jours passés"}
Aux rires, aux silences, aux chemins partagés
Rien n'efface ce que l'on a construit
${to}, tu comptes, aujourd'hui et pour la vie

[Pont]
Et si les mots parfois nous manquent
La musique, elle, ne ment jamais
Alors laisse-la te porter

[Refrain]
${to}, ${to}, écoute bien ces mots
Ils viennent de loin, ils viennent d'en haut
On est là pour toi, on chante ton nom
${to}, cette nuit t'appartient pour de bon

[Outro]
De la part de ${from}… avec tout notre amour.`;

  return { title, lyrics };
}

export async function generateLyrics(
  song: Song,
  instructions?: string,
): Promise<GeneratedLyrics> {
  if (isMockLyrics) return mockLyrics(song);

  const client = new Anthropic({ apiKey: env.anthropicApiKey! });
  const { system, user } = buildLyricsPrompt(song, instructions);

  const response = await client.messages.create({
    model: LYRICS_MODEL,
    max_tokens: 6000, // marge pour le raisonnement adaptatif + ~800 tokens de paroles
    thinking: { type: "adaptive" },
    system,
    messages: [{ role: "user", content: user }],
  });

  const raw = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  if (!raw) return mockLyrics(song);
  return parseLyrics(
    raw,
    song.title?.trim() || song.recipient_name?.trim() || song.occasion?.trim() || "Ma chanson",
  );
}
