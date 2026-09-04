/**
 * Mux each scene's video+audio and concat into the final MP4.
 * Prereq: tts.mjs + record.mjs have run.
 * Usage: node scripts/demo-video/assemble.mjs
 * Output: scripts/demo-video/out/appraisio-demo.mp4 (1080p30, H.264 + AAC)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { SCENES } from './narration.mjs';

const require = createRequire(import.meta.url);
const FFMPEG = require('ffmpeg-static');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'out');
const CLIPS = path.join(OUT, 'clips');
fs.mkdirSync(CLIPS, { recursive: true });
const durations = JSON.parse(fs.readFileSync(path.join(OUT, 'audio', 'durations.json'), 'utf8'));

// Cream brand background behind pillarboxed (mobile) scenes.
const PAD = 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0xfbf9f4,fps=30,format=yuv420p';

for (const scene of SCENES) {
  const v = path.join(OUT, 'video', `${scene.id}.webm`);
  const a = path.join(OUT, 'audio', `${scene.id}.wav`);
  const clip = path.join(CLIPS, `${scene.id}.mp4`);
  const t = (durations[scene.id] + 0.6).toFixed(2);
  execFileSync(
    FFMPEG,
    [
      '-y',
      '-i', v,
      '-i', a,
      '-map', '0:v', '-map', '1:a',
      '-vf', PAD,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
      '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2',
      '-af', 'apad',
      '-t', t,
      clip,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  console.log(`clip ${scene.id} (${t}s)`);
}

const listFile = path.join(OUT, 'concat.txt');
fs.writeFileSync(
  listFile,
  SCENES.map((s) => `file '${path.join(CLIPS, `${s.id}.mp4`).replace(/\\/g, '/')}'`).join('\n'),
);
const FINAL = path.join(OUT, 'appraisio-demo.mp4');
execFileSync(FFMPEG, ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', FINAL], {
  stdio: ['ignore', 'ignore', 'pipe'],
});
const mb = (fs.statSync(FINAL).size / 1024 / 1024).toFixed(1);
const total = SCENES.reduce((a, s) => a + durations[s.id] + 0.6, 0);
console.log(`FINAL: ${FINAL} (${mb} MB, ~${(total / 60).toFixed(1)} min)`);
