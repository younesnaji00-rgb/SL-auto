/**
 * Voiceover script for the Appraisio demo video.
 * One entry per scene; `id` links the audio file, the recording, and the
 * assembly step. Keep texts ~140 wpm — scene recordings pad to fit.
 */
export const SCENES = [
  {
    id: '01-title',
    kind: 'slide',
    slide: 'title.html',
    text:
      'Meet Appraisio — a complete claims management and appraisal workflow platform, built specifically for independent auto appraisal firms. From the first mission document to the final signed report, every step of a claim lives in one place. Let me show you around.',
  },
  {
    id: '02-login',
    kind: 'app',
    text:
      'Signing in is deliberately simple: your people log in with their name — no email addresses to remember. The platform is fully bilingual: one click switches between English and French, and every screen, form, and generated document follows. Access is role-based — managers, estimators, and field agents each get a workspace shaped around their job. Let us sign in as an administrator.',
  },
  {
    id: '03-dashboard',
    kind: 'app',
    text:
      'This is the dashboard — a live pulse of the whole operation. Case-load counters, files broken down by status and by insurer, and a real-time activity feed showing every change your team makes, as it happens. The period selector recomputes everything on the fly — day, week, month, or any custom range. And because the data is live, there is no refresh button anywhere: the numbers move when the work moves.',
  },
  {
    id: '04-dossiers',
    kind: 'app',
    text:
      'The files page is the manager’s daily worklist. Instant search across references, insured names, and license plates; per-column filters; and color-coded statuses that tell you exactly where each claim stands. Creating a new file is where it gets interesting: scan the insurer’s mission document, and A I extraction pre-fills the entire form — insured, vehicle, policy, everything.',
  },
  {
    id: '05-detail',
    kind: 'app',
    text:
      'Inside a file, the whole claim is organized as a timeline — the exact lifecycle an appraisal goes through. Mission creation, with A I scanned documents. Field scheduling, where photo missions are assigned to agents with live location tracking. Estimating, where the garage’s estimate is extracted line by line for your estimator to verify and adjust. Then the agreement rounds — proposal, negotiation, second and third agreements when needed. And finally the expert report, generated as a polished P D F in one click, and the invoice. Every action is logged, so the audit trail writes itself.',
  },
  {
    id: '06-tutorial',
    kind: 'app',
    text:
      'And notice this — every single page ships with a built-in guided tutorial. New team members click the pulsing help button and get walked through the page, step by step, in their language. Onboarding that used to take days now happens inside the app itself.',
  },
  {
    id: '07-monitoring',
    kind: 'app',
    text:
      'For team leads, the monitoring view turns deadlines into a funnel. Each workflow step shows what is on time, what is late, and what has not happened yet — computed in business days, with holidays excluded. One click drills from a red bar straight down to the exact files that need attention.',
  },
  {
    id: '08-mobile',
    kind: 'mobile',
    text:
      'Out in the field, agents get a mobile-first experience. Their day is a mission list — before, during, and after repairs — each with its deadline. The camera-first flow is the highlight: the agent scans a license plate, A I matches it to the right file, and photo upload starts immediately. No typing, no searching, no mistakes.',
  },
  {
    id: '09-tech',
    kind: 'slide',
    slide: 'tech.html',
    text:
      'Under the hood, Appraisio is a modern, serverless stack. Next J S and TypeScript on the front end. Firebase for authentication, live data, and storage — hosted in Canada, in Google’s Montréal region. Document intelligence runs on Google’s Gemini models. It deploys on Cloud Run and scales to zero when idle, so infrastructure cost follows usage. It installs as a progressive web app with offline-tolerant drafts. And the entire platform is white-label: your brand, your language, your market rules — from one code base.',
  },
  {
    id: '10-closing',
    kind: 'slide',
    slide: 'closing.html',
    text:
      'Everything you have seen follows the same design principles: responsive on any device, role-shaped workspaces, drafts that survive bad connections, and guidance built into every page. The demo is live right now — log in and try it yourself. Appraisio: your appraisal workflow, in one place.',
  },
];
