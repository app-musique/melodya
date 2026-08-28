// Génère 3 extraits audio « placeholder » utilisés par le fournisseur musical mock.
// Rien de musical à en attendre : ce sont de simples arpèges synthétisés.
// Usage : node scripts/make-samples.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "public", "samples");
mkdirSync(outDir, { recursive: true });

const SAMPLE_RATE = 22050;
const DURATION = 12; // secondes

/** Écrit un buffer PCM 16-bit mono en fichier WAV. */
function writeWav(path, samples) {
  const dataLen = samples.length * 2;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataLen, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataLen, 40);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((v * 32767) | 0, 44 + i * 2);
  }
  writeFileSync(path, buf);
}

const CHORDS = [
  [261.63, 329.63, 392.0], // Do majeur
  [220.0, 277.18, 329.63], // La majeur
  [196.0, 246.94, 293.66], // Sol majeur
];

CHORDS.forEach((chord, idx) => {
  const n = SAMPLE_RATE * DURATION;
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    // arpège : une note du chord toutes les 0,4 s
    const note = chord[Math.floor(t / 0.4) % chord.length];
    const env = Math.min(1, t / 0.5) * Math.min(1, (DURATION - t) / 1.5);
    const vibrato = 1 + 0.004 * Math.sin(2 * Math.PI * 5 * t);
    let s = 0;
    s += 0.5 * Math.sin(2 * Math.PI * note * vibrato * t);
    s += 0.2 * Math.sin(2 * Math.PI * note * 2 * t);
    s += 0.15 * Math.sin(2 * Math.PI * chord[0] * 0.5 * t); // basse
    samples[i] = s * env * 0.5;
  }
  const file = join(outDir, `sample-${idx + 1}.wav`);
  writeWav(file, samples);
  console.log("écrit", file);
});
