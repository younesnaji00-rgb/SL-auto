# Catalogue KPI étendu — tableaux de bord par rôle + vue Direction / acheteur (2026-09-06)

**Researcher:** Claude (ops-research subagent) for the "way more metrics and KPIs" ask.
**Scope:** everything the industry measures on auto physical-damage appraisal that SL Auto can
compute honestly from its own Firestore documents, ranked per role, plus a buyer-facing set for
demos to insurers and expertise firms. Complements (does not replace) `dashboard-industry-kpis.md`
(33 sources, the first catalogue) and `dashboard-synthesis.md` (what was built and why).
**Sourcing policy honoured:** practitioner blogs, vendor documentation, industry bodies, forum
threads (HN via the Algolia API; a French consumer forum; Reddit is closed to this crawler), the
Moroccan code and regulator, French cabinets. Every claim cites a URL that was actually fetched;
the could-not-fetch list is honest. **58 sources fetched (YES or PARTIAL), 14 could not be fetched.**

---

## 0. Ce que le premier catalogue couvrait déjà, et ce qu'il a écarté

Already catalogued in `dashboard-industry-kpis.md` Part C (28 KPIs) and partly built: the six
24 h ouvrées clocks (création, 3 photo phases, 1er accord, 2ème accord+), work-item age, sans
mouvement, en attente par motif, intake/pending/closing ratio, révisions (2ème/3ème accord ÷
assignations), missions/jour, RDV manqués, rappels lecture/résolution, per-compagnie SLA %,
délai total création→rapport (Suivi d'équipe), weekly trend crées/déposés.

Rejected there, with the reason: leaderboards (gaming), per-hour rates, cycle-time averages that
include open files, cycle time from création instead of requête, **money KPIs** ("devis totals
not reliably present"), drive time (no GPS trail), photo-quality score (no rejection flag), CSAT
(no channel), hard timers with trivial satisfiers, > 6 cards per role.

This catalogue keeps every one of those rejections **except money**, which it re-opens with a
precise reliability caveat (§4, §6): the devis editor stores structured rows (`DevisRow.puHT`,
`qte`, `vetuste`, `ref`, `type`, `observation`) and accord columns, so count-based and
line-based economics ARE computable, and the montant-based ones become reliable with two
denormalised fields.

---

## 1. Sources

### 1.1 Fetched (YES / PARTIAL)

Industry & vendor (US/EU):

- S1 Beancount — collision-shop KPI guide (cycle time 8–12 d, touch time < 30 % baseline / > 50 %
  top, comeback 1–4 %, alt-parts 30–50 %) — https://beancount.io/blog/2026/06/01/auto-body-collision-repair-shop-bookkeeping-drp-direct-repair-program-oem-aftermarket-lkq-parts-margins-ccc-mitchell-audatex-supplements-section-179-spray-booth-comeback-warranty-cycle-time-touch-time-severity-kpi-guide — YES
- S2 Pulse RevOps — "Best KPIs for auto body shops" (9 KPIs with formulas; keys-to-keys 11.6 d avg /
  8.0 top quartile; supplement rate formula; touch time 2.1 h/day avg) — https://pulserevops.com/knowledge/ik0423 — YES
- S3 Sedgwick VistaClaim (APD process claims, no numbers) — https://www.sedgwick.com/blog/vistaclaim-a-connected-approach-to-auto-physical-damage/ — YES
- S4 CCC Crash Course 2025 (page served the Q2-2025 edition: total loss 22.6 %, > 70 % of total
  losses are 7+ years old, 13.6 parts / 26.7 labour hours per estimate, backlog 1.7 weeks) — https://www.cccis.com/reports/crash-course-2025/q4 — YES
- S5 Mitchell — BEV vs ICE Q2 2025 (repairable severity by powertrain; OEM parts 83 % vs 63 % of
  parts dollars; parts repaired 12 % vs 14 %) — https://www.mitchell.com/insights/news-release/auto-physical-damage/collision-claims-battery-electric-vehicles-shrink-first — YES
- S6 ValueLink — appraisal-operations KPIs (turn time by stage, acceptance time, inspection
  scheduling lag, on-time delivery, first-pass clear, revision rate, revision cycle time, manual
  touches per order, orders per FTE) — https://www.valuelinksoftware.com/the-lenders-guide-to-appraisal-operations-kpis — YES
- S7 AppraisalHost — appraiser panel KPIs (turn time by segment, revision rate, acceptance rate,
  quality score, complaint rate) — https://www.appraisalhost.com/blog/appraiser-panel-management — YES
- S8 OpsDog — Closed Claims per Adjuster (Auto), definition — https://opsdog.com/products/closed-claims-per-adjuster — PARTIAL (benchmarks paywalled)
- S9 OpsDog — Claims Auto-Adjudication Rate — https://opsdog.com/products/claims-auto-adjudication-rate — PARTIAL
- S10 OpsDog — insurance KPI index (New/Closed Claims per Adjuster, % Claims with Supplements,
  Supplemental Cost as % of Repair Cost, Subrogation…) — https://opsdog.com/categories/kpis-and-metrics/insurance — YES
- S11 Liberate — Claims Cycle Time glossary (drivers: incomplete FNOL, manual documents, adjuster
  workload, third-party delay) — https://www.liberate.ai/glossary/claims-cycle-time — YES
- S12 WarrantyHub — claims processing benchmarks 2026 (automotive/TPA cycle 3–6 d avg, 1–2 d top;
  first-touch resolution 40–55 % avg / 70–85 % top) — https://warrantyhub.com/blog/claims-processing-benchmarks/ — YES
- S13 Perceptive Analytics — claims-analytics KPI list (cycle time by segment, reopened claims,
  severity drift, payment variance, quality audit scores, auto-triage rate, alert aging) — https://www.perceptive-analytics.com/how-to-evaluate-claims-analytics-vendors-for-automation-and-leakage-reduction/ — YES
- S14 Guidewire Compare (indemnity, expenses, cycle times, reserves, salvage, subrogation; peer
  benchmarking with deviation bars) — https://www.guidewire.com/products/analytics/compare — YES
- S15 Digital Insurance on LexisNexis 2024 report (material damage severity +47 % since 2020, total
  loss +29 %, 40 % waited > 1 month for final payment, 46 % dissatisfied) — https://www.dig-in.com/news/high-claims-severity-shows-little-sign-of-slowing-reveals-lexisnexis-report — YES
- S16 LexisNexis 2024 press release (27 % of collision claims total losses in 2023; "time required
  to settle a claim is the highest determinant of customer satisfaction, followed by the number of
  people and touches") — https://risk.lexisnexis.com/about-us/press-room/press-release/20240620-auto-trends-report — YES
- S17 LexisNexis 2026 press release (15 % of vehicles > 20 years, MY2020+ = 30 %) — https://risk.lexisnexis.com/about-us/press-room/press-release/20260519-auto-trends-report-2026 — YES
- S18 Enlyte Envision 2026 (qualitative: complexity, supply chain, "faster, more accurate") — https://www.enlyte.com/insights/news-release/industry-trends/enlytes-2026-envision-trends-report-explores-forces-driving — YES (no numbers)
- S19 Verisk "Auto frequency, severity: woes persist" — https://www.verisk.com/insurance/visualize/auto-frequency-severity-woes-persist/ — PARTIAL (headline only rendered)
- S20 Tractable insurers page (−8 days cycle with FNOL triage; −50 % estimate-writing time; 70 %
  of claims reviewed without human involvement) — https://tractable.ai/insurers/ — YES
- S21 Emerj — AI at Aviva (Tractable generic claims: 97 % of losses identified at 95 % accuracy;
  Aviva total-loss tool −59 % customer cycle time, −52 % rental days) — https://emerj.com/artificial-intelligence-at-aviva/ — YES
- S22 Solera / Audatex Canada — Qapter (pre-estimate < 3 min; "reduces estimate cycle time by more
  than 50 %"; "cuts supplemental estimate costs by more than 25 %") — https://www.audatex.ca/get-accurate-pre-repair-estimates-in-less-than-three-minutes-with-qapter-intelligent-estimating/ — YES
- S23 Solera — United Auto case (qualitative production gain) — https://www.solera.com/blog/2022/11/02/soleras-breakthrough-qapter-solution-leads-to-success-for-united-auto/ — YES
- S24 Solera — Maple Mutual photo-to-estimate (qualitative) — https://www.solera.com/blog/2025/05/28/soleras-ai-powered-photo-to-estimate-solution-is-transforming-claims-processing-for-maple-mutual-insurance/ — YES (no numbers)
- S25 Snapsheet APD product page (3–5 day cycle-time reduction, +20 % appraisal accuracy, −15 %
  operating cost) — https://www.snapsheetclaims.com/products/insurance-appraisals — YES
- S26 VCA Software — AI claims processing (STP definition; ~60 % of insurers report no STP;
  Admiral Seguros 90 % touchless; Lemonade 30–40 %) — https://vcasoftware.com/ai-for-claims-processing/ — YES
- S27 Five Sigma — adjuster workload data (38 % of physical-damage claims needed multiple
  adjusters; handling time ×2.75–2.85 when they do; damage assessment = 17.4 % of handling time US
  / 45.9 % UK) — https://fivesigmalabs.com/blog/exclusive-data-claims-adjusters-day-to-day-workloads/ — YES
- S28 Claims Journal / Cotality — adjuster burnout (metrics named: LAE, file accuracy, cycle time) — https://www.claimsjournal.com/sponsored/cotality/2026/08/14/339527.htm — YES
- S29 SkyeBrowse — adjuster tooling (claims "−7–10 days", "reduces supplement frequency by 40–50 %
  through first-visit documentation completeness", 2–3 site visits baseline) — https://www.skyebrowse.com/news/posts/best-insurance-adjuster-tools — YES (vendor claims)
- S30 IA Path — independent appraiser workflow ("within 48 business hours" to call the owner is
  "industry standard"; "eyes and ears of the insurance company") — https://iapath.com/auto-damage-claim/ — YES
- S31 FixMyRide AI — estimate accuracy (parts within 5–15 %, labour 10–25 %; revision 18–22 % AI vs
  30–45 % manual; 70 % vs 55 % of jobs within 10 % of final) — https://fixmyrideai.com/knowledge/how_accurate_is_ai_for_car_repair_estimates_and_what_affects_its_precision.php — YES (secondary, unaudited)
- S32 AutoBodyShopNear — claim guide citing CCC Crash Course 2026 (63 % of repairs need ≥ 1
  supplement; $1,200–1,800 estimate→final gap; total loss 23.1 % in 2025; calibrations 28.3 %) — https://autobodyshopnear.com/blog/auto-body-shop-insurance-claim-guide — YES (second-hand CCC figures)
- S33 Brentwood Auto Body ("70 % of photo-based estimates require supplements", unsourced) — https://brentwood-autobody.com/auto-body-repair-estimate-accuracy/ — YES
- S34 Conestoga Collision (photo estimates from "3–6 images"; supplements follow) — https://conestogacollision.com/can-you-get-an-accurate-auto-body-estimate-from-photos/ — YES
- S35 Colorado Coach Auto Body (qualitative) — https://ccautobody.net/how-accurate-are-photo-based-auto-body-repair-estimates/ — YES (no numbers)
- S36 Dealership Autoplex Collision (supplement mechanics) — https://www.dealershipautoplexcollisioncenter.group/the-difference-between-insurance-estimates-and-actual-repair-costs — YES
- S37 LinkedIn / DentsHQ — estimate accuracy (qualitative) — https://www.linkedin.com/pulse/impact-accurate-estimating-collision-repair-success-dentshq — YES (no numbers)
- S38 Terra — 5 claims KPIs — https://terra.insure/blog/the-5-kpis-to-improve-claims-processing — PARTIAL (page truncated by the fetcher)

Field service (for the Agent de Terrain):

- S39 VSight — field-service KPIs with formulas (FTF median 75 % / top 86 %; avoidable dispatch
  median 14 % / top 3 %; utilisation 75–85 %) — https://vsight.io/field-service-kpis/ — YES
- S40 ServiceTitan — 19 field metrics (jobs/day "three to five", FTF ~80 %, travel 30–60 min,
  utilisation 60–80 %) — https://www.servicetitan.com/blog/field-service-metrics — YES
- S41 FieldCamp — 51 field metrics (on-time arrival, FTF ≥ 80 %, repeat-visit rate) — https://fieldcamp.ai/blog/field-service-metrics/ — YES
- S42 Fieldwork — field KPIs (SLA compliance formula, 95 % vs 80 %; utilisation < 70 % = too
  much travel/paperwork; FTF best-in-class > 89 %) — https://fieldworkhq.com/2026/03/06/field-service-kpis/ — YES
- S43 ERP Software Blog — 10 field metrics (on-time arrival, MTTR, SLA compliance…) — https://erpsoftwareblog.com/2025/06/10-most-important-field-service-metrics-you-must-know/ — YES

France (EU):

- S44 Test-Assurances — délais (visite 7–10 j après nomination; rédaction 5–10 j ouvrés;
  transmission 2–5 j; mineur 7–10 j, important 2–3 sem., VEI 3–4 sem.; L113-5 3 mois) — https://www.test-assurances.fr/delai-pour-le-rapport-d-expert-en-assurance-auto/ — YES
- S45 L'Équipier Financier ("trois à cinq jours ouvrés pour une expertise automobile classique";
  delay factors) — https://lequipierfinancier.fr/delai-dun-rapport-dexpertise-duree-et-facteurs-cles/ — YES
- S46 Xerfi Canal — délais (expert désigné sous 15 j; 80 % des interventions ~3 semaines; rapport
  30 j moyenne; pré-rapport 48 h; contradictoire convoquée sous 21 j) — https://www.xerficanal-economie.com/combien-de-temps-dure-une-expertise-automobile-delais-et-procedures-dassurance-expliques/ — YES
- S47 ByMyCar (réparation "dans un délai de 30 jours à partir de la date de l'expertise"; IRSA
  seuil 650 € HT; offre 3 mois) — https://www.bymycar.fr/webzine/combien-de-temps-faut-il-pour-recevoir-un-rapport-dexpertise-automobile/ — YES
- S48 Droit-Finances forum thread (assuré waited ~9 months; "il n'y a aucun délai légal concernant
  l'expertise d'un véhicule"; insurer "ne reçoit les rapports que lorsque le véhicule est réparé";
  R326-3 right to a copy) — https://droit-finances.commentcamarche.com/forum/affich-8182355-l-expert-auto-est-sourd-delai-pour-l-obtention-du-rapport — YES
- S49 Alliance Experts (580 000 dossiers; 44 300 expertises/mois; 69 agences; 591 collaborateurs) — https://alliance-experts.com/ — YES
- S50 La Tribune de l'Assurance — Creativ' acquires KPI (750 000 dossiers/an combined; EAD target
  "autour de 50 % à court terme" to "raccourcir le temps de traitement") — https://tribune-assurance.optionfinance.fr/lessentiel/expertise-automobile-creativ-acquiert-kpi.html — YES

Maroc (MA):

- S51 ACAPS — Rapport du secteur des assurances 2024 (PDF via pdftotext: ratio de sinistralité
  automobile 69,3 % vs 65,5 % en 2023; non-vie 68,1 %; ratio combiné 95,6 %) — https://www.acaps.ma/sites/default/files/2026-02/ACAPS_Rapport%20Secteur%20assurance%202024.pdf — YES
- S52 Loi 17-99 code des assurances, consolidated (PDF via pdftotext: art. 20 §5 déclaration "au
  plus tard dans les cinq (5) jours"; art. 52 (incendie) "si dans les trois (3) mois … l'expertise
  n'est pas terminée … intérêts; … six (6) mois … judiciairement"; art. 34 concerns réquisition,
  NOT the offre d'indemnité) — https://www.acaps.ma/sites/default/files/publication_documents/loi_ndeg_17-99_portant_code_des_assurances_dahir_ndeg_1-02-238_du_25_rejeb_1423_3_octobre_2002_telle_quelle_a_ete_modifiee_et_completee.pdf — YES
- S53 ACAPS — circulaire générale (consolidates the regulatory texts; no expert délai) — https://www.acaps.ma/fr/actualites/publication-au-bulletin-officiel-de-la-circulaire-generale-de-lacaps — YES
- S54 Aujourd'hui le Maroc — experts automobiles (arrêté 930-13: agrément 3 ans, formation
  initiale 30 h, continue ≥ 18 h/an, régulateur CNEH) — https://aujourdhui.ma/societe/experts-automobiles-a-former-104294 — YES
- S55 Cabek Expertise homepage ("1M de dossiers clôturés", "92 % de clients satisfaits", EAD
  offered, insurer contact lines) — https://cabek.ma/ — YES
- S56 mesassurances.ma — code des assurances (déclaration 5 j, 24 h vol) — https://www.mesassurances.ma/blog/code-des-assurances-maroc — YES

Forums:

- S57 HN (Algolia API) — comments on being measured: "formulas they use to calculate these metrics
  are 'adjusted' regularly to ensure that the numbers they seek are reflected" (StanislavPetrov,
  https://news.ycombinator.com/item?id=15361463); metrics "make the quality of their work less than
  desirable" (lotsofpulp, https://news.ycombinator.com/item?id=38189701) — https://hn.algolia.com/api/v1/search?query=insurance%20claims%20adjuster%20metrics&tags=comment&hitsPerPage=30 — YES
- S58 HN (Algolia API) — hermitdev: "expecting around a $500-600 repair … When they got in there
  and removed the bumper, found a lot more damage" → $4,000 (https://news.ycombinator.com/item?id=19620536) — https://hn.algolia.com/api/v1/search?query=car%20insurance%20claim%20body%20shop%20estimate&tags=comment&hitsPerPage=30 — YES

Reused from the first catalogue (fetched there, cited here by their A-number): A1 PartsTrader,
A2 OpsDog supplements, A3 Veritas (35 % / 14 %), A5 VCA KPIs, A7 Five Sigma dashboard, A11
Erickson (10 files/day, 140 pending ceiling), A18 Mitchell (4–5 field / 16 desk per day), A20
Autobody News CCC Q4-2025 (51.5 % of calibrations appear on supplements; keys-to-keys 13–17 d),
A22 ACAPS leaflet, A23 TopAssur, A24 Challenge.ma (insurers judge on délais, réactivité,
accompagnement, contrôle des réparations), A25 Cabek contradictoire (48 h / 5 j / 15 j), A27 BCA
(48 h contact, 24 h conclusions, 48 h rapport après facture), A29 Luko, A30 Epur'Expertise.

### 1.2 Could not fetch

| URL | Reason |
|---|---|
| https://www.bodyshopbusiness.com/back-to-basics-track-kpis/ | HTTP 403 |
| https://ir.cccis.com/news-releases/news-release-details/ccc-crash-course-2026-report-finds-higher-severity-and-record | timeout 60 s |
| https://www.cccis.com/news-and-insights/posts/ccc-crash-course-2026-report-finds-higher-severity-and-record-total-loss-frequency | HTTP 403 (2026 figures used only as second-hand via S32, flagged) |
| https://www.cccis.com/reports/crash-course-2025/q3 | HTTP 403 |
| https://www.autobodynews.com/news/ccc-crash-course-report-collision-repair-industry-showing-signs-of-stabilization | HTTP 403 |
| https://www.roole.fr/…/expertise-assurance-auto-comprendre-le-processus-et-ses-enjeux | HTTP 429 |
| https://www.auto-infos.fr/article/ia-et-sinistres-auto-alliance-experts-veut-reinventer-…290454 | HTTP 403 |
| https://www.fmsar.org.ma/infos-utiles-2/conventions-professionnelles/ and /backup/docs/Convention-d-Indemnisation.pdf | DNS not found (CID délais taken from A25 Cabek) |
| http://www.icoral.ma/assets/front/docs/documentation/Convention-Indemnisation-directe.pdf | TLS internal error |
| https://fnacam.ma/bibliotheque/conventions-inter-compagnies,6.html | DNS not found |
| https://www.droit-afrique.com/upload/doc/maroc/Maroc-Code-1999-des-assurances.pdf | HTTP 403 (ACAPS copy used instead, S52) |
| https://www.repairerdrivennews.com/… (Mitchell 2025 trends, Solera virtual service, parts mix) | not attempted after two sibling 403s on the same host |
| reddit.com (r/Insurance, r/adjusters, r/Autobody) | domain refused by the crawler |
| HN Algolia query "auto body shop supplement insurance estimate" | 0 hits |

**Correction to the first catalogue:** A23 (TopAssur) attributes the 3-month offer délai to
"art. 34" of loi 17-99. The consolidated text (S52) shows art. 34 governs *réquisition*; art. 20 §5
does carry the 5-day declaration. Keep the 3-month figure as market practice / other article,
not as art. 34. The only explicit expertise-duration clock in the code is art. 52 (fire): 3 months
→ interest runs, 6 months → either party may go to court.

---

## 2. Le modèle de données (ce sur quoi chaque formule s'appuie)

Field names as read in `src/lib/dossiers-data.ts`, `src/app/(app)/monitoring/funnel.ts`,
`src/app/(app)/monitoring/metrics.ts`, `src/app/(app)/dashboard/metrics.ts`,
`use-dashboard-data.ts`, `src/lib/devis-schema.ts`, `src/lib/reforme-schema.ts`,
`src/lib/send-to-chiffrage.ts`, `src/hooks/use-rappels.ts`, the planification modal and the
check-in components.

- `dossiers/{id}`: `refExpert`, `statut` (16 canonical values incl. `Chiffrage en cours`,
  `Accord`, `Proposition d'accord`, `2ème/3ème accord`, `Réforme`), `nature` (Classique,
  Contradictoire 1er/2ème, Arbitrage, Réforme, Collégiale, Forfait, Appréciation, **EAD**),
  `typeDossier`, `compagnie`, `referenceCompagnie`, `intermediaireNom`, `garageName`,
  `repairerType`, `createdAt`, `createdBy`/`createdByName`, **`dateSinistre`**, `dateRequete`,
  `dateDemandeExpertise{Avant,EnCours,Apres}`, `datePhotos{Avant,EnCours,Apres}`,
  `dateChiffrage`, `firstAccordReachedAt`, `lastStatusChange{status,at,by,byNom}`,
  `lastObservation{type,at,authorRole}`, `dateFactureValide`/`authorFactureValide`,
  `directorValidated{by,at,role}`, `dateRapportDepose`/`authorRapportDepose`,
  `dateNoteHonoraire`/`noteHonoraireAt`, `vehicule{marque,modele,energie,puissance,mec,km}`,
  `partieAdverse{compagnie}`, `experts{designation1er,designation2eme,designationArbitrage}`.
- `dossiers/{id}/planifications/{pid}`: `typeMission`, `agentTerrain`, `agentTerrainUid`,
  `dateRDV`, `zone`, `adresse`, `createdAt`, `active`, **`checkinAt`, `checkinLat`,
  `checkinLng`, `checkinBy`**, `observation`.
- `dossiers/{id}/photos/{p}`: `category`, `uploadedAt`, `uploadedBy`.
- `dossiers/{id}/documents/{d}`: `type` (Devis Garage, Facture Garage, numbered extras, accord
  types), `dateUpload`, `uploadedBy`, `sourceKind`; devis versions carry a `DevisSnapshot`:
  `rows[] {ref: Remplacement|Réparation, type: Originale|Adaptable|Occasion, qte, puHT,
  vetuste, tva, observation: sans_reserve|non_accorde|hors_sinistre|reparation}` and
  `extraColumns[] {kind: counter|accord|proposition-accord, values{rowId: string}}`.
- `dossiers/{id}/reforme` doc: `valeurVenale`, `valeurEpave`, `montantAccord`, `vetuste`,
  `franchise`, `montantHonoraires`, `montantDeplacement`, `totalIndemnisation`.
- `dossiers/{id}/historique/{h}` and `/workflow/{w}`: `action`, `date`, `user` (email),
  `userNom`, `type` (`statut`, `planification`, …), `rappelSessionId`.
- `chiffrages/{id}`: `dossierId`, `assignedChiffreurId/Nom`, `files[]`, `sentByUid/Nom`,
  `status` (`pending`→`done`), `createdAt`, `completedAt`.
- `rappels/{id}`: `recipientUid`, `senderUid`, `dossierId`, `createdAt`, `read`, `seenAt`,
  `resolvedAt`, `sessionId`, `changedPaths[]`.
- `users/{uid}`: `role`, `statut`, `compagnies[]`, `zone`, `currentLocation`,
  `currentSessionSeenAt`.
- Clocks: `buildSlaItems` (24 h ouvrées, Moroccan holidays paused) — creation, chiffrage
  (assignment `createdAt→completedAt`, round 1 = 1er accord, ≥ 2 = 2ème+), terrain
  (`planification.createdAt → datePhotos<type>`). Already computed: `computeHeadline`,
  `computeCycleTimes` (median per SLA stage + création→rapport), `computeWeeklyTrend`,
  `computePerCompagnieMeasures`, `computePerUserMeasures`, `agingItems`, and the dashboard's
  `computeGestionnaireView / ChiffreurView / TerrainView / TeamView`.

Notation below: `d()` = business hours on that model; `cal()` = calendar days; `m.` dossier
milestone; `ca.` chiffrage assignment; `mi.` mission; `ph.` photo; `dv.` latest devis snapshot;
`ac.` latest accord column; `r.` rappel; `hist.` historique entries.

---

## 3. Catalogue

Legend — Lead/Lag: leading (predicts) / lagging (records). Roles: G Gestionnaire, C Chiffreur,
A Agent de Terrain, R Responsable/Admin, D Direction/acheteur. Computable: **now** / **needs
field** / **caveat**. Display: tile / trend / distribution / table. Demo: H / M / L.

### 3.1 Délais et flux (cycle time, stages, waiting)

| KPI | Definition / formula on our fields | Lead/Lag | Roles | Why it matters (cite) | Computable | Display | Demo |
|---|---|---|---|---|---|---|---|
| Délai sinistre → requête | `cal(m.dateSinistre, m.dateRequete)`, median + P90, per compagnie | Lag | R, D | The insurer's own intake lag; cycle time must start at first notice, never at assignment (A14 Lorikeet); art. 20 §5 gives the assuré 5 days (S52) | now (when `dateSinistre` filled) | distribution per compagnie | H — shows the insurer where THEIR days go |
| Délai sinistre → rapport déposé | `cal(m.dateSinistre, m.dateRapportDepose)`, closed cohort | Lag | D | The assuré's experience: "time required to settle a claim is the highest determinant of customer satisfaction" (S16); 40 % waited > 1 month for final payment (S15) | now | trend (monthly median) + tile | H |
| Délai requête → rapport déposé, P50 / P90 | `cal(m.dateRequete, m.dateRapportDepose)`; closed cohort 30/90 j; segment by `nature`, `compagnie` | Lag | R, D | Spine metric of every claims dashboard (A4, S11); single averages hide the culprit (A15) — P90 exposes the tail | now (Suivi d'équipe has création→rapport median only, no P90, no requête start) | tile pair + distribution | H |
| Échelle des étapes (stage ladder) | median + P90 of each: requête→création · création→1ère planification (`min(mi.createdAt)`) · planification→photos avant · photos avant→envoi chiffrage (`min(ca.createdAt)`) · chiffrage→1er accord · 1er accord→facture validée · facture→rapport validé (`directorValidated.at`) · validé→déposé · déposé→note d'honoraire | Lag | G, R, D | "Turn time by stage" (S6); "cycle times broken into stages" (A6); "each one can add days for a different reason" (A15) | now | table (stage × P50/P90/n) | H |
| Délai photos avant → envoi au chiffrage | `d(m.datePhotosAvant, min(ca.createdAt))` — the gestionnaire's own hand-off, currently in NO clock | Lead (open) / Lag (closed) | G, R | Invisible waiting "in an adjuster's inbox" adds real days no dashboard reads (A15); ValueLink's inspection→submission stage (S6) | now | tile + oldest-first list of open ones | M |
| Délai création → 1ère planification (dispatch lag) | `d(m.createdAt, min(mi.createdAt where type=Avant))` | Lead/Lag | G, R | "Inspection scheduling lag" (S6); BCA promises contact 48 h after mission (A27); IA Path "within 48 business hours" to call the owner (S30) | now | tile (% ≤ 24 h ouvrées) | M |
| Préavis de RDV (planification → RDV) | `cal(mi.createdAt, mi.dateRDV)` distribution | Lag | A, R | Same S6 stage; France: visit 7–10 days after nomination (S44), 15 days (A29) — Morocco's practical expectation 8–15 days after déclaration (A23) | now | distribution (0 / 1 / 2–3 / 4–7 / > 7 j) | M |
| Durée des réparations (1er accord → facture validée) | `cal(m.firstAccordReachedAt, m.dateFactureValide)` per `garageName` | Lag | G, R, D | "contrôle des réparations" is one of the four things Moroccan insurers judge a cabinet on (A24); France expects repair "dans un délai de 30 jours à partir de la date de l'expertise" (S47); keys-to-keys 11.6 d avg US (S2) | now | table per garage (median, n) | H |
| Délai facture → rapport déposé | `d(m.dateFactureValide, m.dateRapportDepose)`; % ≤ 48 h | Lag | G, R, D | BCA's published "dépôt du rapport sous 48h après réception de la facture" (A27) — a like-for-like sales comparison | now | tile with 48 h target tick | H |
| Délai dépôt → note d'honoraire (billing lag) | `cal(m.dateRapportDepose, m.dateNoteHonoraire)`; count of deposited dossiers without note > 30 j | Lead | R, D | Unbilled finished work is cash-flow leakage; "orders per operations FTE" and billing are the ops KPIs AMCs run on (S6) | now | tile (count > 30 j) + list | M |
| Touches par dossier | `count(distinct hist.user)` and `count(hist)` per dossier, median per compagnie/nature | Lag | R, D | "number of people and touches" is the #2 satisfaction driver (S16); "touches per claim" (A5); 38 % of physical-damage claims needed multiple adjusters and took 2.75–2.85× longer (S27); "manual touches per order" (S6) | now | distribution + per-compagnie table | H |
| Taux de réassignation chiffrage | `count(dossiers with ≥ 2 distinct ca.assignedChiffreurId) / count(dossiers with ≥ 1 ca)` | Lag | R | "High touch counts suggest … files bouncing between adjusters" (A5) | now | tile | L |
| Taux de replanification | `count(mi where active=false or > 1 mi of same type per dossier) / count(mi)` | Lag | A, R | Avoidable-dispatch median 14 %, top 3 % (S39); repeat-visit rate (S41) | now | tile + per-agent table | M |
| Encours vieillissant (WIP age buckets) per stage | open dossiers grouped by next missing milestone × age since `dateRequete` (0–7/8–15/16–30/31–60/> 60) | Lead | G, R | Aging is the only leading flow metric (synthesis §1.2); Moroccan bands from A23 | now (dashboard has the buckets, not the stage × age matrix) | heat table | M |
| Ratio de clôture (closing ratio) | `count(m.dateRapportDepose in period) / count(m.createdAt in period)` weekly | Lead | R, D | Intake / pending / closing ratio (A10, A11, A16); 1:1 stable | now (Suivi d'équipe has crées and traités; ratio not printed) | trend (13 weeks) | M |

### 3.2 Qualité de l'expertise (accuracy, rework)

| KPI | Definition / formula | Lead/Lag | Roles | Why it matters (cite) | Computable | Display | Demo |
|---|---|---|---|---|---|---|---|
| Taux de 1er accord sans révision (first-pass clear) | `1 − count(dossiers with ≥ 2 queue ca) / count(dossiers with ≥ 1 queue ca)`, 90 j, per chiffreur / garage / compagnie / nature | Lag | C, R, D | "First Pass Clear Rate" (S6); supplement rate is the industry's accuracy proxy — 35 % avg vs 14 % best (A3); 63 % of US repairs carry a supplement per CCC 2026 as reported by S32 | now | tile + table | H |
| Taux de 3ème accord | `count(dossiers with ≥ 3 queue ca) / count(with ≥ 1)` | Lag | C, R | Cardinal cap is 3ème (dossiers-data.ts); repeated supplements are the "silent claims killer" (A3) | now | tile | M |
| Délai de révision (revision cycle time) | `d(ca.createdAt, ca.completedAt)` for rounds ≥ 2, median | Lag | C, R | "Revision Cycle Time" (S6); supplement review adds 2–10 business days in the US (S32) | now (the accord clock exists; not reported separately) | tile | M |
| Origine des révisions | for each round-≥ 2 assignment: was a new photo phase uploaded between rounds (`m.datePhotosEnCours` between `ca[n−1].completedAt` and `ca[n].createdAt`) → "découverte en cours" vs "pas de nouvelles photos" | Lag | R | Supplements come from incomplete first inspections and bad photos (A3); 51.5 % of calibrations only appear on supplements (A20); HN: hidden damage found when "removed the bumper" (S58) | now (heuristic) | stacked bar | M |
| Lignes écartées (non accordé + hors sinistre) | `count(dv.rows where observation ∈ {non_accorde, hors_sinistre}) / count(dv.rows)` per chiffreur / garage | Lag | C, R, D | Counts beat money ratios (A1); this is the cabinet's control function ("verify and be the eyes and ears of the insurance company", S30) | now (latest devis snapshot) | tile + per-garage table | H |
| Réparation vs remplacement | `count(dv.rows where ref='Réparation') / count(dv.rows)`; per marque, per garage | Lag | C, R, D | Mitchell tracks "parts repaired" share (12 % BEV / 14 % ICE, S5); PartsTrader: measure parts by count and type (A1) | now | tile + distribution | H |
| Mix pièces (Originale / Adaptable / Occasion) | among `dv.rows where ref='Remplacement'`, share by `type` | Lag | C, R, D | OEM = 63 % of ICE parts dollars (S5); carriers expect 30–50 % alternative parts where allowed (S1); by count, not dollars (A1) | now | stacked bar per garage/compagnie | H |
| Écart devis garage → accord (lignes) | `count(rows whose accord value < devis value or empty) / count(rows)` | Lag | C, D | Same PartsTrader rule; the negotiated reduction without money | now | tile | M |
| Écart devis garage → accord (montant) | `Σ rowTotalHT(dv.rows) − Σ parse(ac.values)` and its % ; per compagnie, per garage, per chiffreur | Lag | D, R | THE buyer number: what the expertise saved the insurer; "payment variance" (S13); Qapter claims "cuts supplemental estimate costs by more than 25 %" (S22) | **caveat** — `extraColumns.values` are strings; only when a column `kind='accord'` exists; propose denormalising `devisTotalHT` / `accordTotalHT` on the dossier at accord save | tile + per-compagnie table | H |
| Sévérité de la révision (supplement severity) | `accordTotal(round n) − accordTotal(round n−1)` | Lag | R, D | "Supplemental Cost as a Percentage of Repair Cost (Auto)" (S10); $1,200–1,800 gap in the US (S32) | **needs field** — per-round totals are not stored | distribution | M |
| Taux de proposition → accord | `count(statut went Proposition d'accord → Accord without a new ca) / count(propositions)` | Lag | C, R | First-time-right (Six-Sigma FPY, cf. §5); AppraisalHost "revision rate" (S7) | now (from `historique` type=statut) | tile | L |
| Contre-propositions importées | `count(extraColumns kind='counter')` per contradictoire dossier | Lag | C, R | Contradictoire negotiation rounds; FMSAR arbitre when experts disagree (A25) | now | tile (contradictoire only) | L |
| Rapport validé du 1er coup | `count(dossiers where directorValidated.at exists and no rejection) / count(validations)` | Lag | G, R | "Quality audit scores" (S13); "file accuracy rates" (S28) | **needs field** — a validation rejection is not recorded (only the final `directorValidated`) | tile | M |
| Dossiers rouverts (reopen) | dossier with a new `ca` or `mi` after `dateRapportDepose` | Lag | R, D | "Reopened claims" (A5, S13) — guard-rail of any speed target (A14) | now (rare; verify semantics) | tile (count) | M |

### 3.3 Terrain (Agent de Terrain, field quality)

| KPI | Definition / formula | Lead/Lag | Roles | Why it matters (cite) | Computable | Display | Demo |
|---|---|---|---|---|---|---|---|
| Ponctualité RDV (on-time arrival) | `abs(mi.checkinAt − mi.dateRDV) ≤ 30 min` → % ; and "visite le jour du RDV" = `datePhotos<type>` same day as `dateRDV` | Lag | A, R, D | On-time arrival / schedule adherence is a core field KPI (S41, S43); SLA compliance 95 % vs 80 % framing (S42) | now — check-in optional so use the photo-date variant as the primary | tile + per-agent table | H |
| Missions avec pointage GPS | `count(mi.checkinAt) / count(mi done)` | Lead | A, R, D | The proof-of-visit that answers the "photo through a fence" gaming story (A9); "first-visit documentation completeness" cuts supplements 40–50 % (S29, vendor) | now | tile | H |
| Distance pointage ↔ adresse | haversine(`checkinLat/Lng`, geocoded `mi.adresse`) | Lead | R | Same proof-of-visit logic; geofence check-in already computes a distance at confirm time | **needs field** — destination lat/lng is not persisted on the planification (geocode at planification time) | table (> 500 m flagged) | M |
| Temps sur place | `first(ph.uploadedAt) − mi.checkinAt` and `last(ph.uploadedAt) − first(ph.uploadedAt)` per mission | Lag | A, R | Touch time vs waiting (S1, S2); MTTR analogue (S39) | now (when check-in + photos uploaded on site) | distribution | M |
| Photos par mission (floor + distribution) | `count(ph where category matches type and uploadedAt within mission window)` | Lead | A, R | Photo estimates from "3–6 images" are the ones that get supplemented (S34, S33 "70 %", unsourced); incomplete photos = root cause #2 of supplements (A3) | now | distribution + floor flag | M |
| Missions par agent par jour (vs own median) | `count(mi done per day)` | Lag | A, R | "three to five jobs per day" (S40); 4–5 field estimates/day with drive time (A18); never a rank (synthesis §1.6) | now | tile (self-referenced) | L |
| Taux de première visite concluante (first-time fix) | mission followed by no replanification of the same type and no "photos" rappel within 7 j | Lag | A, R, D | FTF median 75 %, top 86 % (S39); ≥ 80 % target (S41, S42) | now (heuristic) | tile | M |
| Délai demande → RDV fixé par zone | `cal(m.dateDemandeExpertise<type>, mi.createdAt)` grouped by `mi.zone` / `users.zone` | Lag | R | Break turn time down by geography (S7) | now | table per zone | L |
| Charge terrain à venir | open missions per agent for J+1..J+5 (from `dateRDV`) vs 3–5/day band | Lead | R | Capacity view (A11, A18); utilisation 60–80 % (S40) | now | bar per agent per day | M |

### 3.4 Segments et portefeuille (what the buyer wants to see)

| KPI | Definition / formula | Lead/Lag | Roles | Why it matters (cite) | Computable | Display | Demo |
|---|---|---|---|---|---|---|---|
| Part EAD (expertise à distance) | `count(m.nature='EAD') / count(dossiers)` per compagnie, monthly | Lag | D, R | The photo-estimate share: Creativ'-KPI targets "autour de 50 %" EAD (S50); Admiral 90 % touchless (S26); desk 16/day vs field 4–5 (A18) | now | trend | H |
| Taux de réforme (total-loss rate) | `count(m.nature='Réforme' or statut='Réforme') / count(dossiers)`; by vehicle age band from `vehicule.mec` and by `marque` | Lag | D, R | 22.6 % (S4) → 23.1 % record (S32) in the US; 27 % of collision claims in 2023 (S16); > 70 % of total losses are 7+ years old (S4); PartsTrader: pair severity with total-loss frequency (A1) | now (mec format to normalise) | tile + distribution by age | H |
| Économie de réforme | `valeurVenale − valeurEpave − totalIndemnisation` and `montantAccord` vs `valeurVenale` (repair-vs-total-loss decision) from the reforme doc | Lag | D | Total-loss economics are what Aviva's tool optimised (−59 % cycle, S21); VRADE logic | now when reforme doc filled; **caveat** on completeness | table | M |
| Part des contradictoires et arbitrages | `count(nature ∈ {Contradictoire 1er/2ème, Arbitrage, Collégiale}) / count` and their P50 délai vs Classique | Lag | D, R | CID: 48 h for the adverse insurer, 5 days for a tiers expert, FMSAR arbitre (A25); segment before comparing (A14) | now | tile + table by nature | M |
| Convocation contradictoire ≥ 48 h | for contradictoire: `cal(hist 'convocation' entry, mi.dateRDV) ≥ 2 j` → % | Lead | G, R | The CID clock (A25) | **caveat** — depends on a convocation entry in `historique` (action text) | tile | L |
| Volume et mix par compagnie | dossiers created per compagnie per month; share; by `typeDossier` / `nature` | Lag | D, R | Every buyer view starts with volume; auto S/P ratio in Morocco worsened to 69.3 % in 2024 (S51) so insurers are cost-sensitive now | now | trend + table | H |
| Volume par intermédiaire | dossiers per `intermediaireNom`, their P50 délai and 1st-pass rate | Lag | D | Broker/agent channel view — the insurer's distribution partners are also the cabinet's prescribers | now (free-text field; normalise) | table | L |
| Délai sinistre → requête par compagnie | see 3.1 | Lag | D | Shows each insurer its own intake lag next to the cabinet's délai | now | table | H |
| SLA tenu par compagnie vs engagement | `% clocks on time` (exists) against a per-compagnie target | Lag | D, R | BCA publishes its engagements (A27); "publish the SLA and the % attained, per compagnie, because that is the sales argument" (A-catalogue finding 18) | **needs field** `compagnies/{id}.slaTarget` (or firm-wide constant) | tile with target tick | H |
| Assurés rappelés / joints | not available | — | — | LexisNexis "people and touches" (S16) | **do not build** — no contact log with the assuré | — | — |

### 3.5 Personnes et charge (Responsable / Admin)

| KPI | Definition / formula | Lead/Lag | Roles | Why it matters (cite) | Computable | Display | Demo |
|---|---|---|---|---|---|---|---|
| Encours par personne vs seuil | open dossiers (G) / open queue `ca` (C) / open `mi` (A) per user vs a firm threshold | Lead | R | Quality suffers above ~140 pending (A11); 10 files/day sustainable (A11); throughput as burnout signal (A5) | now (threshold = constant) | bar list vs band | M |
| Débit par personne, 4-week self trend | done per week per user, with own 4-week median | Lag | R (person view) | "Closed Claims per Adjuster (Auto)" (S8); never a league table (A8–A13; S57 HN: metrics get "adjusted" and lower work quality) | now | small trend per person | L |
| Temps de réaction aux rappels | `d(r.createdAt, r.seenAt)` / `d(r.createdAt, r.resolvedAt)` per recipient; unread > 24 h | Lead | R, G | "unanswered communications per adjuster" (A7) | now | tile + list | M |
| Rappels suivis d'effet | `count(r where changedPaths non-empty or a hist entry carries r.sessionId) / count(r resolved)` | Lag | R | Diary discipline (A12); closes the loop on "rappels" as a management tool | now | tile | L |
| Dossiers ouverts sans propriétaire actif | open dossiers whose `createdBy` user is `statut=Inactif` | Lead | R | Orphan files are the classic backlog leak (A10) | now | list | L |
| Charge par nature | open dossiers per user × nature | Lead | R | "caseload expectations based on complexity, not just volume" (A13) | now | table | L |

---

## 4. Par rôle — les 8–15 KPI au-delà de l'existant, classés

Ranking rule: actionability for that role first, then demo value, then cost to compute. Every
speed KPI is listed with its quality twin (A1 pairing rule). Personal numbers stay
self-referenced; the admin compares to the team median (synthesis §1.6 — unchanged).

### 4.1 Gestionnaire (owner of the dossier's flow)

Already built: En cours · En retard · Rappels non lus · Terminés 7 j · À traiter · En attente
d'un tiers · Sans mouvement · Par étape · Âge des dossiers ouverts.

1. **Délai photos avant → envoi au chiffrage** (own hand-off; oldest open first) — the one
   stage nobody clocks today (A15 invisible waiting).
2. **Délai création → 1ère planification** (% ≤ 24 h ouvrées) — the BCA/IA Path 48 h contact
   norm (A27, S30).
3. **Facture → rapport déposé, % ≤ 48 h** — BCA's exact promise (A27); with its twin
   **rapport validé du 1er coup** once a rejection flag exists.
4. **Dossiers déposés sans note d'honoraire > 30 j** — money left on the table.
5. **Durée des réparations par garage** (1er accord → facture) — "contrôle des réparations"
   (A24, S47 30-day norm).
6. **Taux de 1er accord sans révision sur MES dossiers** — quality of the sources I send
   (photos, devis) rather than of the chiffreur.
7. **Touches par dossier (médiane, mes dossiers)** — bouncing files (A5, S27).
8. **Pièces manquantes** — count of open dossiers with required docs missing (from
   `required-docs.ts`), the FNOL-data-quality bottleneck (A4, S11).
9. **Contradictoires: convocation ≥ 48 h** — CID clock (A25), contradictoire dossiers only.
10. **Préavis de RDV** distribution for my planifications — are we booking days out?
11. **Rappels envoyés: délai de lecture par destinataire** — my requests to others (A7).
12. **Stage ladder for my closed dossiers (30 j)** — read-only, no comparison.

### 4.2 Chiffreur (desk estimator)

Already built: En attente (dont révisions) · Hors délai · Terminés 7 j · Dans les délais 30 j ·
Ma file banded · Révisions 30 j · Par urgence.

1. **Lignes écartées (non accordé + hors sinistre) %** with its twin **taux de révision** —
   the control function measured by count (A1, S30).
2. **Réparation vs remplacement %** — Mitchell's "parts repaired" (S5).
3. **Mix pièces Originale / Adaptable / Occasion** on replacement lines (S5, S1).
4. **Taux de 1er accord sans révision, 90 j, par garage** — where MY supplements come from;
   the industry's 35 % / 14 % framing (A3), never as a rank of chiffreurs.
5. **Délai de révision médian** (rounds ≥ 2) — revision cycle time (S6).
6. **Origine des révisions** (new photos between rounds vs none) — tells the chiffreur whether
   it was hidden damage (A20, S58) or the estimate.
7. **Chiffrages par jour vs my own 4-week median** — desk baseline 16/day (A18), self-only.
8. **Écart devis → accord (lignes %)** — negotiated share by count.
9. **Écart devis → accord (MAD)** — once `devisTotalHT`/`accordTotalHT` are denormalised.
10. **Proposition → accord conversion** — first-time-right of my propositions (S7).
11. **Âge de la file (oldest unopened)** — needs `openedAt` on chiffrages (queue-session.ts
    may already hold a session start; verify) (S6 "acceptance time").
12. **Contre-propositions importées (contradictoires)** — negotiation load (A25).

### 4.3 Agent de Terrain (phone-first; keep it to a few big numbers)

Already built: Prochaine mission · En retard · Aujourd'hui · Photos à envoyer · Cette semaine ·
Demain.

1. **Visites réalisées le jour du RDV, 30 j %** — on-time arrival (S41, S43), self only.
2. **Missions avec pointage GPS %** — proof of visit; a habit metric, not a rank (A9, S29).
3. **Photos par mission (my median, 30 j)** with the floor flag — completeness cuts
   supplements (A3, S29).
4. **Missions replanifiées, 30 j** — my avoidable re-dispatches (S39 median 14 %).
5. **Première visite concluante %** — FTF ≥ 80 % framing (S41, S42), self only.
6. **Temps sur place médian** — only if check-in is used; otherwise hide (S1 touch time).
7. **Missions / jour vs my median** — 3–5 band (S40, A18).
8. **Charge à venir J+1..J+5** — count per day, no chart.

Do not add more than two of these to the phone view at once (synthesis §1.10).

### 4.4 Responsable d'équipe / Admin (three tabs + person view)

Already built: team tiles · Exceptions · Charge par personne · Par personne table with team
median · Contexte de charge.

1. **Stage ladder P50 / P90** (requête → note d'honoraire) — where the days go (S6, A15).
2. **Touches par dossier** and **taux de réassignation** — bouncing files (A5, S27).
3. **Taux de 1er accord sans révision par garage / compagnie / nature** — supplements are a
   process signal, segment before comparing (A14, A15).
4. **Durée des réparations par garage** — contrôle des réparations (A24).
5. **Facture → dépôt % ≤ 48 h** and **dépôt → note d'honoraire > 30 j** — service + cash.
6. **Ratio de clôture hebdo (13 semaines)** — backlog direction (A10, A11).
7. **Encours par personne vs seuil** (140-feature ceiling as a starting constant, A11).
8. **Ponctualité RDV et pointage GPS par agent** vs team median (S41).
9. **Taux de replanification par agent / zone** (S39).
10. **Rappels non résolus > 48 h par destinataire** (A7).
11. **Lignes écartées % par chiffreur vs médiane** — quality alongside speed (A1).
12. **Dossiers rouverts** — guard-rail (A14, S13).
13. **Origine des révisions** stacked bar — process fix, not blame (A15).
14. **Pièces manquantes par gestionnaire** — intake quality (A4).
15. **Dossiers ouverts d'utilisateurs inactifs** — orphan files.

### 4.5 Direction / acheteur (executive and buyer demo view)

Purpose: what an insurer's sinistres director or an expertise firm's owner asks in a demo. Rule:
every number is a cohort with its n and window; every speed number has its quality twin; the
comparison line is a published external norm, not another user.

1. **Délai requête → rapport déposé P50 / P90 par compagnie** — against Morocco's 8–15 day
   practical expectation (A23) and France's ~4 weeks visit→report (A29, A30, S46).
2. **Facture → rapport déposé % ≤ 48 h** — side-by-side with BCA's public engagement (A27).
3. **Taux de 1er accord sans révision** — vs 35 % industry / 14 % best (A3); 63 % supplemented
   in the US per CCC 2026 (S32, second-hand).
4. **Économie réalisée: écart devis garage → accord (MAD, %) par compagnie** — the ROI number;
   Qapter's "> 25 % supplemental cost" claim (S22) is the vendor framing buyers already hear.
5. **Lignes écartées % et réparation vs remplacement %** — the control function by count (A1).
6. **Mix pièces** (Originale / Adaptable / Occasion) — 63 % OEM ICE parts-dollar US benchmark
   (S5) as context; Moroccan norms differ, print without a target.
7. **Taux de réforme par tranche d'âge véhicule** — 22.6–23.1 % US (S4, S32), 27 % of collision
   claims (S16), > 70 % of total losses 7+ years (S4).
8. **Part EAD** — vs Creativ'-KPI's 50 % ambition (S50); frames the cabinet as hybrid (A27 BCA).
9. **Délai sinistre → requête par compagnie** — the insurer's own lag, shown politely.
10. **Délai sinistre → rapport** (assuré's clock) — vs "40 % waited > 1 month" (S15).
11. **Touches par dossier médian** — vs the satisfaction driver (S16).
12. **Missions avec pointage GPS %** and **ponctualité RDV %** — proof of physical inspection
    (A9's fence photo is the story to tell).
13. **Volume et mix par compagnie / nature / intermédiaire** — portfolio view.
14. **Part des contradictoires et arbitrages** with the CID clocks (A25).
15. **Ratio de sinistralité automobile 69,3 % (2024, ACAPS)** printed as market context on the
    buyer page, not computed (S51) — explains why the insurer is listening.

---

## 5. Repères (benchmarks) trouvés, avec drapeau US / EU / MA

| Measure | Value | Source | Flag |
|---|---|---|---|
| Supplement rate, industry vs best-in-class | 35 % vs 14 % | A3 Veritas | US |
| Repairs with ≥ 1 supplement | 63 % ; estimate→final gap $1,200–1,800 | S32 citing CCC Crash Course 2026 (not fetched directly) | US, second-hand |
| Photo-based estimates needing a supplement | "70 %" | S33 (unsourced shop blog) | US, weak |
| "Healthy" shop supplement rate projection | 55–62 % ; > 70 % = poor blueprinting | S2 (vendor blog, 2027 projection) | US, weak |
| Revision rate manual vs AI estimates | 30–45 % vs 18–22 % | S31 (secondary) | US, weak |
| Estimates within 10 % of final cost | 55 % manual / 70 % AI-assisted | S31 citing an "AutoVitals 2025 study" | US, weak |
| Calibrations appearing only on supplements | 51.5 % | A20 Autobody News (CCC Q4-2025) | US |
| Keys-to-keys cycle | 11.6 d avg / 8.0 d top quartile; 13 d no-calibration, 15.5 one, 17+ multiple | S2; A20 | US |
| Assignment→return shop cycle | 8–12 d competitive, < 7 d leading | S1 | US |
| Touch time | < 30 % baseline / > 50 % top (S1); 2.1 h/day avg, 3.5 top (S2) | S1, S2 | US |
| Comeback (rework) rate | 1–4 % of ROs | S1 | US |
| Alternative-parts expectation where OEM optional | 30–50 % | S1 | US |
| OEM share of parts dollars | 83 % BEV / 63 % ICE (Q2 2025) | S5 | US |
| Parts repaired (vs replaced) | 12 % BEV / 14 % ICE | S5 | US |
| Parts per estimate / labour hours | 13.6 parts; 26.7 h (Q1 2025) | S4 | US |
| Total-loss frequency | 22.6 % (Q2 2025, S4) → 23.1 % (2025, S32); 27 % of collision claims 2023 (S16) | S4, S32, S16 | US |
| Total losses aged 7+ years | > 70 % (2024) | S4 | US |
| Repairable appraisals under $2,000 | 41.5 % (2019) → 25.5 % (mid-2025) | search summary of CCC (page not fetched) | US, weak |
| Personal-auto cycle (FNOL→settlement) | 15–30 d typical; 23.9 d avg; 11 d expected | A4 | US |
| Final payment > 1 month | 40 % of respondents; 46 % dissatisfied | S15 | US |
| Multiple adjusters on a physical-damage claim | 38 %; handling time ×2.75–2.85 | S27 | US |
| Damage assessment share of handling time | 17.4 % US / 45.9 % UK | S27 | US/UK |
| Desk vs field estimates per day | 16 vs 4–5 | A18 | US |
| Sustainable files per adjuster-day; pending ceiling | 10/day; quality suffers > 140 | A11 | US |
| Touchless / STP | ~60 % of insurers report none; 30–40 % Lemonade; 90 % Admiral (Tractable) | S26 | US/EU, vendor |
| Field FTF | median 75 %, top 86 % (S39); ~80 % avg, 90 % ideal (S40) | S39, S40 | generic |
| Avoidable dispatch | median 14 %, top 3 % | S39 | generic |
| Jobs per technician-day | 3–5 (some 7) | S40 | generic |
| Travel time per call | 30–60 min | S40 | generic |
| Utilisation | 60–80 % (S40); 75–85 %, pacesetters 90 % (S39); < 70 % = too much travel (S42) | S39, S40, S42 | generic |
| Contact after mission | 48 h (BCA, A27); "within 48 business hours" (S30) | A27, S30 | EU/US |
| Rapport après facture | 48 h (BCA) | A27 | EU |
| Visite après nomination | 7–10 j (S44); ≤ 15 j (A29); ~3 weeks for 80 % (S46) | S44, A29, S46 | EU |
| Rédaction du rapport | 5–10 j ouvrés (S44); 3–5 j ouvrés classique (S45); 30 j moyenne (S46) | S44, S45, S46 | EU |
| Réparation après expertise | ≤ 30 j (S47) | S47 | EU |
| Contradictoire convoquée | ≤ 21 j (S46) | S46 | EU |
| EAD ambition | ~50 % (Creativ'-KPI) | S50 | EU |
| French cabinet volumes | Alliance 44 300/mois; Creativ'-KPI 750 000/an; BCA > 1 M/an | S49, S50, A27 | EU |
| Déclaration du sinistre | 5 j (art. 20 §5, S52); 48 h vol (A21) | S52 | MA |
| Contradictoire CID | 48 h adverse insurer; 5 j tiers expert; 15 j contre-expertise | A25 | MA |
| Practical expertise / payment délais | 8–15 j after déclaration; payment 30–60 j; offre 3 mois | A23 | MA (practice) |
| Expertise duration clock in the code (fire) | 3 months → interest; 6 months → court (art. 52) | S52 | MA |
| Auto loss ratio (S/P) | 69.3 % (2024) vs 65.5 % (2023) | S51 | MA |
| Expert agrément | 3-year agrément; 30 h initial; ≥ 18 h/year continuing (arrêté 930-13) | S54 | MA |
| Cabinet self-reported | "1M de dossiers clôturés", "92 % de clients satisfaits" | S55 | MA (marketing) |

---

## 6. À ne pas construire / caveats — et le champ qui débloquerait

| Item | Why unreliable today | What would fix it |
|---|---|---|
| Montants (économie réalisée, sévérité, supplement severity) | `extraColumns.values` are free strings; accord totals per round are not stored; not every dossier has a structured devis (scanned PDFs only) | Denormalise `devisTotalHT`, `accordTotalHT`, `accordRound` on the dossier (or on the accord document) at accord save; keep count-based KPIs as the default view |
| Note d'honoraire montant / revenue | Only `dateNoteHonoraire` exists | `noteHonoraireMontantHT` on the dossier (or a `honoraires` doc) |
| Gestionnaire ownership | `createdBy` only; reassignment invisible (synthesis §6.4) | `gestionnaireUid` maintained on reassignment |
| Queue age / acceptance time (chiffrage) | No `openedAt`; `createdAt→completedAt` only | `openedAt` (first open by the assigned chiffreur); check `queue-session.ts` |
| Rapport validé du 1er coup | Rejections are not recorded | `validationRejections[]` or a `rapportRejectedAt` |
| Ponctualité via check-in | Check-in is optional; agents who skip it bias the number upward or downward | Make the photo-date variant primary; report "missions avec pointage" alongside |
| Distance pointage ↔ adresse | Destination coordinates not persisted | Store `destLat/destLng` at planification (the geocoder exists) |
| Photo phases at dossier level | `datePhotos<type>` is one field per type — a second mission of the same type overwrites it, and the SLA reads the last one | Mirror `datePhotos` on the planification (`mi.photosAt`) |
| Vehicle age | `vehicule.mec` format varies (string/date) | Normalise on save; derive `vehicule.age` |
| Garage / intermediary names | Free text (`garageName`, `intermediaireNom`) → duplicates split the rate | Options collections + normalised key |
| Nature = Réforme vs statut = Réforme | Both exist; treat as OR and print n | Decide one canonical flag |
| Convocation contradictoire | Depends on a text action in `historique` | A typed `convocationAt` on the dossier |
| Touches par dossier | `hist.user` is an email; system/guest entries must be excluded (`SYSTEM_LABELS` in monitoring) | Filter `user ∉ {system, admin-guest}`; count distinct real users |
| STP / touchless / auto-triage | The cabinet does not auto-adjudicate; do not fake an STP rate with EAD share | Report EAD share only |
| CSAT / assuré contact | No survey, no call log (first catalogue "do not show") | A one-question SMS after dépôt would create it; out of scope |
| Drive time / route efficiency | `users.currentLocation` is a live point, not a trail | Out of scope (background location work is separate) |
| Photo quality | No rejection flag; use "missions replanifiées" and "origine des révisions" proxies | A `photosRejectedAt` on the mission |
| Second-hand benchmarks | S32's CCC-2026 numbers, S33's "70 %", S31's AI accuracy, S2's 2027 projection could not be traced to a primary page | Print them as "reported" with the source, or leave off the buyer page |
| Art. 34 attribution | A23's "art. 34 = offre 3 mois" is not what the consolidated text says (S52) | Cite the 3-month offer as practice/other article until the exact article is located |
| Legal délai for the expert's report | None in Morocco (A22, A25) or France (A31, S48) beyond art. 52's fire clause | Keep the cabinet's own 24 h ouvrées and BCA's 48 h as the yardsticks |
| Per-role card count | Adding all of §4 to the dashboards would recreate the 52-metric failure (A9) | Put §3.1/§3.2/§3.4 on Suivi d'équipe tabs and a new "Direction" page; the role dashboards take at most 2 additions each |

---

## 7. Placement suggéré (so the catalogue does not bloat the dashboards)

- **Role dashboards** (unchanged rule: 4 tiles + 2–3 blocks): add at most two items per role
  from §4 — G: "photos → chiffrage" open list, "facture → dépôt ≤ 48 h"; C: "lignes écartées %"
  next to "Révisions"; A: "visites le jour du RDV %" as the third detail tile.
- **Suivi d'équipe**: new tabs "Étapes" (stage ladder P50/P90), "Qualité" (1st-pass by garage /
  compagnie / nature, lignes écartées, réparation vs remplacement, mix pièces, origine des
  révisions), "Terrain" (ponctualité, pointage, replanification, photos/mission).
- **Direction / acheteur**: a separate read-only page (`/direction`) for roles ≥ Responsable,
  the §4.5 list, each tile with n · window · external norm line; exportable (the Excel export
  helper exists in `src/lib/export-excel.ts`).
