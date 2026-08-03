// Photorealistic demo-kit photos via the Gemini image API — generates ONE
// consistent car and edits it through the repair stages so before/during/
// after clearly show the same vehicle. Overwrites public/demo-kit/photos/*.
//
// Requires the demo project's Gemini billing to have credit
// (https://ai.studio/projects — the scan API uses the same pool).
// Run:  GOOGLE_GENAI_API_KEY=... node scripts/demo-kit/generate-photos-ai.mjs
//       (or set the key in the environment; Secret Manager holds it:
//        gcloud secrets versions access latest --secret=GOOGLE_GENAI_API_KEY
//        --project=appraisio-demo-ca)
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const KEY = process.env.GOOGLE_GENAI_API_KEY;
if (!KEY) throw new Error('GOOGLE_GENAI_API_KEY required');
const MODEL = process.env.IMAGE_MODEL || 'gemini-3.1-flash-image';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'demo-kit', 'photos');
mkdirSync(OUT, { recursive: true });

async function generate(parts, label) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    },
  );
  if (!res.ok) throw new Error(`${label}: ${res.status} ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const img = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!img) throw new Error(`${label}: no image in response`);
  return img.inlineData.data; // base64
}

const imgPart = (b64) => ({ inlineData: { mimeType: 'image/png', data: b64 } });
const save = (name, b64) => {
  writeFileSync(join(OUT, name), Buffer.from(b64, 'base64'));
  console.log(name);
};

const STYLE =
  'Photorealistic photo taken on a phone by an insurance appraiser. Natural daylight, slightly imperfect framing, realistic reflections. The licence plate is blurred and unreadable (privacy). No people, no text overlays, no watermarks.';

// 1. Base damaged car — every other shot is an edit of this one.
const base = await generate(
  [
    {
      text:
        `${STYLE} A grey 2022 compact sedan (Honda Civic style) parked in a Canadian residential driveway in summer. ` +
        'The FRONT RIGHT corner is visibly damaged from a parking collision: dented and scuffed front bumper, creased front right fender, cracked right headlight. Three-quarter front-right view showing the whole car.',
    },
  ],
  'before-1',
);
save('before-1.png', base);

// 2/3. Close-ups of the SAME car.
save(
  'before-2.png',
  await generate(
    [imgPart(base), { text: `${STYLE} Same car, same damage: close-up of the damaged front right bumper corner and cracked headlight, taken from one metre away.` }],
    'before-2',
  ),
);
save(
  'before-3.png',
  await generate(
    [imgPart(base), { text: `${STYLE} Same car, same damage: side angle along the front right fender showing the crease line and scuffs, low camera height.` }],
    'before-3',
  ),
);

// 4/5. Mid-repair in the body shop.
const during = await generate(
  [
    imgPart(base),
    {
      text:
        `${STYLE} The SAME grey sedan now inside an auto body shop: front bumper removed, primer patches on the front right fender, masking tape and paper protecting panels, shop lighting, tools in the background.`,
    },
  ],
  'during-1',
);
save('during-1.png', during);
save(
  'during-2.png',
  await generate(
    [imgPart(during), { text: `${STYLE} Same scene, close-up of the front right area with the bumper removed and primer-coated fender.` }],
    'during-2',
  ),
);

// 6/7. Repaired.
const after = await generate(
  [
    imgPart(base),
    {
      text:
        `${STYLE} The SAME grey sedan fully repaired, clean and glossy, parked outside the body shop: brand-new front bumper, flawless front right fender, new clear headlight. Three-quarter front-right view.`,
    },
  ],
  'after-1',
);
save('after-1.png', after);
save(
  'after-2.png',
  await generate(
    [imgPart(after), { text: `${STYLE} Same repaired car, close-up of the pristine front right corner and new headlight.` }],
    'after-2',
  ),
);

console.log('Photorealistic photos written to', OUT);
