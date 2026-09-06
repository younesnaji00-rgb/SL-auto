# Dashboard research — industry KPIs for auto-claims appraisal (2026-09-06)

**Researcher:** Claude (UX/ops-research subagent), for the per-role dashboard work.
**Target context:** SL Auto Expertise — French-language back-office for a Moroccan
cabinet d'expertise automobile. Roles: Gestionnaire (case handler), Chiffreur
(desk estimator, 24 h ouvrées SLA), Agent de Terrain (field photographer,
missions Avant / En cours / Après with RDV, 24 h ouvrées SLA from planification,
phone-first), Admin / Responsable d'équipe. One dashboard per role plus an
admin view with per-user drill-down.
**Source policy honoured:** industry reports, vendor docs, trade press,
practitioner writing, French and Moroccan sources; each finding cites its URL.
Reddit is blocked for this crawler (see Part D) — the practitioner voice comes
from Claims Journal, CLM Magazine, a LinkedIn article by a claims manager, and
Direct Claim Solution instead.
**Sources fetched:** 33 fetched (YES or PARTIAL), 11 could not be fetched.

---

## PART A — Sources

### A1. PartsTrader — "Measuring KPIs on Auto Physical Damage Claims"
URL: https://www.partstrader.com/measuring-kpis-on-auto-physical-damage-claims/ — Fetched: YES
- Recommends **4–5 core metrics plus 1–2 rotating focus areas**, all from "one source of truth".
- Metrics must be paired so one cannot be gamed by moving the other: "if the auto physical claims department wants to measure improvement in the repairable severity of collision claims, a second measure should be set up to measure the frequency of total losses as well".
- Counts beat money ratios: "measuring the number of parts by part type … is a better measure of performance than the percentage of parts dollars".
- High-frequency line items (bumper covers appear on "roughly 73% of repair estimates") are good accuracy proxies.

### A2. OpsDog — "Percentage of Claims with Supplements (Auto)"
URL: https://opsdog.com/products/percentage-of-claims-with-supplements — Fetched: PARTIAL (benchmarks paywalled)
- Definition (verbatim): "The total number of paid insurance claims that require a supplement after initial inspection divided by the total number of claims paid over the same period of time, as a percentage."
- Classified as a **quality** KPI; it "assesses damage assessment accuracy by adjusters".
- Supplements "require an adjuster to make another trip to assess the damage of the car, resulting in redundant work and unnecessary labor costs".

### A3. Veritas Claims — "Supplements in Claims: The Silent Claims Killer"
URL: https://www.veritasclaims.com/blog/supplements-in-claims — Fetched: YES
- "Industry average" supplement rate **35 %**; Veritas claims 14 %.
- Four root causes: incomplete initial appraisals; missing or inaccurate photos; vendor miscommunication; delayed follow-ups.
- Cycle-time example 11.5 → 7.3 days; "What should have been a seven-day appraisal cycle can easily become 14 or 21 days".
- Verbatim: "Each supplement adds administrative work, increases claim cycle time, and exposes carriers to additional expenses."

### A4. Assured — "Claims Cycle Time Benchmarks"
URL: https://www.assured.com/blog/claims-cycle-time-benchmarks — Fetched: YES
- "Claims cycle time tracks every day between First Notice of Loss (FNOL) and final settlement."
- Personal auto typical range **15–30 days**; "Policyholders expect their claims to be resolved in 11 days, but the industry average … is 23.9 days."
- Bottlenecks listed: low-quality FNOL data, routing errors, documentation gaps, fragmented communication.

### A5. VCA Software — "Insurance KPIs (2026 Guide)"
URL: https://vcasoftware.com/insurance-kpis/ — Fetched: YES
- Seven claims KPIs: cycle time, **time to first contact** ("median time and percentage of claims contacted within 24 hours"), **touches per claim**, average cost, leakage, **reopened claims**, **throughput per adjuster**.
- Warnings: cycle time "when it drops too sharply without context … can signal rushed investigations"; "High touch counts suggest unclear workflows or files bouncing between adjusters"; reopened claims "often reveal incomplete investigations or rushed settlements".
- Throughput per adjuster is framed as a tool to "spot early burnout", not a league table.

### A6. VCA Software — "Claims Management Dashboard: KPIs & Best Practices"
URL: https://vcasoftware.com/claims-management-dashboard/ — Fetched: YES
- Effective dashboards track **8–12 core metrics**; volume by status, "cycle times broken into stages", adjuster productivity ("claims closed per week"), reopened/unresolved exposures.
- Best practice: interactive filters, threshold alerts, mobile access for the field, "clean and role-specific" design.
- Pitfalls: dashboard overload, poor data quality, "resistance from staff due to transparency concerns".

### A7. Five Sigma — "Dashboard Delight … for Claims Managers"
URL: https://fivesigmalabs.com/blog/dashboard-delight-the-secret-sauce-to-an-easy-life-for-claims-managers/ — Fetched: YES
- Manager's daily view: open claims, **open/inactive exposures**, **open and overdue MOIs** (methods of inspection = scheduled inspections), **unanswered communications per adjuster**, open notifications, average time to first payment.
- "Having a real-time view of all open claims enables managers to quickly assess the team's workload."

### A8. Engle Martin — "KPIs in Claims – Striking the Balance Between Performance and Pressure"
URL: https://englemartin.com/kpis-in-claims-striking-the-balance/ — Fetched: YES
- "Speed is easy to quantify, quality is not."
- "When success becomes synonymous with 'days to write an estimate' or 'days to close' … the important human element of claims adjusting can get lost."
- "The focus can easily shift from delivering quality claim adjustments to merely meeting a target metric."
- Recommendation: "using metrics as tools to guide improvement, not pressure to cut corners".

### A9. Claims Journal — "Do Claims Departments Rely Too Much on Metrics" (2012)
URL: https://www.claimsjournal.com/news/national/2012/04/12/204827.htm — Fetched: YES
- "Relying too heavily on metrics can lead to over-measuring, measuring the wrong metrics and unintended consequences."
- The two-hour inspection rule: an adjuster's photo showed him "standing outside the already closed tow lot fence, showing the car from a distance".
- One carrier measured adjusters on **52 metrics** at once (time to contact, inspection speed, call duration …).
- "The foundation of claims is timeliness, quality and accuracy"; keep metrics few, accuracy-driven, causally linked to results.

### A10. Direct Claim Solution — "Practice Tips for Better Claim Outcomes"
URL: https://directclaimsolution.com/practice-tips-for-better-claim-outcomes-eliminating-costly-mistakes/ — Fetched: YES
- "Production ratio is the ratio of closed files to incoming files within a given period."
- "Do not manage the production ratio, use it as an indicator. Usually, higher is better."
- "If you begin managing the production ratio, you may create unintended consequences as adjusters make decisions that serve neither the policyholder nor the insurer."
- Backlog symptoms: work becomes "mostly administrative" with "superficial comments"; "a slow moving claims department will soon become a slower moving law firm".

### A11. Kevin Erickson (claims manager), LinkedIn — "A Common Sense Look At Claim Volumes"
URL: https://www.linkedin.com/pulse/common-sense-look-claim-volumes-kevin-erickson — Fetched: YES
- Defines the three counters practitioners live by: **intake** (new/reassigned per period), **pending** (open inventory), **closing ratio** (closures vs intake; 1:1 stable).
- "Working 10 claims per day is a good target … and still be able provide a professional, quality work product."
- "Claim handling quality begins to suffer when individual claim pendings rise above 140 features"; staffing models range "from 75 … to over 260 pending features per adjuster".
- Capacity base: "160 to 176 business hours per month".

### A12. CLM Magazine — "Handling an Unreasonable Claims Caseload"
URL: https://www.theclm.org/Magazine/articles/handling-an-unreasonable-claims-caseload/791 — Fetched: YES
- Unreasonable caseload "can mean a high number of cases, a large mix of cases having different values, cases that require considerable legwork, or a combination".
- Diary discipline: "set a diary in order to continue work on it"; the real enemy is "multiple interruptions during the day".

### A13. Claims Journal — "The Silent Liability: How Burnout is Costing Carriers Millions" (2025)
URL: https://www.claimsjournal.com/news/national/2025/09/04/332713.htm — Fetched: YES
- Outcomes measured by "customer satisfaction scores or cycle times"; fix is "caseload expectations based on complexity, not just volume".
- "Overwhelmed adjusters make more documentation and reserve errors."
- Testimony: "we lose an adjuster every six months … thrown into high-level files with zero training".

### A14. Lorikeet — "Claims Settlement Cycle Time: A Practitioner's Guide"
URL: https://www.lorikeetcx.ai/articles/claims-settlement-cycle-time-practitioners-guide — Fetched: YES
- "Claims Settlement Cycle Time = Settlement Date − FNOL Date."
- Three measurement traps: "Measuring from claim assignment rather than FNOL" (hides intake delay); "Including open claims in cycle time calculations"; "Optimizing for speed at the expense of accuracy".
- "Speed without quality is a false economy. Pair cycle time with loss ratio, reopened claims rate, and customer satisfaction."

### A15. Insightful — "Claims Cycle Time: How to Discover, Measure, and Reduce It"
URL: https://source.insightful.io/blog/claims-cycle-time — Fetched: YES
- Five stages (intake, triage, investigation, approval, payment), "each one can add days for a different reason".
- Invisible waiting: "A file waiting in an adjuster's inbox for review … all of it adds real days, and none of it appears anywhere a dashboard reads from."
- "This is where re-inspections, supplemental estimates, and waiting on third parties tend to add the most time."
- "Two adjusters working identical claim types can produce meaningfully different cycle times, and a single average hides which one."

### A16. APP Tech — "6 Key Performance Indicators in the Claims Process"
URL: https://apptechllc.com/key-performance-indicators-in-the-claims-process/ — Fetched: YES
- FNOL response time (example target 8 h); claim closure ratio = closed ÷ opened ("A lower claim closure ratio means that an organization opens claims at a greater pace than it closes them"); cycle time = Σ days FNOL→close ÷ closed.

### A17. OpsDog — "P&C Claim Settlement Cycle Time"
URL: https://opsdog.com/products/cycle-time-claims-settlement — Fetched: PARTIAL
- Formula: "(Sum of P&C Claims Settlement Cycle Times) / Total Number of P&C Claims Settled"; "Low is Best".

### A18. Mitchell — "Empower Your Customers and Appraisers with Photo-Based Estimating"
URL: https://www.mitchell.com/insights/news-release/auto-physical-damage/empower-your-customers-and-appraisers-photo-based — Fetched: YES
- "On average, a field appraiser will complete four to five estimates in a typical work day, factoring in drive time"; "A desk appraiser, working from photo-based estimates averages 16 estimates in the same amount of time".
- Photo estimating fits drivable, minor, no-injury losses under ~$3,000 predicted severity.

### A19. Snapsheet — "Auto Physical Damage Appraisals"
URL: https://www.snapsheetclaims.com/solutions/insurance-appraisals/ — Fetched: PARTIAL (marketing page)
- Claims "3-5 Day average REDUCTION IN CYCLE TIME" and "+20% improvement in appraisal accuracy"; sells "intelligent assignment" to eliminate rework.

### A20. Autobody News — CCC Crash Course Q4 2025 coverage
URL: https://www.autobodynews.com/news/calibrations-surge-past-35-of-repairs-as-total-losses-head-toward-second-straight-record — Fetched: YES
- Supplement mechanism: "Just 48.5% of calibrations appear on initial estimates, while 51.5% show up on supplements".
- Keys-to-keys: 13 days (no calibration), 15.5 (one), 17+ (multiple).
- Time from "estimate assignment sent and vehicle in" is "almost half" of Q1 2023.

### A21. Global Expertise Industriel — "Expertise automobile après sinistre au Maroc"
URL: https://www.globalexpertiseindustriel.com/actualites/expertise-automobile-sinistre-maroc-procedure — Fetched: YES
- Déclaration "délai de 5 jours" (48 h en cas de vol); contre-expertise "dans un délai de 15 jours".
- "ne commencez jamais les réparations avant l'accord écrit de l'expert".
- No code des assurances article or ACAPS circular cited.

### A22. ACAPS — "Indemnisation automobile matérielle" (leaflet PDF)
URL: https://www.acaps.ma/sites/default/files/indemnisation_automobile_materielle_fr_version_finale.pdf — Fetched: YES (via pdftotext)
- "vous devez déclarer à votre assureur l'accident de circulation au plus tard dans les 5 jours de sa survenance".
- "Une fois informé, l'assureur désignera un expert pour évaluer les dégâts si la garantie vous est acquise. Le montant de l'indemnisation est calculé selon les conclusions de l'expert sur le rapport d'expertise".
- CID: "la Convention d'Indemnisation Directe, qui est une convention signée par toutes les compagnies d'assurance".
- Recours: contre-expertise, médiateur (litige > 5 000 DH), réclamation ACAPS. **No délai for the expert's report is stated.**

### A23. TopAssur — "Sinistre auto au Maroc : procédure complète, délais légaux et recours"
URL: https://topassur.ma/blog/sinistre-auto-procedure-maroc — Fetched: YES
- Déclaration "5 jours ouvrables … (8 jours en cas de vol)"; expertise "8 à 15 jours" après déclaration; offre "3 mois suivant le dépôt du dossier complet"; paiement matériel "30 à 60 jours après l'expertise".
- Cites loi 17-99 art. 20 (déclaration) and art. 34 (offre); médiateur via ACAPS.

### A24. Challenge.ma — "Accident automobile : comment se déroule l'expertise"
URL: https://archive.challenge.ma/accident-automobile-comment-se-deroule-lexpertise-36045/ — Fetched: YES
- "A la réception de l'ordre de mission, il fixe un rdv avec l'assuré pour expertiser le véhicule".
- What insurers judge experts on: "le respect des délais, la réactivité, l'accompagnement et le contrôle des réparations".
- Report types: forfaitaire, classique (expert approves devis, verifies work, requests facture), réforme.

### A25. Cabek.ma — "Expertise contradictoire au Maroc"
URL: https://cabek.ma/blog/show/975a1362a6e9ebedd8550f8e3ee87dc3 — Fetched: YES
- Above 20 000 DH TTC: "L'assureur du responsable a alors 48 heures pour assister à l'expertise contradictoire."
- Tiers expert "dans un délai de 5 jours à compter de la réception de la requête"; FMSAR designates an arbitre if insurers disagree.
- Contre-expertise request "dans les 15 jours suivant la notification des conclusions".

### A26. 212assurances — "Voitures inondées au Maroc : les étapes clés"
URL: https://www.212assurances.com/2025/12/24/voitures-inondees-au-maroc-les-etapes-cles-pour-etre-indemnise/ — Fetched: YES
- Déclaration "dans les 5 jours"; expert appointed "dans les jours qui suivent"; escalation to ACAPS.

### A27. BCA Expertise — homepage
URL: https://www.bca.fr/ — Fetched: YES
- Service commitments (VL): "premier contact avec l'assuré sous 48h après réception de la mission", "premières conclusions techniques sous 24h après l'expertise", "dépôt du rapport sous 48h après réception de la facture".
- "+1M expertises automobiles réalisées chaque année"; 650 experts; hybrid "expertise terrain et à distance".

### A28. BCA Expertise — FAQ
URL: https://www.bca.fr/faq/ — Fetched: YES (no délais; dossiers accessible "jusqu'à 1 an après le dépôt du rapport d'expertise").

### A29. Luko / Allianz Direct — "Combien de temps pour recevoir un rapport d'expertise"
URL: https://fr.luko.eu/conseils/guide/delai-reception-rapport-expertise-assurance/ — Fetched: YES
- Expert visit generally within 15 days; report "30 jours" average after visit; EAD "48 heures"; "80% des expertises sont réalisées et complétées sous 3 semaines"; "Il n'y a pas de délai légal".

### A30. Epur'Expertise — "Expertise automobile : procédure et délais"
URL: https://www.epur-expertise.fr/le-metier-dexpert/expertise-automobile-procedure-et-delais/ — Fetched: YES
- Convention: "l'intervention de l'expert est réalisée sous 2 semaines après le sinistre"; visit→report "environ 4 semaines en moyenne"; Epur: intervention 48 h, pré-rapport "sous 48h en moyenne".
- "Il n'existe aucune loi encadrant les délais d'intervention d'un expert".

### A31. MAIF — "Quel délai entre expertise et indemnisation"
URL: https://www.maif.fr/vehicule-mobilite/guide-assurance-auto/delai-entre-expertise-et-indemnisation — Fetched: YES
- "La loi ne fixe pas de délai"; "Fournir les éléments sollicités par l'expert rapidement est le seul moyen d'accélérer la procédure".

### A32. FFEA (ex-ANEA) — homepage
URL: https://www.ffea.fr/ — Fetched: YES (anea.fr 301-redirects here). "400 cabinets et 3000 professionnels"; déontologie page exists but no délais on the landing page.

### A33. QA Claims — "Auto Damage Appraisals"
URL: https://www.qaclaims.com/auto-damage-appraisals.html — Fetched: YES
- Vendor framing of what appraisal buyers want: "Getting it right the first time!"; "manage supplements and delays because auto damage is not properly diagnosed"; "quick cycle times, accurate estimating".

---

## PART B — Findings

1. **Cycle time is the industry's spine metric, always measured from the insurer's first notice, never from assignment.** (A4, A14, A16, A17) Lorikeet names "measuring from claim assignment rather than FNOL" as the first gaming trap. *Implication:* our total cycle starts at `requête` (the insurer's request), not at `création`; the requête→création gap is itself a KPI (time-to-open).

2. **Cycle time must be split into stages, because each stage delays for a different reason and a single average hides the culprit.** (A6, A15) *Implication:* the dashboard shows a stage ladder: requête→création→photos avant→1er accord→facture validée→rapport validé→rapport déposé→note d'honoraire, each as median and P90.

3. **Waiting time dwarfs touch time and is invisible to naive dashboards.** (A15) "A file waiting in an adjuster's inbox … adds real days". *Implication:* queue-age (time an assignment or mission has sat unopened) is more actionable than duration worked; we have `createdAt` on chiffrage assignments and missions to compute it.

4. **Supplement rate (2ème/3ème accord) is the industry's proxy for estimate accuracy — and it is a quality KPI, not a productivity one.** (A2, A3, A20) Industry average ~35 %; best-in-class 14 %; supplements mostly come from incomplete first inspections and bad photos. *Implication:* "taux de révision d'accord" per chiffreur and per garage, plus "taux de 1er accord sans révision" as its positive twin. Attribute the cause: the Agent's photos vs the Chiffreur's estimate vs the garage.

5. **Reopened / rework rate is the guard-rail metric for any speed target.** (A5, A14) "Pair cycle time with … reopened claims rate". *Implication:* never show a speed KPI without its quality twin next to it (PartsTrader's pairing rule, A1).

6. **Practitioners measure themselves with three counters: intake, pending, closing ratio.** (A10, A11, A16) Closing ratio 1:1 = stable; below 1 = backlog growing. *Implication:* the admin header is "Entrés / En cours / Clôturés" this week, with the ratio; per-user pending count is the workload-balance view.

7. **Pending has a quality ceiling.** (A11) Quality "begins to suffer … above 140 features"; 10 files/day is a sustainable target. *Implication:* show pending per person against a team-set threshold, colour it as capacity, not as a ranking.

8. **Managers look at exceptions first: overdue inspections, inactive exposures, unanswered communications per adjuster.** (A7) *Implication:* the admin landing view is an exception list — missions past RDV without check-in, chiffrages past 24 h ouvrées, rappels unread > N h, dossiers without movement — not a wall of averages.

9. **Stale files are defined by diary discipline: every open file needs a next action date; a file with no activity past its diary is an exception.** (A12, A10) *Implication:* "Dossiers sans mouvement depuis N jours" (from workflow logs) per Gestionnaire, with N configurable (7 days default for an expertise cabinet, given 8–15 day expertise expectations in Morocco, A23).

10. **Time to first contact / first action within 24 h is a universal early-stage KPI.** (A5, A16, A27) BCA commits to first contact in 48 h; VCA tracks "% contacted within 24 hours". *Implication:* Gestionnaire KPI "délai requête → première action" (first workflow-log entry after création) with a % under 24 h ouvrées.

11. **Field productivity has a known baseline: 4–5 inspections per day with drive time; desk estimating 16/day.** (A18) *Implication:* missions/day for an Agent is meaningful only against a realistic band (3–5), and the number is not comparable with the Chiffreur's throughput.

12. **Photo quality is the top cause of supplements and re-trips.** (A3, A2) *Implication:* per-Agent "missions ayant entraîné un 2ème accord" and "missions rappelées pour photos" are the field-quality metrics; photo count per mission is only a floor check.

13. **Over-measurement is a documented failure mode: 52 metrics at once; a 2-hour inspection rule produced a photo through a fence.** (A9, A8) *Implication:* per-role dashboards carry 4–6 KPIs (PartsTrader's 4–5 + rotating, A1; VCA's 8–12 is for the whole organisation, A6). No hard timers that can be satisfied by a worthless action.

14. **Managing a ratio versus monitoring it are different acts; leaderboards on production ratios produce "superficial comments" and administrative work.** (A10, A8, A13) *Implication:* the admin drill-down compares a person to their own history and to the team median, not a ranked list; throughput is shown as capacity/burnout signal (A5).

15. **Two people on identical work produce different cycle times; the answer is process, not ranking.** (A15) *Implication:* per-user drill-down should segment by nature (Classique/Contradictoire/Réforme) and compagnie before comparing.

16. **Morocco: the law fixes délais on the assuré and the insurer, not on the expert.** (A22, A23, A25) 5 days to declare (art. 20), 3 months for the offer (art. 34), 48 h for the adverse insurer to attend a contradictoire above 20 000 DH, 5 days for a tiers expert, 15 days to request a contre-expertise. Practical expectation: expertise 8–15 days after declaration; payment 30–60 days after expertise. *Implication:* the cabinet's report delay is the critical path of the insurer's 3-month legal clock; show "âge du dossier depuis requête" with bands at 15 / 30 / 60 days. Contradictoire dossiers need a 48 h convocation timer.

17. **Moroccan insurers judge a cabinet on: respect des délais, réactivité, accompagnement, contrôle des réparations.** (A24) *Implication:* the insurer-level (compagnie) breakdown should show exactly these: median délai rapport, % within the SLA the cabinet promises, and facture-validation delay (contrôle des réparations).

18. **France: no legal délai either; the market runs on service commitments — 48 h contact, 24 h conclusions, 48 h report after invoice (BCA), 2-week intervention convention, ~4 weeks visit→report on average.** (A27, A29, A30, A31) *Implication:* the cabinet's own SLAs (24 h ouvrées) are already tighter than the French leader's; the dashboard should publish the SLA and the % attained, per compagnie, because that is the sales argument.

19. **Segment before you compare.** (A14, A5) Cycle time varies by complexity; VCA says segment by product/type. *Implication:* every KPI card carries a nature filter; Réforme and Arbitrage are excluded from Classique medians by default.

20. **Volume-of-open-claims averages that include open files are meaningless; use closed-cohort medians and separate aging for open files.** (A14) *Implication:* two distinct widgets: "délais (dossiers clôturés, 30 j glissants)" and "âge des dossiers ouverts" (buckets).

---

## PART C — KPI catalogue for SL Auto

Notation: `d()` = business-hours difference on the 24 h ouvrées model; `m.` = milestone date on the dossier; `ca.` = chiffrage assignment; `mi.` = mission; `r.` = rappel; `log` = workflow log. Lead = leading (predicts a problem), Lag = lagging (records an outcome).

| KPI (FR) | Definition | Formula on our fields | Audience | Lead/Lag | Source |
|---|---|---|---|---|---|
| Délai d'ouverture | Time from insurer request to dossier creation | `d(m.requête, m.création)` | Gestionnaire, Admin | Lag | B1, A14 |
| Délai de première action | Time from création to first workflow-log entry by a human | `d(m.création, min(log.at where actor≠system))`; show % ≤ 24 h ouvrées | Gestionnaire, Admin | Lead | A5, A16, A27 |
| Délai requête → photos avant | Time to first inspection | `d(m.requête, m.photosAvant)` | Gestionnaire, Admin | Lag | B2 |
| Délai planification → check-in | Field SLA compliance | `d(mi.createdAt, mi.checkinAt)`; `% ≤ 24 h ouvrées` | Agent, Admin | Lag | A7, A27 |
| Ponctualité RDV | Check-in within tolerance of the RDV time | `abs(mi.checkinAt − mi.dateRDV) ≤ tolérance` → % | Agent, Admin | Lag | A7 (overdue MOIs) |
| RDV manqués | Missions past dateRDV with no check-in | `count(mi where now > dateRDV + tolérance and checkinAt = null)` | Agent, Admin (exception list) | Lead | A7 |
| Délai check-in → photos | Time from arrival to photo upload | `d(mi.checkinAt, first photo uploadedAt)` | Agent | Lag | A15 (touch vs wait) |
| Missions par jour | Field throughput, against a 3–5 band | `count(mi where checkinAt on day) / agent` | Agent, Admin (capacity only) | Lag | A18 |
| Missions retouchées | Missions followed by a rappel asking for photos, or by a 2ème accord citing photos | `count(mi with rappel type=photos or linked accord2)/count(mi)` | Agent, Admin | Lag | A3, A2 |
| Photos par mission (plancher) | Floor check, not a target | `mi.photoCount < seuil` → flag | Agent | Lead | A3 |
| Âge de la file chiffrage | How long assignments wait before being opened | `d(ca.createdAt, first log by ca.chiffreur)`; oldest first | Chiffreur | Lead | A15, B3 |
| Délai de chiffrage | Assignment SLA | `d(ca.createdAt, ca.completedAt)`; `% ≤ 24 h ouvrées` | Chiffreur, Admin | Lag | A27, A30 |
| Chiffrages par jour | Desk throughput (against own history) | `count(ca.completedAt on day) / chiffreur` | Chiffreur, Admin (capacity) | Lag | A18, A11 |
| Taux de 1er accord sans révision | First-time approval | `1 − count(dossiers with m.accord2plus) / count(dossiers with m.accord1)` | Chiffreur, Admin | Lag | A2, A3, B4 |
| Taux de révision (2ème/3ème accord) | Supplement rate | `count(m.accord2plus)/count(m.accord1)` per chiffreur, per garage, per compagnie | Chiffreur, Admin | Lag | A2, A3, A20 |
| Délai 1er accord → facture validée | Repair control lead time | `d(m.accord1, m.factureValidee)` | Gestionnaire, Admin | Lag | A24 (contrôle des réparations) |
| Délai facture → rapport déposé | The BCA-style "48 h après facture" | `d(m.factureValidee, m.rapportDepose)` | Gestionnaire, Admin | Lag | A27 |
| Délai total requête → rapport déposé | Total cycle (closed cohort, 30 j glissants) | `d(m.requête, m.rapportDepose)` median + P90, closed dossiers only | Admin, per compagnie | Lag | A4, A14, B20 |
| Âge des dossiers ouverts | Aging buckets on open files | `now − m.requête` bucketed 0–7 / 8–15 / 16–30 / 31–60 / >60 j | Gestionnaire, Admin | Lead | A23, B16, B20 |
| Dossiers sans mouvement | Stale files | `count(dossiers open where max(log.at) < now − N j)` | Gestionnaire, Admin | Lead | A12, A10 |
| En attente par motif | Pending count by blocking reason | `count(open dossiers) group by next-missing milestone` (photos / accord / facture / rapport) | Gestionnaire, Admin | Lead | A7, A6 |
| Entrées / En cours / Clôturés + ratio | Intake, pending, closing ratio | `count(m.création in period)`, `count(open)`, `count(m.rapportDepose in period)`; ratio = clôturés/entrées | Admin | Lead | A10, A11, A16 |
| En cours par personne | Workload balance | `count(open dossiers where gestionnaire = u)`; open `ca` per chiffreur; open `mi` per agent | Admin | Lead | A11, A7 |
| Rappels: délai de lecture / résolution | Reminder responsiveness | `d(r.createdAt, r.readAt)`, `d(r.createdAt, r.resolvedAt)`; unread > 24 h list | All (own), Admin | Lead | A7 (unanswered comms) |
| Contradictoire: convocation 48 h | Adverse-insurer convocation timer | for nature=Contradictoire: `d(convocation log, RDV) ≥ 48 h` | Gestionnaire | Lead | A25 |
| Compagnie: SLA % et délai médian | Insurer-level service view | above delays grouped by `compagnie` | Admin | Lag | A24, B17 |

**Per-role default set (4–6 cards each, per A1/A9):**
- *Gestionnaire:* En attente par motif · Dossiers sans mouvement · Âge des dossiers ouverts · Délai de première action · Rappels non lus.
- *Chiffreur:* Âge de la file (oldest first) · % ≤ 24 h ouvrées · Taux de 1er accord sans révision · Chiffrages par jour vs own 4-week median.
- *Agent:* Aujourd'hui (missions with RDV) · RDV manqués · Délai planification → check-in % · Missions retouchées.
- *Admin:* Exceptions (overdue missions, overdue chiffrages, stale dossiers, unread rappels) · Entrées/En cours/Clôturés · En cours par personne · Délai total médian par compagnie · Taux de révision par garage.

**Do not show**
- *Leaderboards or rankings of people* on throughput or speed — documented to produce gaming and superficial work (A8, A9, A10, A13). Compare a person to their own history and the team median.
- *Chiffrages or missions "per hour"* — capacity is 160–176 h/month; sub-day rates reward rushing (A11, A9).
- *A single cycle-time average that includes open dossiers* — meaningless (A14).
- *Cycle time measured from création instead of requête* — hides intake delay (A14).
- *Money-based KPIs (severity, average devis, leakage)* — devis totals are not reliably present on every dossier; PartsTrader also warns money ratios mislead (A1).
- *Drive time / route efficiency* — no GPS trail between missions, only check-in; cannot be computed honestly.
- *Photo quality score* — no rejection flag exists on photos; use the "missions retouchées" proxy instead.
- *Customer satisfaction* — no survey channel to the assuré; do not fake it with a proxy.
- *Hard timers with trivial satisfiers* (e.g. "opened within 2 h") — the fence-photo lesson (A9).
- *More than ~6 cards per role* — 52-metric failure mode (A9); 8–12 is the whole-organisation budget (A6).

---

## PART D — Could not fetch

| URL | Reason |
|---|---|
| https://www.cccis.com/reports/crash-course-2025/q1 | HTTP 403 (covered via Autobody News A20) |
| https://www.repairerdrivennews.com/2022/03/15/ccc-examines-collision-industry-trends-in-depth-in-2022-crash-course/ | HTTP 403 |
| https://www.mckinsey.com/…/the-growth-engine-superior-customer-experience-in-insurance | timeout (60 s) |
| https://www.mckinsey.com/…/claims-2030-dream-or-reality | timeout (60 s) |
| https://www.mpower.mitchell.com/field-inspection-vs-virtual-estimating-trends/ | DNS not found (figures obtained from Mitchell A18 instead) |
| https://www.mitchell.com/insights/auto-physical-damage/article/field-inspection-vs-virtual-estimating-trends | HTTP 404 |
| https://www.fmsar.org.ma/infos-utiles-2/conventions-professionnelles/ | DNS not found (CID confirmed through ACAPS A22 and Cabek A25) |
| https://adala.ai/blog/assurance-automobile-maroc-obligations-legales-indemnisation/ | HTTP 403 (art. 137 "délai raisonnable" mention seen only in search snippet — unverified) |
| https://old.reddit.com/r/adjusters/… and any reddit.com domain | reddit.com is closed to this crawler (API refuses the domain) — no first-hand Reddit threads could be read |
| https://www.prismrisk.gov/…/addendum-a-workers-comp/ | HTTP 403 (30-day diary / 120-day supervisor review figures seen only in search snippet) |
| https://www.anea.fr/ | 301 → ffea.fr (fetched as A32; déontologie sub-page not reached) |

Unverified snippet-only claims deliberately **not** used as findings: the "5,800 estimates audited, 19.2 % discrepancy" figure (source could not be located), and the "24–72 h transmission of the report after insurer validation" figure for Morocco (appeared in a search summary but not in the TopAssur page as fetched).
