// Generates the downloadable demo kit (public/demo-kit/): a mockup mission
// document + garage quote (PDF, rendered from HTML via headless Chromium)
// and stylized car damage photos (SVG scenes screenshotted to PNG).
// Run:  node scripts/demo-kit/generate.mjs
// Then zip: see scripts/demo-kit/README (Compress-Archive) or deploy step.
//
// All content is FICTIONAL: "Laurentide Assurance" (insurer), "Garage
// Métro Collision" (repair shop) and every person are invented for the demo.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'demo-kit');
mkdirSync(OUT, { recursive: true });

// ─────────────────────────────────────────────────────────────── documents ──

const missionLetterHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color:#1a2330; padding:56px 64px; font-size:13px; line-height:1.55; }
  .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #0f4c5c; padding-bottom:18px; }
  .logo { font-family: Helvetica, Arial, sans-serif; }
  .logo .n { font-size:24px; font-weight:700; color:#0f4c5c; letter-spacing:.5px; }
  .logo .s { font-size:10px; color:#5b6b7a; letter-spacing:2px; text-transform:uppercase; }
  .addr { text-align:right; font-size:11px; color:#41505f; }
  h1 { font-family: Helvetica, Arial, sans-serif; font-size:15px; color:#0f4c5c; margin:26px 0 4px; letter-spacing:.5px; }
  .ref { font-size:12px; color:#41505f; margin-bottom:18px; }
  table.info { width:100%; border-collapse:collapse; margin:14px 0 20px; font-size:12.5px; }
  table.info td { border:1px solid #c9d3dc; padding:7px 10px; }
  table.info td.k { width:38%; background:#eef3f6; font-family:Helvetica,Arial,sans-serif; font-size:11px; text-transform:uppercase; letter-spacing:.5px; color:#41505f; }
  p.body { margin:10px 0; text-align:justify; }
  .sig { margin-top:34px; }
  .sig .name { font-weight:700; }
  .foot { position:fixed; bottom:28px; left:64px; right:64px; border-top:1px solid #c9d3dc; padding-top:8px; font-size:9.5px; color:#7a8794; text-align:center; }
  .stamp { margin-top:22px; display:inline-block; border:2px solid #b3452c; color:#b3452c; font-family:Helvetica,Arial,sans-serif; font-weight:700; font-size:11px; letter-spacing:2px; padding:6px 14px; transform:rotate(-4deg); }
</style></head><body>
  <div class="head">
    <div class="logo"><div class="n">Laurentide Assurance</div><div class="s">Groupe d'assurance générale — Québec</div></div>
    <div class="addr">1250, boul. René-Lévesque O., bureau 900<br>Montréal (Québec) H3B 4W8<br>Tél. : 1 800 555-0164 · sinistres@laurentide-assurance.ca</div>
  </div>

  <h1>MANDAT D'EXPERTISE AUTOMOBILE — ASSIGNMENT OF APPRAISAL</h1>
  <div class="ref">Notre référence / Our claim ref.: <b>CLM-2026-0199</b> &nbsp;·&nbsp; Police n° / Policy no.: <b>AUTO-88-452-716</b> &nbsp;·&nbsp; Montréal, le 28 juillet 2026</div>

  <p class="body">Madame, Monsieur,</p>
  <p class="body">Nous vous mandatons afin de procéder à l'expertise du véhicule décrit ci-dessous, endommagé lors d'un sinistre déclaré à nos bureaux. Nous vous remercions de planifier l'inspection dans les meilleurs délais et de nous transmettre votre rapport accompagné des photographies et de l'évaluation des réparations.</p>

  <table class="info">
    <tr><td class="k">Assuré / Insured</td><td>Marc Tremblay</td></tr>
    <tr><td class="k">Téléphone de l'assuré</td><td>+1 514 555-0192</td></tr>
    <tr><td class="k">Adresse</td><td>4821, rue Beaubien Est, Montréal (Québec) H1T 1V1</td></tr>
    <tr><td class="k">Véhicule / Vehicle</td><td>Honda Civic LX 2022 — grise / grey</td></tr>
    <tr><td class="k">Immatriculation / Plate</td><td>K52 XBM</td></tr>
    <tr><td class="k">N° de série / VIN</td><td>2HGFE2F52NH103428</td></tr>
    <tr><td class="k">Date du sinistre / Date of loss</td><td>26 juillet 2026</td></tr>
    <tr><td class="k">Nature du sinistre</td><td>Collision — impact avant droit (stationnement)</td></tr>
    <tr><td class="k">Atelier de réparation / Repair shop</td><td>Garage Métro Collision — 2210, rue Ontario Est, Montréal</td></tr>
    <tr><td class="k">Franchise / Deductible</td><td>500,00 $ CAD</td></tr>
  </table>

  <p class="body">Les dommages déclarés concernent le pare-chocs avant, l'aile avant droite et le bloc optique droit. Nous vous prions de vérifier la concordance des dommages avec les circonstances déclarées.</p>
  <p class="body">Pour toute question relative à ce dossier, veuillez citer notre référence <b>CLM-2026-0199</b>.</p>

  <div class="sig">Veuillez agréer nos salutations distinguées,<br><br>
    <span class="name">Julie Bergeron</span><br>Analyste en indemnisation — Service des sinistres automobiles<br>Laurentide Assurance</div>
  <div class="stamp">DOCUMENT DE DÉMONSTRATION — FICTIF</div>
  <div class="foot">Laurentide Assurance est une société fictive créée pour la démonstration Appraisio. Toute ressemblance avec des personnes ou sociétés réelles serait fortuite. — Fictional company created for the Appraisio demo.</div>
</body></html>`;

const garageQuoteHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Helvetica, Arial, sans-serif; color:#20262c; padding:52px 60px; font-size:12.5px; line-height:1.5; }
  .head { display:flex; justify-content:space-between; border-bottom:3px solid #b3452c; padding-bottom:16px; }
  .logo .n { font-size:22px; font-weight:800; color:#b3452c; }
  .logo .s { font-size:10px; color:#6a737c; letter-spacing:1.5px; text-transform:uppercase; }
  .addr { text-align:right; font-size:11px; color:#4a545e; }
  h1 { font-size:15px; margin:24px 0 2px; color:#b3452c; }
  .meta { font-size:11.5px; color:#4a545e; margin-bottom:16px; }
  table.grid { width:100%; border-collapse:collapse; margin-top:10px; }
  table.grid th { background:#f4e9e5; text-align:left; font-size:10.5px; text-transform:uppercase; letter-spacing:.5px; color:#7c4433; padding:7px 9px; border:1px solid #ddc9c1; }
  table.grid td { border:1px solid #ddc9c1; padding:7px 9px; }
  td.num, th.num { text-align:right; font-variant-numeric:tabular-nums; }
  tr.total td { font-weight:800; background:#f9f3f1; }
  .note { margin-top:18px; font-size:11px; color:#4a545e; }
  .stamp { margin-top:20px; display:inline-block; border:2px solid #b3452c; color:#b3452c; font-weight:700; font-size:11px; letter-spacing:2px; padding:6px 14px; transform:rotate(-3deg); }
  .foot { position:fixed; bottom:26px; left:60px; right:60px; border-top:1px solid #ddc9c1; padding-top:8px; font-size:9.5px; color:#8a8f95; text-align:center; }
</style></head><body>
  <div class="head">
    <div class="logo"><div class="n">Garage Métro Collision</div><div class="s">Carrosserie · Débosselage · Peinture</div></div>
    <div class="addr">2210, rue Ontario Est<br>Montréal (Québec) H2K 1W2<br>Tél. : 1 514 555-0147 · estimation@metrocollision.ca</div>
  </div>

  <h1>DEVIS DE RÉPARATION — REPAIR ESTIMATE N° E-2026-3417</h1>
  <div class="meta">Date : 30 juillet 2026 &nbsp;·&nbsp; Client : <b>Marc Tremblay</b> &nbsp;·&nbsp; Véhicule : <b>Honda Civic LX 2022</b> &nbsp;·&nbsp; Immatriculation : <b>K52 XBM</b> &nbsp;·&nbsp; Réf. sinistre : <b>CLM-2026-0199</b></div>

  <table class="grid">
    <tr><th style="width:52%">Désignation / Description</th><th class="num">Qté</th><th class="num">Prix unitaire</th><th class="num">Montant (CAD)</th></tr>
    <tr><td>Pare-chocs avant — remplacement (pièce d'origine)</td><td class="num">1</td><td class="num">486,00 $</td><td class="num">486,00 $</td></tr>
    <tr><td>Bloc optique avant droit — remplacement</td><td class="num">1</td><td class="num">342,50 $</td><td class="num">342,50 $</td></tr>
    <tr><td>Aile avant droite — débosselage et redressage</td><td class="num">1</td><td class="num">265,00 $</td><td class="num">265,00 $</td></tr>
    <tr><td>Support de pare-chocs et fixations</td><td class="num">1</td><td class="num">78,40 $</td><td class="num">78,40 $</td></tr>
    <tr><td>Main-d'œuvre carrosserie (7,5 h × 95 $/h)</td><td class="num">7,5</td><td class="num">95,00 $</td><td class="num">712,50 $</td></tr>
    <tr><td>Préparation et peinture — 2 panneaux (teinte usine NH-797M)</td><td class="num">1</td><td class="num">540,00 $</td><td class="num">540,00 $</td></tr>
    <tr><td>Matériaux de peinture et consommables</td><td class="num">1</td><td class="num">128,60 $</td><td class="num">128,60 $</td></tr>
    <tr><td colspan="3" class="num">Sous-total</td><td class="num">2 553,00 $</td></tr>
    <tr><td colspan="3" class="num">TPS (5 %)</td><td class="num">127,65 $</td></tr>
    <tr><td colspan="3" class="num">TVQ (9,975 %)</td><td class="num">254,66 $</td></tr>
    <tr class="total"><td colspan="3" class="num">TOTAL</td><td class="num">2 935,31 $</td></tr>
  </table>

  <div class="note">Devis valide 30 jours. Délai estimé des travaux : 4 jours ouvrables après réception des pièces. Véhicule de courtoisie disponible sur demande.</div>
  <div class="stamp">DOCUMENT DE DÉMONSTRATION — FICTIF</div>
  <div class="foot">Garage Métro Collision est une société fictive créée pour la démonstration Appraisio. — Fictional company created for the Appraisio demo.</div>
</body></html>`;

// ────────────────────────────────────────────────────────────────── photos ──
// Stylized "phone photo" scenes: a grey sedan in front of a garage/driveway,
// with stage-dependent damage overlays on the front right.

function carScene({ stage, crop, shot }) {
  // stage: 'before' | 'during' | 'after'
  const damaged = stage === 'before';
  const during = stage === 'during';
  const bumperFill = during ? '#8f9aa3' : '#b9bfc6'; // primer grey while in repair
  const dents = damaged
    ? `<ellipse cx="1235" cy="655" rx="52" ry="34" fill="#3d4750" opacity=".55"/>
       <ellipse cx="1180" cy="700" rx="34" ry="20" fill="#39424b" opacity=".5"/>
       <path d="M1150 615 l84 32 M1172 600 l70 42 M1136 640 l76 36" stroke="#2c343c" stroke-width="5" stroke-linecap="round" opacity=".65"/>
       <path d="M1245 628 l30 10 -16 8 22 12 -30 -8 12 -14z" fill="#e8edf2" opacity=".95"/>
       <path d="M1300 690 l28 40 -14 -6 6 30" stroke="#2c343c" stroke-width="4" fill="none" opacity=".6"/>` // cracked bumper line
    : '';
  const tape = during
    ? `<rect x="1090" y="585" width="240" height="16" fill="#d9b13b" opacity=".9" transform="rotate(-6 1210 593)"/>
       <rect x="1080" y="705" width="255" height="16" fill="#d9b13b" opacity=".9" transform="rotate(4 1205 713)"/>
       <rect x="1120" y="470" width="300" height="250" fill="#ffffff" opacity=".14"/>` // plastic sheeting over the front
    : '';
  const shine = stage === 'after'
    ? `<path d="M300 430 q320 -60 640 0" stroke="#ffffff" stroke-width="14" fill="none" opacity=".35" stroke-linecap="round"/>`
    : '';
  const bg = during
    ? `<rect width="1600" height="1200" fill="#4a4f55"/>
       <rect y="820" width="1600" height="380" fill="#3a3e43"/>
       <rect x="80" y="120" width="330" height="700" fill="#5a6067"/>
       <rect x="120" y="170" width="250" height="90" fill="#788089"/><rect x="120" y="290" width="250" height="90" fill="#788089"/>
       <rect x="1220" y="140" width="290" height="560" fill="#565c63"/><rect x="1255" y="180" width="220" height="60" fill="#6e767f"/>`
    : `<rect width="1600" height="1200" fill="#a9c0d0"/>
       <rect y="700" width="1600" height="500" fill="#6d7378"/>
       <rect y="700" width="1600" height="14" fill="#5b6166"/>
       <rect x="0" y="180" width="1600" height="520" fill="#c7cdd2"/>
       <rect x="90" y="260" width="380" height="440" fill="#9aa2a9"/><rect x="110" y="280" width="340" height="20" fill="#868e95"/><rect x="110" y="320" width="340" height="20" fill="#868e95"/><rect x="110" y="360" width="340" height="20" fill="#868e95"/>
       <rect x="1180" y="300" width="330" height="400" fill="#b5bcc2"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${crop}" width="1280" height="960">
    ${bg}
    <ellipse cx="800" cy="905" rx="560" ry="46" fill="#000" opacity=".28"/>
    <!-- body -->
    <path d="M330 760 q-30 -120 60 -150 l120 -34 q90 -110 250 -118 l190 -4 q160 6 240 96 l70 62 q120 18 150 70 q26 50 6 108 l-30 24 -1050 0 q-24 -22 -6 -54z" fill="#8e979f"/>
    <path d="M330 760 q-30 -120 60 -150 l120 -34 q90 -110 250 -118 l190 -4 q160 6 240 96 l70 62 q120 18 150 70 l-1086 6z" fill="#9aa4ad"/>
    <!-- windows -->
    <path d="M540 578 q80 -96 226 -104 l160 -2 q120 8 190 88 l-260 18z" fill="#3d4750"/>
    <path d="M556 574 q74 -84 210 -92 l-10 92z" fill="#5a6a76"/>
    <path d="M790 480 l150 0 q110 8 170 82 l-320 12z" fill="#4a5964"/>
    <!-- front (right side of image) bumper + fender zone -->
    <path d="M1190 610 q120 18 150 70 q26 50 6 108 l-30 24 -170 0 0 -196z" fill="${bumperFill}"/>
    ${during ? '' : `<path d="M1180 640 l150 22 -4 26 -148 -16z" fill="#7d868e"/>`}
    <!-- headlight -->
    <path d="M1216 620 l96 16 q22 6 18 26 l-116 -14z" fill="${damaged ? '#c8ccd0' : '#e8edf2'}"/>
    <!-- wheels -->
    <g><circle cx="560" cy="822" r="96" fill="#22262a"/><circle cx="560" cy="822" r="52" fill="#aab2b9"/><circle cx="560" cy="822" r="18" fill="#5c646b"/></g>
    <g><circle cx="1130" cy="822" r="96" fill="#22262a"/><circle cx="1130" cy="822" r="52" fill="#aab2b9"/><circle cx="1130" cy="822" r="18" fill="#5c646b"/></g>
    <!-- door lines + handles -->
    <path d="M812 588 l4 240" stroke="#767f88" stroke-width="5"/>
    <path d="M602 592 l4 236" stroke="#767f88" stroke-width="5"/>
    <rect x="700" y="640" width="58" height="12" rx="6" fill="#6e7780"/>
    <rect x="880" y="640" width="58" height="12" rx="6" fill="#6e7780"/>
    <!-- plate -->
    <rect x="1250" y="726" width="104" height="40" rx="4" fill="#eef2f5" stroke="#5c646b" stroke-width="3"/>
    <text x="1302" y="754" font-family="Arial" font-size="26" font-weight="700" fill="#2b3742" text-anchor="middle">K52 XBM</text>
    ${dents}${tape}${shine}
    <!-- phone-photo watermark -->
    <text x="40" y="1160" font-family="Arial" font-size="30" fill="#ffffff" opacity=".8">${shot}</text>
  </svg>`;
  return `<!doctype html><html><head><style>*{margin:0}body{width:1280px;height:960px;overflow:hidden}</style></head><body>${svg}</body></html>`;
}

const FULL = '0 60 1600 1200';
const FRONT = '760 320 840 630'; // close-up on the damaged front right

const photos = [
  ['2-photo-before-1.png', carScene({ stage: 'before', crop: FULL, shot: 'IMG_2026-07-29 09:14' })],
  ['2-photo-before-2.png', carScene({ stage: 'before', crop: FRONT, shot: 'IMG_2026-07-29 09:15' })],
  ['2-photo-before-3.png', carScene({ stage: 'before', crop: '520 260 1080 810', shot: 'IMG_2026-07-29 09:17' })],
  ['4-photo-during-1.png', carScene({ stage: 'during', crop: FULL, shot: 'IMG_2026-08-04 14:02' })],
  ['4-photo-during-2.png', carScene({ stage: 'during', crop: FRONT, shot: 'IMG_2026-08-04 14:03' })],
  ['5-photo-after-1.png', carScene({ stage: 'after', crop: FULL, shot: 'IMG_2026-08-07 16:41' })],
  ['5-photo-after-2.png', carScene({ stage: 'after', crop: FRONT, shot: 'IMG_2026-08-07 16:42' })],
];

const readme = `APPRAISIO DEMO KIT / KIT DE DÉMONSTRATION
==========================================
Fictional documents for the guided hands-on tour. Use them in this order:
Documents fictifs pour la visite guidée. Utilisez-les dans cet ordre :

1-mission-document.pdf   -> "Mission creation" on the Files page: import it,
                            the AI reads it and fills the new file for you.
2-photo-before-*.png     -> File step "Planning - before": the damage photos.
3-garage-quote.pdf       -> File step "Agreement": the repair shop's estimate.
4-photo-during-*.png     -> File step "Planning - in progress".
5-photo-after-*.png      -> File step "Planning - after": repaired vehicle.

Everything here is invented (companies, people, plates). / Tout est fictif.
`;

// ───────────────────────────────────────────────────────────────── render ──

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });

await page.setContent(missionLetterHtml, { waitUntil: 'load' });
await page.pdf({ path: join(OUT, '1-mission-document.pdf'), format: 'Letter', printBackground: true });
console.log('1-mission-document.pdf');

await page.setContent(garageQuoteHtml, { waitUntil: 'load' });
await page.pdf({ path: join(OUT, '3-garage-quote.pdf'), format: 'Letter', printBackground: true });
console.log('3-garage-quote.pdf');

for (const [name, html] of photos) {
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: join(OUT, name), type: 'png' });
  console.log(name);
}

writeFileSync(join(OUT, 'README.txt'), readme, 'utf8');
console.log('README.txt');

await browser.close();
console.log('Demo kit written to', OUT);
