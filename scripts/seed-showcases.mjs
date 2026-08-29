// Insère ~5 chansons « vitrine » pour peupler Explorer.
// Idempotent : ne fait rien si des vitrines existent déjà.
// Usage : node scripts/seed-showcases.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(here, "..", ".env.local"), "utf8");
const g = (k) => (env.match(new RegExp("^" + k + "=(.*)$", "m")) || [, ""])[1].trim();
const SB = g("NEXT_PUBLIC_SUPABASE_URL");
const SVC = g("SUPABASE_SERVICE_ROLE_KEY");
const SITE = g("NEXT_PUBLIC_SITE_URL") || "http://localhost:3000";
if (!SB || !SVC) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants");

const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json" };
const rest = (p, init) => fetch(`${SB}/rest/v1/${p}`, { ...init, headers: { ...H, ...init?.headers } });

/** timing : réparti sur ~12 s (durée des samples). */
function timing(lines) {
  const step = 12 / (lines.length + 1);
  return lines.map((line, i) => ({ t: +(step * (i + 1)).toFixed(2), line }));
}

const SHOWCASES = [
  {
    occasion: "Anniversaire",
    music_style: "Amapiano",
    mood: "Festive et dansante",
    voice: "femme",
    showcase_title: "Joyeux anniversaire Awa",
    showcase_artist: "Style Amapiano",
    lines: [
      "Awa, aujourd'hui le ciel s'illumine",
      "Trente bougies, trente raisons de sourire",
      "On danse pour toi, la ville entière chavire",
      "Reine d'un soir, ton nom sur toutes les lèvres",
      "Que cette année t'apporte mille rêves",
    ],
  },
  {
    occasion: "Mariage",
    music_style: "Afrobeat",
    mood: "Émouvante",
    voice: "duo",
    showcase_title: "Pour toujours, Christelle & Kofi",
    showcase_artist: "Style Afrobeat",
    lines: [
      "Deux rivières qui se rejoignent enfin",
      "De Cotonou à Accra, un seul chemin",
      "Ta main dans la mienne, le reste importe peu",
      "On s'est promis sous le regard de Dieu",
      "Christelle et Kofi, une histoire qui commence",
    ],
  },
  {
    occasion: "Hommage",
    music_style: "Rumba congolaise",
    mood: "Nostalgique",
    voice: "homme",
    showcase_title: "Papa, tu restes",
    showcase_artist: "Style Rumba",
    lines: [
      "Ta voix résonne encore dans la maison",
      "Kinshasa se souvient de tes chansons",
      "Tu nous as appris la force et la douceur",
      "On garde ton sourire au fond du cœur",
      "Papa, tu restes, même dans le silence",
    ],
  },
  {
    occasion: "Réussite",
    music_style: "Coupé-décalé",
    mood: "Joyeuse",
    voice: "homme",
    showcase_title: "Bravo le diplômé",
    showcase_artist: "Style Coupé-décalé",
    lines: [
      "Les nuits blanches ont payé, mon ami",
      "Le diplôme au mur, la famille applaudit",
      "De la galère jusqu'aux grandes écoles",
      "Aujourd'hui c'est toi la parole",
      "Bravo, le futur t'ouvre les bras",
    ],
  },
  {
    occasion: "Fête des mères",
    music_style: "Gospel",
    mood: "Douce et tendre",
    voice: "enfant",
    showcase_title: "Merci Maman",
    showcase_artist: "Style Gospel",
    lines: [
      "Maman, tes mains ont tout porté",
      "Le marché, les prières, mes cahiers",
      "Tu n'as jamais compté tes matins",
      "Aujourd'hui je prends ta main dans la mienne",
      "Merci pour tout, tu es mon refrain",
    ],
  },
];

async function main() {
  // Déjà seedé ?
  const existing = await (
    await rest("songs?is_showcase=eq.true&select=id&limit=1")
  ).json();
  if (Array.isArray(existing) && existing.length) {
    console.log("Vitrines déjà présentes — rien à faire.");
    return;
  }

  // Utilisateur démo
  const list = await (
    await fetch(`${SB}/auth/v1/admin/users?per_page=200`, { headers: H })
  ).json();
  let demo = (list.users || []).find((u) => u.email === "demo@melodya.app");
  if (!demo) {
    demo = await (
      await fetch(`${SB}/auth/v1/admin/users`, {
        method: "POST",
        headers: H,
        body: JSON.stringify({
          email: "demo@melodya.app",
          password: crypto.randomUUID(),
          email_confirm: true,
          user_metadata: { full_name: "Muzikii" },
        }),
      })
    ).json();
    console.log("Utilisateur démo créé:", demo.id);
  }

  for (const sc of SHOWCASES) {
    const song = (
      await rest("songs", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          user_id: demo.id,
          status: "ready",
          is_showcase: true,
          occasion: sc.occasion,
          music_style: sc.music_style,
          mood: sc.mood,
          voice: sc.voice,
          language: "fr",
          lyrics_approved: true,
          showcase_title: sc.showcase_title,
          showcase_artist: sc.showcase_artist,
          lyrics: sc.lines.join("\n"),
          lyrics_timing: timing(sc.lines),
        }),
      }).then((r) => r.json())
    )[0];

    await rest("song_versions", {
      method: "POST",
      body: JSON.stringify(
        [1, 2, 3].map((idx) => ({
          song_id: song.id,
          idx,
          audio_url: `${SITE}/samples/sample-${idx}.wav`,
          duration_sec: 12,
          is_selected: idx === 1,
        })),
      ),
    });

    await rest("song_assets", {
      method: "POST",
      body: JSON.stringify({
        song_id: song.id,
        type: "cover",
        url: `${SITE}/api/cover/${song.id}`,
      }),
    });

    console.log("✓", sc.showcase_title);
  }
  console.log("\nSeed terminé.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
