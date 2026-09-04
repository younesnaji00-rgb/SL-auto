/**
 * Generate the voiceover WAVs via Google Cloud Text-to-Speech.
 * Usage: PROJECT_ID=appraisio-demo-ca ACCESS_TOKEN=$(gcloud auth print-access-token) node scripts/demo-video/tts.mjs
 * Writes scripts/demo-video/out/audio/<scene>.wav + durations.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCENES } from './narration.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'out', 'audio');
fs.mkdirSync(OUT, { recursive: true });

const PROJECT_ID = process.env.PROJECT_ID || 'appraisio-demo-ca';
const TOKEN = process.env.ACCESS_TOKEN;
if (!TOKEN) throw new Error('ACCESS_TOKEN env var required (gcloud auth print-access-token)');

const VOICE = { languageCode: 'en-US', name: 'en-US-Chirp3-HD-Charon' };
const RATE = 24000;

async function synth(text) {
  const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'x-goog-user-project': PROJECT_ID,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: { text },
      voice: VOICE,
      audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: RATE, speakingRate: 1.0 },
    }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${await res.text()}`);
  const { audioContent } = await res.json();
  return Buffer.from(audioContent, 'base64');
}

/** LINEAR16 WAV duration = data-chunk bytes / (rate * 2 bytes/sample). */
function wavDuration(buf) {
  // Find the 'data' chunk (Google prefixes a standard 44-byte header, but be safe).
  const idx = buf.indexOf(Buffer.from('data'));
  const size = buf.readUInt32LE(idx + 4);
  return size / (RATE * 2);
}

const durations = {};
for (const scene of SCENES) {
  const buf = await synth(scene.text);
  const file = path.join(OUT, `${scene.id}.wav`);
  fs.writeFileSync(file, buf);
  durations[scene.id] = Number(wavDuration(buf).toFixed(2));
  console.log(`${scene.id}: ${durations[scene.id]}s (${(buf.length / 1024).toFixed(0)} KB)`);
}
fs.writeFileSync(path.join(OUT, 'durations.json'), JSON.stringify(durations, null, 2));
const total = Object.values(durations).reduce((a, b) => a + b, 0);
console.log(`total narration: ${(total / 60).toFixed(1)} min`);
