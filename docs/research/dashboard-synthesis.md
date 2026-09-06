# Tableau de bord par rôle — synthèse de recherche et décisions (2026-09-06)

Owner ask: one dashboard per role (Gestionnaire, Chiffreur, Agent de Terrain), and for
Admin / Responsable d'équipe a three-tab window (one tab per role) with a per-user toggle;
"deep research, established concepts and methodologies, stick to the app's design rules".

Four parallel research rounds under the §2 sourcing policy (practitioner blogs, books,
theory, product documentation, forums; the big design systems only as corroboration;
every claim cites a URL actually fetched; could-not-fetch lists are honest — Reddit blocks
the crawler, HN and vendor communities stood in):

- `dashboard-theory.md` — 41 sources. How to DECIDE what a dashboard contains: Few's
  taxonomy and 13 mistakes, GQM, KPI trees, Lean Analytics, leading/lagging, Kanban flow
  metrics (Vacanti / Kanban Guide), Miller/Cowan chunking, IC vs manager differences.
- `dashboard-industry-kpis.md` — 33 sources. What auto-claims / appraisal operations
  measure (CCC, Mitchell, Verisk, McKinsey, Claims Journal, BCA, ACAPS / loi 17-99…) and
  which of it we can compute honestly; a KPI catalogue with formulas on our fields.
- `dashboard-role-based.md` — 38 sources. How Linear / Jira / Asana / Zendesk /
  ServiceNow / Salesforce / Front / field-service apps build personal "my work" views and
  manager drill-downs; Deming, Muller, leaderboard studies, HBR on monitoring.
- `dashboard-elements.md` — 34 sources. Per-element anatomy: stat tile with comparison,
  bullet graph, segmented meter, worklist row, trends, person-vs-team strip, today strip
  for field agents, activity feed, period selector, layout grid.

---

## 1. What the four rounds agree on (binding for the build)

1. **A dashboard's first block is the smallest actionable set, not a chart.** Few's own
   definition admits worklists; Juice "lead with the To Dos"; Linear / Zendesk / Things
   order by urgency and hide empty sections. → Every role opens on « À traiter » /
   « Ma file » / « Prochaine mission », oldest or nearest-deadline first, capped at 5–7
   rows with « Voir les N autres → » into the existing queue.
2. **The daily measure is work-item AGE against the SLA plus WIP — not cycle time.**
   Vacanti / Kanban Guide: age is "by far the most important" flow metric and the only
   leading one; throughput and cycle time are review-level. → Cycle time, funnel, weekly
   trend and compagnie split stay on Suivi d'équipe; the dashboards never duplicate them.
3. **Actionable vs waiting-on-others is an explicit split** (Front "Later", Intercom
   snooze, GTD Waiting-For). → Gestionnaire has « En attente d'un tiers » grouped by party
   (chiffreur / agent / autre) with the oldest item's age.
4. **Time-in-status, not total age, is the stuck signal** (SaaSJet, Jira users, Zendesk
   "oldest updated"). → « Sans mouvement depuis > 2 j ouvrés » computed from the last
   dated field on the dossier.
5. **Speed never travels alone: show its quality twin.** Industry supplement rate ≈ 35 %,
   best-in-class 14 %; PartsTrader's pairing rule. → Chiffreur sees « Révisions » (2ᵉ/3ᵉ
   accords ÷ assignations reçues, 30 j) next to « Dans les délais ».
6. **Personal numbers are self-referenced only; managers compare to the team median,
   never to a rank** (Deming red beads, Muller / Goodhart, leaderboard studies: 31 % report
   harm, bottom-ranked disengage; HBR: monitoring erodes trust). → « Terminés · 7 j » with
   « vs 7 j préc. »; the admin table ends on a « Médiane équipe » row; the person view adds
   a « Contexte de charge » strip (person bar · Q1–Q3 band · median tick) and prints the
   30-day intake next to every rate.
7. **What the admin sees about a person, the person sees about themself, with the same
   definitions** (transparency, HBR / HN). → Selecting a user renders that role's own
   dashboard component unchanged, under a banner « Vue : Nom — Rôle ».
8. **Count chunks, not KPIs: 3–4 tiles, ≤ 5 blocks, one screen** (Cowan; Few #1; Den
   Otter "three or four numbers every morning"; Smashing "about five"). → 4 tiles + 2–3
   blocks per role; 2 detail tiles on the phone.
9. **Every figure prints its period and comparison; colour only on a breached gap**
   (Few #2/#4/#12; Tabular Editor "colour the gap, not the value"). → Captions print the
   real window (« 30 août – 6 sept. », « maintenant »); danger pair only when a count IS an
   exception; arrows in plain ink; small-n deltas printed as raw change « +2 (3 → 5) ».
10. **Field workers get one column: next job first, huge targets, no charts** (Microsoft
    Field Service, ServiceTitan, Jobber, Team400; contrast collapses in sunlight). →
    « Prochaine mission » card with « Ouvrir / Itinéraire / Appeler » at 48 px, then
    « En retard », « Aujourd'hui », « Photos à envoyer », « Demain ».
11. **Land each role on its dashboard, on condition block 1 is the next thing to open**
    (Zendesk Agent Home default; ServiceNow Workspace per-role landing; NN/g: role-based
    personalisation is used, individual customisation is not). → `/dashboard` is now
    visible to the three roles and, being first in the nav, becomes their landing page.

## 2. Where the rounds differed, and the option taken

| Question | Options in the reports | Taken | Why |
|---|---|---|---|
| Charts on personal dashboards | theory: one sparkline on the throughput tile is acceptable · role-based: none (Goodhart) · industry: none | **none** | two of three rounds; the Suivi d'équipe trend exists |
| Peers on a non-admin dashboard | elements C3: anonymous dots + median · theory/role-based: nothing about others | **nothing** | the stricter rulings win; Admin keeps the comparison |
| Meter baseline | elements C1: (c) late-first on desk views, done-first on the AT strip | **(c)** | recommended option |
| Colour on deltas | elements C4: (b) only when a band is breached, plain-ink arrows | **(b)** | matches the locked "only when there IS an exception" rule |
| Activity feed | elements C5: Admin only · role-based / theory: out | **removed** | the old two « Changements récents » feeds were analytical clutter; can return on Admin if asked |
| Period selector | elements B9: Aujourd'hui · 7 j · 30 j top-right · theory/role-based: fixed windows in captions | **no selector** | the dashboards are "now" views; each caption names its window; Suivi d'équipe owns period analysis |
| Trend window | elements C2 (12 vs 13 weeks) | moot | no trends on the dashboards |

## 3. What each dashboard contains (as built)

**Gestionnaire** — tiles: En cours (dont N créés · 7 j) · En retard (danger when > 0) ·
Rappels non lus (oldest inline → Mes rappels) · Terminés (rapport déposé · 7 j vs 7 j
préc.). Row 2: « À traiter » (the dossier page's own À-faire rows, non-waiting, per open
dossier I created, oldest-movement first, cap 7) · « En attente d'un tiers » · « Sans
mouvement » (> 48 h ouvrées, cap 5). Row 3: « Mes dossiers par étape » (open dossiers by
next step, late count in danger) · « Âge des dossiers ouverts » (0–7 / 8–15 / 16–30 /
31–60 / > 60 j since requête — Moroccan practice bands).

**Chiffreur** — tiles: En attente (hero 48 px, dont N révisions) · Hors délai · Terminés
(7 j vs 7 j préc.) · Dans les délais (30 j, % with a zero-based strip, no target set).
Row 2: « Ma file » banded exactly like the queue (Dépassées / Moins de 6 h / Aujourd'hui /
À venir), first row = next to open, countdown or lateness per row, revision badge; cap 7 ·
« Révisions » (30 j ratio) · « Par urgence » meter (late-first).

**Agent de Terrain** — single column: « Prochaine mission » card (solid terracotta time
block = THE next one; Ouvrir / Itinéraire / Appeler) · « En retard » (RDV passé sans
photos or > 24 h ouvrées; « Rien en retard » + next deadline) · « Aujourd'hui » in RDV
order with type and status chips · « Photos à envoyer » (only when non-empty) · two detail
tiles (Cette semaine faites / planifiées · Demain).

**Admin / Responsable d'équipe** — tabs Gestionnaires · Chiffreurs · Terrain (`?vue=`),
« Voir : Toute l'équipe ▾ » (`&user=`). Per tab: 4 team tiles (En cours · En retard ·
Non assignés or Sans mouvement · Terminés 7 j vs préc.) · « Exceptions » (union of every
member's late items, owner named, cap 10) · « Charge par personne » bar list (click →
person) · « Par personne » table (En cours · Plus ancien · En retard · Terminés 7 j ·
SLA 30 j · Reçus 30 j) ending on « Médiane équipe ». Person selected: banner + that role's
dashboard unchanged + « Contexte de charge » (Reçus 30 j with mix; En cours / Terminés 7 j /
SLA 30 j vs the team median and interquartile band).

## 4. Definitions (single source: `src/app/(app)/dashboard/metrics.ts`, tested)

- Clocks: `buildSlaItems` from Suivi d'équipe — chiffrage `createdAt → completedAt`,
  mission `createdAt → datePhotos<type>`, création `dateRequete → createdAt`, 24 h
  ouvrées, Moroccan holidays paused. Late = breached now and not done.
- Open dossier = no `dateRapportDepose`. Owner of a dossier = `createdBy` uid, or legacy
  `createdByName` = nom / email. Chiffrage owner = `assignedChiffreurId` or name (the
  queue's rule); mission owner = `agentTerrainUid` or name (the queue's rule).
- Revision = not the dossier's first queue assignment (same rule as the funnel's
  « 2ème accord et + »). Queue assignments without files are ignored, as in the queue.
- Terminés · 7 j = [now − 7 j, now]; « vs 7 j préc. » = the 7 days before that.
- Sans mouvement = last dated field on the dossier older than 48 h ouvrées.
- Team median / quartiles over active users of the role (statut ≠ Inactif).

## 5. Deliberately not built (from the reports' do-not lists)

Customisable widget grid · charts or sparklines on personal dashboards · leaderboards,
ranks, percentiles, medals · a second copy of the rappel list or of the queue table ·
team-vs-me on the personal dashboard · admin-only hidden metrics or « last seen » presence ·
cross-role comparisons · total age as the stuck signal · money KPIs (devis totals unreliable)
· drive time (no GPS trail) · photo-quality score (no rejection flag) · CSAT (no channel) ·
hard timers with trivial satisfiers · more than ~6 cards per role · real-time counters that
flicker (the freshness stamp says « En direct · HH:MM »).

## 6. Owner decisions still open

1. Restore an activity feed on the Admin tabs (« Changements récents »)? Recommended no.
2. Publish a firm SLA target (e.g. 90 % ≤ 24 h) so the « Dans les délais » strip and the
   Contexte de charge strip can show a target tick (Few bullet graph)? Recommended yes once
   the firm names the number.
3. Show anonymous team dots + median on the personal dashboards (elements C3-a)? Built
   without; two rounds argue against.
4. The Gestionnaire's dossier ownership is "created by" — if the firm reassigns dossiers
   between gestionnaires, a `gestionnaireUid` field would be needed for the dashboard to
   follow.
