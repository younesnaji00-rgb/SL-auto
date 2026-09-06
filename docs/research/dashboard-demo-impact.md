# Dashboards that sell: what buyers evaluate, how great demos show them, what a "Direction / Pilotage" view must contain (2026-09-06)

**Researcher:** Claude (research subagent), for the dashboard-rework branch.
**Owner ask:** make the dashboards IMPRESS prospective buyers (Moroccan insurers and
cabinets d'expertise for SL Auto; Canadian/US appraisal firms for Lionheart Appraisal)
during sales demos, while staying honest and useful.
**Existing framing honoured:** the four dashboard research rounds and the synthesis
(`dashboard-synthesis.md`, `dashboard-industry-kpis.md`, `dashboard-theory.md`,
`dashboard-role-based.md`, `dashboard-elements.md`) — role dashboards are "now" views with
no charts, no leaderboards, no money KPIs, no CSAT; Suivi d'équipe owns period analysis.
The pitch memory rules also apply: no fake clients, modeled (not claimed) ROI. No pitch
playbook file exists under `docs/` in this checkout (Glob `docs/**/*pitch*`,
`docs/**/*demo*` → none); the framing above comes from the synthesis and the memory notes.
**Sourcing policy honoured:** practitioner blogs, vendor pages, analyst coverage, books via
their authors' own sites, forums where reachable; design systems only as corroboration.
Every claim below cites a URL that was actually fetched (or a PDF fetched and converted
with `pdftotext`). Reddit and Hacker News were not reachable (see Part F); the
sales-engineering practitioner voice comes from 2Win!, Great Demo! (Cohan's own blog and
an interview), Caliber, Guideflow, Dock, Dialpad, Modjo, Consensus and a practitioner
Substack instead.
**Sources fetched:** 78 (Part A). **Could not fetch:** 22 URLs (Part F).

---

## PART A — Sources

### A. Demo craft (sales engineering)

**S1. Reprise — "Peter Cohan on How to Get the End Result in a Software Demo"**
https://www.reprise.com/resources/blog/peter-cohan-on-how-to-get-the-end-result-in-a-software-demo — Fetched: YES
- "As customers, we take a look at the end result right up front. And we make a very rapid decision" about fit.
- "Traditional demos often take 20 minutes, 40 minutes, an hour to get to the point." Lead with the end result, "THEN we drill down into further and further levels of detail."
- Three ways to show the end state without the clicks: screenshots ("appear static and damage credibility"), multiple browser tabs (prospects notice tab-switching), captured-and-linked screens. Avoid "obvious workarounds that undermine confidence in your product."

**S2. Great Demo! blog (Cohan) — December 2023 posts**
https://greatdemo.blogspot.com/2023/12/ — Fetched: YES
- Haiku on audience seniority: "Higher job titles? / Only need the big picture / Deliverables!"; lower-level attendees expect workflow detail.
- "Vision Generation Demo, _then_ qualify" for browsing prospects.
- "Proven success is when you / Do the Last Thing First!"

**S3. Cohan — "The Great Demo! 2020 Articles Index" (LinkedIn)**
https://www.linkedin.com/pulse/great-demo-2020-articles-index-peter-cohan — Fetched: YES (index of titles)
- "Attention Retention in Demonstrations" is summarised as "Why 'Do the Last Thing First' is so important – and the importance of summaries."
- "Stunningly Awful Demos: Waaay Out of Alignment" — the failure of addressing several organisational layers with one demo.

**S4. 2Win! Global — "Master Tell-Show-Tell: The Proven 3-Part Framework"**
https://www.2winglobal.com/blog/tell-show-tell-product-demo-framework — Fetched: YES
- Opening Tell (30–90 s): title the topic in the customer's words, tie it to a stated pain, preview what to watch for. "The Opening Tell answers the audience's silent question 'Why should I care about this?' before they have to ask it."
- Show (1–4 min): "Stick to the steps you outlined in the Opening Tell"; adding context mid-show is the "Show-Tell-Tell crime".
- Closing Tell (30–60 s): the Key Operational Impact in three words or fewer — "Hours saved weekly", "Zero manual errors", "No rework required".
- Stack impacts upward: "Each 'so you can' hands the impact up one level until it lands somewhere an executive actually cares about."
- Mistakes: opening with the Show, vague closes, overloaded steps, generic situations, jargon.

**S5. 2Win! Global — "Timelessness of Tell Show Tell"**
https://www.2winglobal.com/blog/timelessness-of-tell-show-tell — Fetched: YES
- "Diving into a software demo without providing context can make your audience feel displaced and generate negative associations." Stakeholders' main worry: the solution "seem[s] complicated".

**S6. 2Win! Global — "Transforming a Good Demo into a Great Demo"**
https://www.2winglobal.com/blog/transforming-a-good-demo-into-a-great-demo — Fetched: YES
- "Prospects want to know where this demo is going and where they are at any particular point in time" — give and revisit a roadmap.
- "Focusing your prospect's attention where you want transforms a demo that transmits information to a winning demo that compels someone to buy."
- Virtual: slide text "50% larger than an in-person slide"; webcam off while demonstrating.

**S7. Guideflow — "Best 12 sales engineering demo practices"**
https://www.guideflow.com/blog/sales-engineering-demo-best-practices — Fetched: YES
- "Do the Last Thing First": open on the successful outcome ("a clean dashboard with accurate forecasts") in "the crucial first 90 seconds". "When buyers see the outcome before the explanation, they stay engaged because they want to understand how to get there."
- Quantify: "You mentioned your team spends 10 hours weekly on manual entry. This eliminates that, freeing 40 hours monthly." "Features without context are forgettable. Features that solve stated problems are compelling."
- Controlled demo instances that "feel authentic without exposing sensitive information"; backups (screenshots/recordings) for slow loads and crashes; "If your SE delivers a generic feature tour instead of a tailored technical validation, the prospect walks away unconvinced."

**S8. Dock — "SaaS Sales Demos: Focus on the buyer, not the product"**
https://www.dock.us/library/saas-sales-demos — Fetched: YES
- "Lead with the biggest value. Don't save your best stuff until the end."
- "Seeing is believing. Demoing an empty-state product makes it difficult for the prospect to imagine themselves using your software." Segment sandboxes by customer type; demo on a stable build.
- "Presentations and scripts make for bad demos. If you're talking, you're not listening."

**S9. Dialpad — "7 Sales Demo Best Practices, from a Top Sales Engineer"**
https://www.dialpad.com/blog/sales-demo-best-practices/ — Fetched: YES
- "Configure your instance for a seamless demo experience and always, always test the demo environment and equipment beforehand."
- Show "how its application changed something meaningful for the customer" rather than describing features.

**S10. Modjo — "7 keys to creating the wow effect in a demo"**
https://www.modjo.ai/en/blog/7-keys-to-creating-the-wow-effect-in-a-demo — Fetched: YES
- "Instead of starting with the features, start with the results your customers get from using your software."
- "A good demo lasts no more than 5 minutes" (10–15 max); "Prospects tend to put more energy into avoiding losses than into gaining benefits."
- Social proof from similar companies, not famous ones; broad social proof "reduce[s] their close-rate by 22%"; avoid ROI language — paint before/after instead.

**S11. Caliber (ex-pclub.io) — "Sales Demo Training (Best Practices + Example Scripts)"**
https://www.caliber.io/blog/sales-demo-training — Fetched: YES
- "Is there a mind-blowing moment within the first five minutes of your demo? If not, you're likely burying the lede." Upside-down pyramid: biggest pain first.
- F.A.V.O.R.I.T.E. per feature (60–90 s): frame the pain, ask, visualise the outcome, "Let me orient you to what you're looking at, and then I'll show you how it works", reveal with "you" language, restate value, brief Before | After story, elicit a response.
- "Solve exactly": the buyer should think "This addresses all our pain points, no more, no less." Over-sharing features "manufactures objections".
- "People are more motivated to spend money to address their pains rather than to achieve gains."

**S12. Supademo — "The Ultimate Software Demo Presentation Guide"**
https://supademo.com/blog/software-demo-presentation — Fetched: YES
- "Deliver your WOW moment early, ideally within the first 5 minutes, while attention is highest."
- Role-specific value (CFO → ROI forecast; marketing manager → live campaign analytics); "the presenter becomes a guide rather than a lecturer"; avoid feature overload and rigid scripts.

**S13. HubSpot — "How to Deliver the Perfect Product Demo"**
https://blog.hubspot.com/sales/product-demo — Fetched: YES
- Send the agenda beforehand; 30-minute sample structure; connect each feature to "value propositions" tied to stated priorities and measurable results.

**S14. Zach Woodward (practitioner Substack) — "Consistently deliver the best product demos"**
https://zachwoodward.substack.com/p/consistently-deliver-the-best-product — Fetched: YES
- "Emphasize value over features"; know "key stakeholders, decision-makers, and their criteria" and customise per organisational level.

**S15. Consensus (Chris White, Demo Doctor) — "4 Must-Haves to Deliver a Successful Product Demonstration"**
https://goconsensus.com/blog/4-must-haves-to-deliver-a-successful-product-demonstration — Fetched: YES
- Arrive at consensus on expectations first; deliver "climactic moments" by "beginning with the punchline"; "a confused mind always says 'no'."

**S16. Demostack — "Sales demo environment: your complete guide"**
https://www.demostack.com/post/sales-demo-environment-your-complete-guide — Fetched: YES
- "The difference between a highly personalized and realistic environment and one filled with fake, outdated data is astounding."
- No "Elon Musk" / "Acme Co." placeholders; numbers must "fit the company size so as to not come off as a solution meant for a company too large or too small."

**S17. Demostack — "10 Best Interactive Demo Software Solutions"**
https://www.demostack.com/post/interactive-demo-software — Fetched: YES
- Inconsistent touchpoints undermine credibility: "They may click through a polished tour on your website, only to see something different when the AE runs a live demo, and then receive a static PDF afterward."
- "Buyers immediately recognize their unique pain points and workflows in the demo, turning walkthroughs into meaningful problem-solving conversations."

**S18. Joe Auty (dev.to) — "How to give awesome demos using updatable datasets"**
https://dev.to/joeauty/how-to-give-awesome-demos-using-updatable-datasets-3lah — Fetched: YES
- "Scheduled or on-demand dataset generation automatically hard reset before each demo to ensure that each new demo does not show data from the last one." Reset the "digital twin" database to a master template per session.

**S19. Walnut — "How to Benchmark Your Sales Demos"**
https://www.walnut.io/blog/product-demos/how-to-benchmark-sales-demos-guide/ — Fetched: YES
- "The highest-converting demos weren't the longest or the flashiest. They were the ones that told a story tailored to each buyer's specific pain point."
- "If median time is high but completion is low, you have a confusion or fatigue problem." Show early value before asking for anything.

### B. What buyers evaluate (analyst coverage, review mining)

**S20. Digital Commerce 360 — "Gartner: Two-thirds of B2B buyers prefer rep-free purchasing" (Gartner survey, n=646, Aug–Sep 2025)**
https://www.digitalcommerce360.com/2026/03/17/gartner-b2b-buyers-rep-free-purchasing-ai-reshapes-sales/ — Fetched: YES
- "67% of B2B buyers favor a rep-free experience"; 45% used AI tools during a recent purchase.
- "Value clarity" — a buyer's understanding of how a product improves outcomes in their role and context: "Buyers who reach that level of confidence are twice as likely to report a high-quality purchase."

**S21. Sword and the Script — "Analysts say B2B prospects form preferences earlier…" (Forrester n=11,352 and Gartner n=632, 2024)**
https://www.swordandthescript.com/2025/08/b2b-preferences/ — Fetched: YES
- Forrester: "92% of buyers start with at least one vendor in mind, and 41% already have a single preferred vendor selected before formal evaluation begins"; C-suite early loyalty 47% vs 34% for ICs; buying is "a process of confirmation, not selection".
- Gartner: "69% of B2B buyers report inconsistencies between information on the sales organization's website and that provided by sellers."

**S22. Capterra — GPS Insight Field Service Management reviews**
https://www.capterra.com/p/212692/GPS-Insight-Field-Service-Management/reviews/ — Fetched: YES
- Praise: "The customer reporting and web services are great" (photo evidence used to settle disputes); "Custom reports…are very easy to generate."
- Complaints: "The reporting, although robust and easy to customize, still lacks a few cohesive elements"; "Web interface does not have a 'log' for tracking who made changes"; "reports can't be created from data entered into a custom form"; asks for reporting to be "a bit more user friendly".

**S23. Capterra — Claims Processing Software category**
https://www.capterra.com/claims-processing-software/ — Fetched: YES
- Reporting is rated as a feature (e.g. A1 Tracker "real-time data dashboards", 5.0; NextGen reporting 2.5/5); "Most products lack detailed reviewer commentary specifically about dashboard design or analytics usability" — reviewers talk about tracking and payments more than about dashboards.

**S24. SoftwareAdvice / GetApp — Snapsheet Claims profiles**
https://www.softwareadvice.com/insurance/snapsheet-claims-profile/ and https://www.getapp.com/healthcare-pharmaceuticals-software/a/snapsheet-claims/ — Fetched: YES (zero reviews on both)
- Listed features only: "Activity Tracking", "Real-Time Updates", "Status Tracking". No reviewer commentary exists — enterprise claims tools are thinly reviewed on public sites.

**S25. SourceForge — ClaimLogik (Claim Central)**
https://sourceforge.net/software/product/ClaimLogik/ — Fetched: YES (no reviews)
- Vendor description: "complete transparency on claim status for all stakeholders", SLA management with suppliers, "KPI measurement and performance tracking for suppliers", "automated exception management when tasks fall outside agreed SLAs".

### C. How insurtech / claims vendors present analytics

**S26. Snapsheet — Claims Analytics & Oversight**
https://www.snapsheetclaims.com/products/analytics-oversight — Fetched: YES
- Headline metrics: "cycle time, task SLA adherence, and average time per task evolve over time"; time to first contact; workload distribution across teams.
- Dashboards: real-time metrics, workload, customer communications, payment history; "Configure custom reports based on all of your data", scheduled or on demand, "dashboard format or as raw data".

**S27. Five Sigma — Management Dashboards and Reports**
https://fivesigmalabs.com/claims-management-platform/management-dashboards/ — Fetched: YES
- "The dashboard displays claim's status, Adjuster's assignment, Communication status, Suggested payouts and other crucial details." Custom dashboards; "A Single Source of Truth for All Your Claims Data … powerful enough for an analyst but accessible enough for all."

**S28. Five Sigma — press: native embedded reporting (Metabase)**
https://fivesigmalabs.com/press/five-sigma-upgrades-its-claims-analytics-with-native-embedded-reporting/ — Fetched: YES
- "dashboards, data exploration, and report generation are built into the core product"; real-time operational and financial data; Excel/CSV templates populated with live data; scheduled delivery; "historical, as-of-date reporting"; role-based access; removes the Tableau/Power BI export-and-version-drift problem.

**S29. Five Sigma — "Dashboard Delight: the secret sauce … for claims managers"**
https://fivesigmalabs.com/blog/dashboard-delight-the-secret-sauce-to-an-easy-life-for-claims-managers/ — Fetched: YES
- Supervisor dashboard: open claims ("quickly assess the team's workload and prioritize cases"), open/inactive exposures, open and pending inspections ("ensures inspections remain on schedule"), unanswered communications ("recognizing an adjuster's workload").
- Financial-trends dashboard: reserves, paid over time, expected vs received recovery, average exposure cost, average time to first payment.

**S30. Guidewire — Compare**
https://www.guidewire.com/products/analytics/compare — Fetched: YES
- "Monitor key claims metrics and KPIs such as indemnity, expenses, cycle times, reserves, salvage, subrogation, and more."
- Benchmarking is the selling point: "visualizations that provide P&C industry context", "track performance against peers and industry benchmarks", Data Cooperative "26M+ claims"; results in "a tabular side-by-side comparison with deviation bars"; scenario tests "to validate hunches, dispel myths".

**S31. Guidewire — Explore**
https://www.guidewire.com/products/analytics/explore — Fetched: YES
- Claims Workflow: "Monitor open claims activities, cycle time metrics, and adjuster performance." Claims Inventory: "Track claims inventory, adjuster workloads, and loss financials." Self-service, "decision intelligence embedded in workflows".

**S32. Duck Creek — Clarity**
https://www.duckcreek.com/product/clarity-insurance-data-analytics-software/ — Fetched: YES
- "Enable executives to identify trends and make informed decisions with pre-built dashboards and self-service analytics"; claims visibility into "cycle times, losses paid, and operational performance metrics"; positioned as "a trusted foundation for analytics and AI".

**S33. Solera — Analytics (vehicle claims)**
https://www.claims.solera.com/products/analytics/ — Fetched: YES
- "claim cost behavior and replaced part composition"; "study trends, set benchmarking"; "Detailed dashboards" to "visualize operations"; "opportunities for reducing overall cycle time and improve customer satisfaction"; "role-specific intelligence"; CO2 per claims touchpoint.

**S34. Solera — Qapter homepage**
https://www.qapter.com/ — Fetched: YES
- Outcome language first: "Accelerate claim resolution and reduce handling costs at every touch point", "touch-less experience". Scale proof-points: "270 million+" claims, "4.5 billion+ images", "190+ OEM methods", "sub-second image processing". No quantified cycle-time or touchless percentages on the page.

**S35. Tractable — Solutions for insurers**
https://tractable.ai/insurers/ — Fetched: YES
- Four numbers on the page: "8 days reduction in cycle times with FNOL Triage", "50% reduction in estimate writing time", "70% of claims reviewed without human involvement", "50% reduction in time to create a contention report".

**S36. Tractable — Admiral Seguros case study**
https://tractable.ai/case-studies/admiral-seguros/ — Fetched: YES
- "90% of estimates processed without appraiser input", "98% of qualifying claims completed in under 15 minutes", 70–75% customer completion of the web app, 3x ROI, "96% accuracy compared to human appraisers", plus one human quote (an 84-year-old policyholder).

**S37. Sedgwick — Claims management system (JURIS / viaOne)**
https://www.sedgwick.com/en-gb/solutions/claims-management-system/ — Fetched: YES
- Clients "can access real-time information from JURIS using Sedgwick's viaOne suite of tools", "create and run standard and ad hoc reports, set their own system alerts" — transparency to the client as the pitch.

**S38. Mitchell (Enlyte) — Auto Physical Damage insights hub**
https://www.mitchell.com/insights/auto-physical-damage — Fetched: YES
- Q2 2026 severity: US BEV $5,684 vs ICE $4,955; Canada BEV CAD 6,645 vs ICE CAD 5,411; "the gap … narrowed to a record low". Severity is what Mitchell headlines.

**S39. Enlyte — "Auto Physical Damage: Navigating Complexity in Collision Claims" (Ryan Mandell, 1 June 2026)**
https://www.enlyte.com/print/pdf/node/38941 — Fetched: YES (PDF → text)
- "putting even more pressure on organizations to improve outcomes by controlling severity and reducing cycle time … accuracy and efficiency are equally as important".
- "the percentage of estimates with a calibration line grew by 31.4% year-over-year in 2025 with an average cost per estimate of $688 when present."
- "keys-to-keys cycle times for drivable repairs under $5,000 in total severity were completed eight tenths of a day quicker when the estimate included at least one 'repair' line."
- AI results are framed as "dramatic improvements in start-to-commit cycle time and estimator consistency, as well as a reduction in multi supplementation."

**S40. Autobody News — CCC Crash Course "2025 Trends to Watch" (Q4 2024 report)**
https://www.autobodynews.com/news/ccc-crash-course-report-2025-trends-to-watch-in-auto-claims-collision-repair — Fetched: YES
- "Nearly 83% of scans were included in the initial estimate, and over 60% of calibrations appeared on supplements"; "growing vehicle complexity is also likely to further increase the number of supplements, and delays in their approval could significantly slow cycle times."

**S41. Autobody News — CCC Crash Course Q2 2025 ("signs of stabilization")**
https://www.autobodynews.com/news/ccc-crash-course-report-collision-repair-industry-showing-signs-of-stabilization — Fetched: YES
- Assignment-to-vehicle-in time "almost half of the days required in Q1 2023"; "22.6% of all claims were declared total losses"; calibrations on ">31% of DRP estimates", scans on "nearly 87%"; TCOR "more than $4,730, a 3.7% increase"; shop backlog "1.7 weeks, falling from a peak of nearly six weeks in 2023".

**S42. FenderBender — CCC Crash Course Q4 2025**
https://www.fenderbender.com/news/latest-news/news/55339095/ccc-intelligent-solutions-ccc-crash-course-q4-2025-calibrations-supply-chains-and-cost-dynamics — Fetched: YES
- TCOR YTD "$4,768 … +1.4% year-over year … the lowest increase since 2017"; "almost 46% of repairable vehicles are seven years or older".

**S43. Alacrity Solutions — Specialty & Auto Solutions (independent appraisal firm, US/Canada)**
https://www.alacritysolutions.com/solutions/claims-management-solutions/specialty-auto-solutions/ — Fetched: YES
- Sells on turnaround: "the industry's fastest auto appraisal turnaround time. With appraisals as soon as today", "first guaranteed Same-Day service"; an interactive map of "cycle time by region, state, city, and office"; coverage "nearly 600 appraisers".

**S44. BCA Expertise — homepage (French expertise leader)**
https://www.bca.fr/ — Fetched: YES
- Published commitments: "premier contact avec l'assuré sous 48h après réception de la mission", "premières conclusions techniques sous 24h après l'expertise", "dépôt du rapport sous 48h après réception de la facture"; "plus de 1 million expertises automobiles réalisées chaque année"; 650 experts.

**S45. ValueLink — "The Lender's Guide to Appraisal Operations KPIs"**
https://www.valuelinksoftware.com/the-lenders-guide-to-appraisal-operations-kpis — Fetched: YES
- Turn time by stage (order → acceptance → inspection → report → QC); revision rate; first-pass clear rate; revision cycle time; acceptance time. Target "on-time delivery rate above 85-90%"; other benchmarks "should be tracked consistently within your operation".

**S46. Regure — Insurance Business Intelligence**
https://www.getregure.com/platform/business-intelligence/ — Fetched: YES
- "Drill-down from metric to individual claim, underwriter, or document in one click"; "assign follow-up, escalate to supervisor, or generate an evidence package — without leaving the dashboard"; "export-ready for FCA, ICO, NAIC, SAMA, and Lloyd's reviews"; "Board MI packs generated and distributed automatically each quarter"; "live operational data — typically sub-second latency".

**S47. Kinro — "AI Audit Trails in Insurance: Compliance & Quality Guide"**
https://kinro.com/blog/ai-audit-trails-insurance-compliance-quality-guide — Fetched: YES
- A trail entry = unique ID, timestamp, model/version, inputs, outputs, decision factors; "logs are easy to search and access"; "Set clear data retention policies"; immutable records that "resist tampering".

### D. What a claims / executive dashboard contains (vendor + practitioner guides)

**S48. VCA Software — "Claims Management Dashboard: KPIs & Best Practices"**
https://vcasoftware.com/claims-management-dashboard/ — Fetched: YES
- Volume & status, cycle times "broken down by stage", reserves vs paid, adjuster "claims closed per week", fraud patterns. Executive = "High-level KPIs and trend analysis"; managers = operational; adjusters = workload.
- "Make It Interactive" (filter by date, type, region, team), "Set Smart Alerts", mobile access, colour "sparse and consistent"; prototype with critical metrics first; dashboards must "drive action, not just display data."

**S49. InetSoft — Loss Run Dashboards and KPIs**
https://www.inetsoft.com/info/loss-run-dashboard/ — Fetched: YES
- 15 KPIs incl. incurred losses, frequency, severity, loss ratio, average time to close, reserve adequacy, leakage, closure rate, top causes, recovery rate, CSAT, claims aging; visuals: big numbers for counts, bars for losses, lines for frequency, gauges for loss ratio, tables for claim detail.

**S50. Decerto — "Claims Lifecycle Management: A 2026 Operating Model Playbook"**
https://www.decerto.com/us/post/claims-lifecycle-management-best-practices-for-insurers — Fetched: YES
- VP Claims "control tower": volume by lifecycle layer, "SLA breaches in 24/48/72-hour windows", reserve variance, vendor status, CAT mode. "The VP Claims who can drill from 'auto cycle time spiked this week' down to the three adjusters causing it inside three minutes is operating on a different curve."
- Team level: workload & SLA tracker, first-touch routing accuracy (>92%), reopen rates, cycle time by complexity. Benchmarks (mature deployments): personal auto PD median cycle 4–7 days. "vanity metrics like total claims handled per quarter do not" move combined ratio.

**S51. Cloud Creations — "KPI Guide for Insurance Adjusters"**
https://www.cloudcreations.com/resource/kpi-guide-for-insurance-adjusters/ — Fetched: YES
- Foundational reports: open-to-close cycle time ("14-day average; 16-day corporate target"), initial-contact SLA ("96% compliance … 4.2 hrs avg response"), field route productivity ("5.2 inspections/day"), post-claim CSAT ("4.6 out of 5"); caseload saturation trigger at 90%.

**S52. SimpleKPI — Insurance Claims KPI Dashboard example**
https://www.simplekpi.com/KPI-Dashboard-Examples/Insurance-Claims-KPI-Dashboard-Example — Fetched: YES
- Five KPIs with targets: resolution time (< 15 days), CSAT (> 85%), cost per claim (down YoY), claims processed per day, fraud detection rate.

**S53. LeapfrogBI — "Top 8 Insurance Dashboards"**
https://www.leapfrogbi.com/blog/insurance-dashboards/ — Fetched: YES
- Claims dashboard: "Claim volumes by type, status, region, or amount", "claims ratio, time to settlement, payout per claim", denial rates; surfaces "suspicious, high-value, or repeat claims".

**S54. Klipfolio — Insurance dashboard examples**
https://www.klipfolio.com/dashboards/business/insurance-dashboard — Fetched: YES
- Claims metrics: "claims frequency, net earned premium, expense and loss ratios", settlement time, severity, denial rate; audiences "Insurance executives, underwriters, claims managers, actuaries"; cadence "Daily, weekly, monthly, quarterly" by dashboard type.

**S55. Bold BI — Insurance Performance Dashboard**
https://www.boldbi.com/dashboard-examples/insurance/insurance-performance-dashboard/ — Fetched: YES
- Leadership/regional dashboard with "interactive drilldowns"; premium- and channel-centric (no claims cycle time) — a reminder that generic BI "insurance" templates are sales-oriented.

**S56. Assured — "Claims Cycle Time Benchmarks"**
https://www.assured.com/blog/claims-cycle-time-benchmarks — Fetched: YES
- Policyholders expect 11 days; industry average 23.9; digital-first carriers 15; "Personal auto claims average 15-30 days"; segment cycle time into FNOL intake, verification, investigation, documentation, communication, closure — "small improvements at any stage compound".

**S57. Veritas Claims — "Supplements in Claims: The Silent Claims Killer"**
https://www.veritasclaims.com/blog/supplements-in-claims — Fetched: YES
- "Industry-wide, supplement ratios average around 35%"; Veritas 14%; cycle-time example 11.5 → 7.3 days; "Each supplement adds administrative work, increases claim cycle time, and exposes carriers to additional expenses."

### E. Leadership-dashboard theory

**S58. Holistics — "Lean Analytics Part 1" (Croll & Yoskovitz)**
https://www.holistics.io/blog/lean-analytics-part-1-an-introduction-to-analytical-thinking/ — Fetched: YES
- A good metric is comparative, understandable, "a ratio or rate", behaviour-changing: "Vanity metrics make you feel good. Actionable metrics change your behaviour." "Leading metrics predict the future, lagging metrics explain the past." OMTM: one metric "from the riskiest portion of your business" for the current stage.

**S59. Mixpanel — "KPI trees 101"**
https://mixpanel.com/blog/kpi-trees/ — Fetched: YES
- North Star → contributing metrics with "provable mathematical relationships" → behavioural inputs (hypotheses). Assign ownership, connect live data, review quarterly. Leadership use: "Instead of reacting to vague 'NRR is down,' you can focus efforts on exact customer journey stages."

**S60. PuMP Academy — About PuMP (Stacey Barr)**
https://pump.academy/pump/ — Fetched: YES
- Eight steps; a report must answer "what is performance doing, why, and how do we respond?"; read "what your data is genuinely telling you, without reacting to noise"; reports should "start driving the conversations that matter".

**S61. Stacey Barr (LinkedIn) — "Five Steps For a Fast Performance Dashboard"**
https://www.linkedin.com/pulse/five-steps-fast-performance-dashboard-stacey-barr — Fetched: YES
- "Focus only on 2 to 3 performance results or goals"; a few measures each; "Define exactly how those priority measures are calculated, and from what data"; one core data source; no "dials and gauges" or pies — line/XmR charts that track "changes over time", arranged "in segments that correspond to my priority performance results".

**S62. Bernard Marr — "The 10 biggest mistakes companies make with KPIs"**
https://bernardmarr.com/the-10-biggest-mistakes-companies-make-with-kpis/ — Fetched: YES
- Measuring "everything that walks and moves"; "All the KPIs are lumped together in one long KPI report or indecipherable dashboard"; hard-wiring KPIs to incentives; not involving executives in selection; "If you aren't using your KPIs to inform your decisions and drive performance, then you are wasting your time."

**S63. Balanced Scorecard Institute — "The Four Perspectives"**
https://balancedscorecard.org/bsc-basics/articles-videos/the-four-perspectives-of-the-balanced-scorecard/ — Fetched: YES
- Financial; Customer/Stakeholder; Internal Process ("efficiency, quality, and reliability of core processes"); Organizational Capacity (people, culture, technology). "The success of few strategies can be measured from only one point of view."

**S64. Ege, Ilhan & Gizer — "Determination of Performance Measures used in Balanced Scorecard for Insurance Companies in Turkey" (IJBMER 3(1), 2012)**
https://www.ijbmer.com/docs/volumes/vol3issue1/ijbmer2012030108.pdf — Fetched: YES (PDF → text)
- Survey-ranked measures per perspective for insurers: Financial — loss ratio, expense ratio, technical profit/premium; Customer — customer satisfaction ranked first, then complaints; Internal process — "Consistency of Claim to Compensation", "Frequency of Claim to Compensation", loss ratio; Learning & growth — employee satisfaction, training investment, employee productivity.

**S65. Stephen Few — "Rich Data, Poor Data: Designing Dashboards to Inform" (Perceptual Edge whitepaper)**
https://www.perceptualedge.com/articles/Whitepapers/Rich_Data_Poor_Data.pdf — Fetched: YES (PDF → text)
- Three-step monitoring: "1. Begin by presenting a consolidated overview that can be quickly scanned … 2. Provide enough information when particular items demand attention … 3. Provide the means to quickly access additional information about those items."
- Comparisons table: plan/budget, forecast, standard, norm, the past, same-category peers, competitors, consecutive past intervals (trend). "It is best to choose the one best comparison (excluding trend information, which should always be included when it's useful) for each measure … two comparisons at most."
- Placement: always-important items in the upper-left; "Consider the dashboard sacred" — drill-down must not alter it; hover pop-ups for precise values; "Once people dive into the details, they are no longer monitoring … they have left the realm of the dashboard."

**S66. Geckoboard — "What is a dashboard?"**
https://www.geckoboard.com/blog/what-is-a-dashboard-does-my-business-need-a-dashboard/ — Fetched: YES
- Few's definition; monitoring dashboards "alert teams to immediate changes requiring action" vs performance/KPI dashboards tracking goals; "no scrolling between pages or filters", primary KPI top-left.

**S67. Klipfolio — Executive dashboard examples**
https://www.klipfolio.com/resources/dashboard-examples/executive — Fetched: YES
- "Understand what each leader needs to know weekly, monthly, and quarterly"; "The goal isn't to display everything — it's to show the right things. A cluttered dashboard creates noise; a focused one creates confidence."; month-over-month deltas on every metric; re-confirm goals periodically.

**S68. 5of10 — "Executive Dashboard Examples: 12 Layouts That Leadership Actually Reads"**
https://5of10.com/articles/executive-dashboard-examples/ — Fetched: YES
- One north-star "at least twice the size of anything else", then "4-6 supporting KPIs", then one trend chart. "An executive should grasp overall status in 5 seconds. Are we winning or losing?" "If the CEO cannot recite the dashboard's metrics from memory, there are too many of them." Metric inflation "from seven metrics to 25 within six months" kills dashboards; "most executive dashboards die within a quarter".

**S69. Board Intelligence — "The definitive guide to KPI dashboards"**
https://www.boardintelligence.com/blog/the-definitive-guide-to-kpi-dashboards — Fetched: YES
- Single page; "only the highest-level metrics"; mix predictive and externally reported metrics; "A dashboard is ideally accompanied by a separate narrative (no longer than three pages)"; "54% of directors struggle to find the key messages" in board packs.

**S70. DashDB — "7 Executive Dashboard Examples for Leaders in 2026"**
https://www.dashdb.io/blog/executive-dashboard-examples — Fetched: YES
- "3 to 5 KPIs that are simple to explain" (or 5–10 strategic); each with "current value, trend over time, and a short comparison to the prior period"; "the top view should be simple, but executives still need a way to investigate anomalies quickly"; success = removing "the lag between a leadership question and a trusted answer".

### F. Trust and credibility signals

**S71. Basedash — "Data freshness explained for BI"**
https://www.basedash.com/blog/data-freshness-how-current-your-dashboard-data-really-is — Fetched: YES
- "Show a visible 'data as of' timestamp on every dashboard. This is the single highest-leverage habit for freshness trust." Timestamp = data age, not page-load time. Don't label batch dashboards "live"/"real-time". "The first time someone catches the gap they stop trusting the whole dashboard."

**S72. Metaplane — "What is data freshness?"**
https://www.metaplane.dev/blog/data-freshness-definition-examples — Fetched: YES
- "Data is considered fresh if it describes the real world right now"; freshness tiers by use (seconds for fraud, minutes for CX, daily for finance); define freshness SLAs with stakeholders.

**S73. Microsoft Learn — Power BI "How to be sure that content is up to date"**
https://learn.microsoft.com/en-us/power-bi/consumer/end-user-fresh — Fetched: YES
- "Knowing that you're working with the freshest content gives you confidence and is often critical in making the right decisions." Owner + timestamp columns everywhere; last-refresh on tiles; data alerts on thresholds; subscriptions.

**S74. Zebra BI — "How to show last refresh date in Power BI"**
https://zebrabi.com/how-to-show-last-refresh-date-in-power-bi/ — Fetched: YES
- "Users may never know if the data they are viewing is from months ago and is merely outdated." Place it "in a prominent location". Caveat: a MAX(date) measure "reflects the latest date in your data and not the actual moment the refresh occurred" — the two stamps mean different things.

### G. Moroccan regulatory context

**S75. ACAPS — "Publication de la circulaire générale de l'ACAPS"**
https://www.acaps.ma/fr/actualites/publication-au-bulletin-officiel-de-la-circulaire-generale-de-lacaps — Fetched: YES
- The circulaire générale regroups "l'ensemble des textes réglementaires relatifs au secteur des assurances et qui relève du pouvoir réglementaire de l'Autorité", applying loi n° 17-99.

**S76. ACAPS — Circulaire n° 01/AS/19 du 02 janvier 2019 (consolidated, PDF)**
https://www.acaps.ma/sites/default/files/2024-11/circulaire_de_lautorite_ndeg_01_as_19_du_02_janvier_2019_prise_pour_lapplication_de_certaines_dispositions_du_code_des_assurances_0.pdf — Fetched: YES (PDF → text, 4,308 lines)
- Insurers must file annual, half-yearly, quarterly and monthly états (art. 100): "Etat D10 : primes acquises, sinistres payés et provisions pour sinistres à payer", "Etat D12 : assurance responsabilité civile … véhicule terrestre à moteur : Primes acquises, sinistres payés et provisions pour sinistres à payer", "Etat D23 : états trimestriels", "Etat D23 bis : états mensuels".
- Filing is electronic: "communiqués via une plateforme électronique sécurisée permettant de garantir l'intégrité de ces états".
- Sous-section VII: "La tenue d'un manuel relatif au règlement des dossiers sinistres" — covering "ouverture des dossiers sinistres … la grille des coûts moyens d'ouverture … mise à jour des informations afférentes aux dossiers sinistres" and "clôture des dossiers sinistres y compris ceux classés sans suite"; changes to closure rules must be disclosed in the solvency report.
- Reserving explicitly uses "cadences de règlement des sinistres" (settlement cadences) and the solvency report must cover "évolution des cadences de règlements des sinistres". Liquidators file "Etat L02 : situation des dossiers sinistres".
- The expert-appraisal timing rules found in the circulaire concern asset valuation experts (art. 61–62: conclusions within a set délai, tiers expert within 30 days), not vehicle experts — no vehicle-expertise SLA is set here.

**S77. TopAssur — "Sinistre auto au Maroc : procédure complète, délais légaux et recours"**
https://topassur.ma/blog/sinistre-auto-procedure-maroc — Fetched: YES
- Article 20: declaration "5 jours ouvrables" (8 for theft); the expert is appointed by the insurer, inspection "sous 8 à 15 jours"; Article 34: offer "dans les 3 mois" of a complete file; payment "dans les 30 à 60 jours" after expertise; the expert's report is "l'élément décisif pour l'indemnisation"; insurer has "30 jours pour répondre" to a written complaint.

**S78. Global Expertise Industriel — "Expertise automobile après sinistre au Maroc"**
https://www.globalexpertiseindustriel.com/actualites/expertise-automobile-sinistre-maroc-procedure — Fetched: YES
- "La loi marocaine vous accorde un délai de 5 jours pour déclarer le sinistre"; contre-expertise "dans un délai de 15 jours"; expert identifies the vehicle, records damage, "chiffrage des réparations", "valeur vénale"; "Ne commencez jamais les réparations avant l'accord écrit de l'expert."

---

## PART B — Findings per question

### Q1. What B2B buyers actually evaluate in a dashboard/analytics demo

1. **They arrive with a preference and use the demo to confirm it.** Forrester: 92% start with a vendor in mind, 41% have already picked one; C-suite even more so (S21). Gartner's "value clarity" — the buyer understanding "how a product improves outcomes within their specific role and business context" — doubles the odds of a purchase the buyer later calls high-quality (S20). A dashboard demo therefore has one job: make the outcome legible in the buyer's own vocabulary within seconds, not prove feature breadth.
2. **Consistency across touchpoints is itself an evaluation criterion.** 69% of buyers report inconsistencies between the vendor's website and what sellers say (S21); Demostack names the same failure — polished web tour, different live demo, static PDF afterwards (S17). Marketing-site screenshots, the live demo tenant and the PDF export must show the same dashboard with the same numbers.
3. **Reviewers rarely praise dashboards; they punish gaps.** Public review sites for enterprise claims software are thin (Snapsheet: zero reviews on two sites, S24; ClaimLogik none, S25) and reviewers "talk about tracking and payments more than about dashboards" (S23). Where they do comment (field-service, S22) the praise is for reports that settle disputes with evidence ("photo evidence … for resolving customer disputes") and easy custom reports; the complaints are missing change logs ("does not have a 'log' for tracking who made changes"), reports that cannot reach custom data, and reporting that is not "user friendly". Evidence, coverage and simplicity — not chart variety.
4. **Analyst framing of claims analytics is "reporting + dashboards + predictive" as a management tool.** Gartner's glossary and Celent's vendor reports could not be fetched (Part F); the vendor pages that could be (S30–S32) all sell the same three things: monitor cycle time / inventory / adjuster workload, benchmark against peers, self-serve without IT. Buyers who have seen Guidewire or Duck Creek decks expect those words.
5. **Buyers are loss-averse, so exception counts and leakage-shaped numbers land harder than gains** (S10, S11). Decerto's line — drill "from 'auto cycle time spiked this week' down to the three adjusters causing it inside three minutes" (S50) — is the concrete image an operations director carries out of a demo.

### Q2. How great demos present dashboards (sales-engineering practice)

1. **Do the Last Thing First: the dashboard is the Illustration.** Cohan: customers "take a look at the end result right up front. And we make a very rapid decision"; then "drill down into further and further levels of detail" (S1). Executives "Only need the big picture / Deliverables!" (S2). Guideflow puts the outcome in "the crucial first 90 seconds" (S7); Supademo and Caliber say the wow moment belongs in the first five minutes (S12, S11); Dock: "Don't save your best stuff until the end" (S8).
2. **Tell–Show–Tell around every screen.** Opening Tell in the buyer's words ("Why should I care?"), a Show that sticks to the announced steps, a Closing Tell with a three-word operational impact ("Zero rework", "Hours saved weekly"), stacked upward "until it lands somewhere an executive actually cares about" (S4). Without the opening context the audience "feel[s] displaced" (S5). Caliber's per-feature script is the same shape and adds "Let me orient you to what you're looking at, and then I'll show you how it works" (S11).
3. **Executive view first, then peel back to the role views.** Cohan's audience rule (S2) plus 2Win's roadmap ("Prospects want to know where this demo is going", S6) argue for: Direction view → one drill-down to evidence → the role dashboards as "how this number is produced". Never start in settings or administration; never show setup (S1).
4. **Quantify against what the buyer said, not against generic ROI.** "You mentioned your team spends 10 hours weekly…" (S7); paint before/after rather than ROI slides (S10, S11); "Features without context are forgettable" (S7). This is compatible with the owner's modeled-ROI rule: the model is shown after the product, framed as the buyer's own assumptions.
5. **Seeded, realistic, current data — never empty, never placeholder.** "Demoing an empty-state product makes it difficult for the prospect to imagine themselves using your software" (S8); "fake, outdated data" is "astounding[ly]" worse than a realistic tenant (S16); numbers must fit the prospect's size (S16); reset the tenant to a master template before each demo (S18). The no-fake-clients rule from the pitch memory means the tenant uses plausible, clearly fictional names and Moroccan/Canadian formats — never a real insurer's name unless it is the prospect's own, and never real assurés.
6. **What backfires:** obvious workarounds and static screenshots passed off as product (S1); tab-switching (S1); generic feature tours (S7); "Show-Tell-Tell" mid-demo context dumps (S4); over-sharing features that "manufacture objections" (S11); rigid scripts and monologue (S8, S12); slow loads and crashes without a backup (S7, S9); a "confused mind always says 'no'" (S15).

### Q3. How insurtech and claims vendors present analytics

1. **Cycle time is the universal headline**, in every vendor's words: Snapsheet ("cycle time, task SLA adherence, and average time per task", S26), Guidewire Compare ("indemnity, expenses, cycle times, reserves, salvage, subrogation", S30), Guidewire Explore ("cycle time metrics, and adjuster performance", S31), Duck Creek ("cycle times, losses paid", S32), Solera ("reducing overall cycle time and improve customer satisfaction", S33), Tractable ("8 days reduction in cycle times", S35), Enlyte ("controlling severity and reducing cycle time", S39), Alacrity's map of "cycle time by region, state, city, and office" (S43), BCA's 48 h / 24 h / 48 h commitments (S44).
2. **Its twin is quality / rework**: supplements (CCC: over 60% of calibrations appear on supplements and supplement approval delays "could significantly slow cycle times", S40; industry average 35% vs 14% best, S57; Enlyte's AI claim is "a reduction in multi supplementation", S39), revision rate and first-pass clear rate in appraisal ops (S45), reopen rates (S50), "Consistency of Claim to Compensation" in the insurer scorecard study (S64).
3. **Benchmarking is the differentiator vendors sell hardest**: Guidewire's "26M+ claims" cooperative and "side-by-side comparison with deviation bars" (S30); Solera's "set benchmarking" (S33); Verisk's XactAnalysis positions the same (page body could not be fetched, Part F). CCC and Mitchell publish quarterly industry figures precisely so carriers can compare (S38–S42).
4. **An "executive claims dashboard" in the sources contains**: loss ratio / combined ratio and losses paid (S49, S53, S54, S32); severity (S38, S49); cycle time or time to settlement (all); leakage and reserve adequacy (S49, S50); supplement / reopen rate (S40, S50, S57); customer satisfaction (S49, S52, S54); backlog / inventory / aging (S31, S41, S49); adjuster productivity and workload (S29, S31, S48, S50, S51); SLA breaches in 24/48/72 h windows (S50). Vendor manager views are exception-first: open and overdue inspections, unanswered communications, inactive exposures (S29); "automated exception management when tasks fall outside agreed SLAs" (S25).
5. **AI vendors lead with three or four big numbers and one human quote**: Tractable's four percentages (S35) and the Admiral page's "90% … 98% under 15 minutes … 96% accuracy" plus an 84-year-old policyholder's call (S36); Qapter leads with scale ("270 million+ claims", "sub-second", S34). Numbers are outcome-shaped (days, %, minutes), never feature-shaped.
6. **Transparency to the client is a product in itself** (TPAs and platforms): Sedgwick sells "real-time information", ad hoc reports and self-set alerts to its clients (S37); ClaimLogik sells "complete transparency on claim status for all stakeholders" (S25); Five Sigma sells "as-of-date reporting", scheduled Excel/CSV, bordereaux (S28). For SL Auto the analogue is the per-compagnie view: the insurer is the customer.

### Q4. What a director wants to see monthly (leadership-dashboard theory)

1. **One metric that matters, chosen for the current stage, plus a small supporting set.** Lean Analytics: a good metric is comparative, understandable, a ratio, behaviour-changing; "Vanity metrics make you feel good. Actionable metrics change your behaviour." (S58). 5of10: one north-star "at least twice the size of anything else", "4-6 supporting KPIs", one trend chart; "If the CEO cannot recite the dashboard's metrics from memory, there are too many" (S68). DashDB: "3 to 5 KPIs that are simple to explain", each with value, trend and prior-period comparison (S70). Barr: "Focus only on 2 to 3 performance results" (S61). Board Intelligence: one page, highest-level metrics only, plus a short narrative (S69).
2. **A KPI tree links the director's number to the operators' numbers with maths, not narrative.** North star → contributing metrics with "provable mathematical relationships" → behavioural inputs, each with an owner (S59). For an expertise firm: total délai requête → rapport déposé decomposes into ouverture + terrain + chiffrage + révision + facture → rapport, each already defined in `dashboard-industry-kpis.md` Part C; the role dashboards own the leaves.
3. **Balance four views** (Kaplan & Norton: "The success of few strategies can be measured from only one point of view", S63). The insurer-specific ranking (S64) puts customer satisfaction and complaints at the top of the customer view, claim-to-compensation consistency and frequency in the process view, loss/expense ratio in the financial view, and employee satisfaction / training / productivity in the people view. Applied to a cabinet d'expertise: Opérationnel (flow and SLA), Qualité (révisions, retouches), Service par compagnie (the insurer is the customer), Équipe (charge, capacity, throughput vs the team median — never a league table, per the synthesis rulings).
4. **Every number needs one comparison, and trend where useful; two at most** (Few, S65). Few's list — plan, forecast, standard, norm, the past, peers, consecutive past intervals — maps to: the firm's target (once named), the previous period, the team median, and an external reference line labelled with its source and date.
5. **Monitoring, not analysis, on the top screen; analysis one click away and back.** Few's three steps (S65) and Geckoboard's monitoring vs performance split (S66). Barr: reports must answer "what is performance doing, why, and how do we respond?" and must not react to noise (S60) — line/XmR charts over gauges and pies (S61). Marr: strategic KPIs must be separated from operational data, not "lumped together in one … indecipherable dashboard", and never hard-wired to incentives (S62).
6. **Cadence:** leaders read weekly/monthly/quarterly (S67, S54); the Direction view therefore defaults to a monthly window with a 13-week trend, while the role dashboards stay "now" views (synthesis §2).

### Q5. Trust and credibility signals buyers in regulated industries look for

1. **A data-as-of stamp on every dashboard** is "the single highest-leverage habit for freshness trust"; it must reflect data age, not page-load; don't say "temps réel" for batch data; one caught gap and "they stop trusting the whole dashboard" (S71). Power BI exposes owner + refresh time on every item because it "gives you confidence and is often critical in making the right decisions" (S73); Zebra BI warns that refresh time and latest-data time are different stamps (S74). Metaplane: agree freshness tiers per use (S72). The synthesis already mandates « En direct · HH:MM »; the demo should point at it.
2. **Definitions attached to the number.** Barr step 3: "Define exactly how those priority measures are calculated, and from what data" (S61); Few: precise values and context in hover pop-ups, not on the face (S65); Five Sigma's selling point is one source of truth so numbers stop drifting between tools (S28). The app already has one definitions module (`dashboard/metrics.ts`); expose the formula and window in an (i) popover.
3. **Drill-to-evidence in one click, without leaving the view.** Regure sells "Drill-down from metric to individual claim … in one click" and evidence packages generated "without leaving the dashboard" (S46); Decerto's three-minute drill (S50); Few: drill by clicking the item itself, keep the dashboard "sacred" (S65). Reviewers reward evidence that settles disputes (S22).
4. **An audit trail and change log.** A field-service reviewer's top complaint is the missing "log for tracking who made changes" (S22); Kinro lists what an entry must hold (ID, timestamp, actor/model, inputs, outputs, decision factors) and that logs must be searchable and retained (S47). SL Auto's `log-historique` per dossier is this — show it at the end of the drill.
5. **Export in the regulator's and the board's format.** Five Sigma: scheduled Excel/CSV, as-of-date reports, bordereaux (S28); Regure: "Board MI packs … each quarter", "export-ready" evidence (S46); Sedgwick: standard and ad hoc reports (S37). Moroccan insurers file D10/D12 (auto RC paid claims and reserves), quarterly D23 and monthly D23 bis états through ACAPS's secure platform "permettant de garantir l'intégrité de ces états", and must keep a claims-settlement manual covering opening, updating and closing of dossiers sinistres, with reserving based on "cadences de règlement" (S76). An expertise firm cannot file for the insurer, but a per-compagnie monthly export (volumes, délais by stage, révisions, closed vs open) is the input the insurer's claims department needs for its own cadence and reserving work — that is the credibility hook for the ACAPS context. Legal délais the insurer is measured against (declaration 5 working days, offer within 3 months, complaint reply 30 days — S77) are the outer clock the firm's total délai sits inside.
6. **Honest scope beats inflated scope.** No CSAT channel, no money KPIs, no GPS trail (synthesis §5): saying so, with the definition popover, is itself a trust signal; the vendors that overreach ("temps réel", CSAT from a proxy) are the ones basedash's rule punishes (S71).

---

## PART C — Ranked lists

### C1. What to show in the first 90 seconds (ranked)

1. **The Direction view already open, loaded, on the prospect's own tenant name, stamped « Données au 14:32 »** — Do the Last Thing First (S1, S2, S7); freshness stamp first because it is the first thing a sceptical director reads (S71).
2. **The north-star tile, twice the size of the rest: « Délai médian requête → rapport déposé · 30 j clôturés » with the previous-period delta and a 13-week line** — one metric, comparative, trend included (S58, S65, S68).
3. **Its quality twin beside it: « Taux de révision (2ᵉ/3ᵉ accord) · 30 j »** — speed never travels alone; supplements are the number every insurer recognises (S40, S57, S39).
4. **« En retard maintenant : N » in the danger pair, with the oldest item named** — loss-aversion (S10, S11); the exception-first manager view every vendor sells (S25, S29, S50).
5. **One click from that tile into the dossier, then into its log historique, then back** — the Decerto three-minute drill (S50), Regure's one-click evidence (S46), Few's "sacred" dashboard that survives the round trip (S65). This is the wow moment: the number is real.
6. **« Par compagnie » strip with the prospect's company on the first row** (if the prospect is an insurer) or their top three insurers (if a cabinet) — personalisation that makes the buyer "recognize their unique pain points and workflows" (S17, S16).
7. **Closing Tell, three words: « Zéro dossier oublié »** (or « Délais tenus, prouvés ») — 2Win's Key Operational Impact (S4).

Everything else — role dashboards, the phone view for the field agent, tutorials, settings — comes after the buyer has asked "how is that number produced?".

### C2. What convinces on drill-down (ranked)

1. **The same number in two places** (Direction tile → Suivi d'équipe funnel → filtered dossier list) with the same definition, because inconsistency is the top trust-breaker (S21, S17, S28).
2. **The (i) popover on every tile: formula, window, exclusions, data source** (S61, S65) — "clôturés seulement", "24 h ouvrées, jours fériés marocains exclus".
3. **Per-person view that compares to the team median and the person's own history, never a rank** (synthesis rulings; Marr on incentives, S62) — and the fact that the person sees the same numbers about themself.
4. **Log historique on the dossier the tile pointed at**: who did what, when — the change log reviewers ask for (S22, S47).
5. **Stage decomposition of the total délai** (ouverture / terrain / chiffrage / révision / facture → rapport), since "small improvements at any stage compound" (S56) and ValueLink's turn-time-by-stage is the appraisal-ops norm (S45).
6. **Monthly per-compagnie export (CSV/PDF) generated live in front of the buyer**, framed as the insurer's input for its own cadence/reserving reporting (S28, S46, S76).
7. **Period toggle on the Direction view only (30 j / mois précédent / trimestre)** with the window printed in every caption — cadence matches how leaders read (S67).
8. **Reference lines with a source and a date** (BCA 48 h report commitment, industry supplement ≈ 35 %) — benchmarks are what Guidewire and Solera sell (S30, S33), but only labelled, never as "vous vs le marché marocain", for which no public figure exists.
9. **The freshness stamp changing while they watch** (create a rappel from a second window; the tile and stamp move) — proves "en direct" is not a label (S71).
10. **The field agent's phone view**: one column, next mission, huge targets — the "how the number is produced" leaf of the KPI tree (S59).

---

## PART D — Proposed « Direction / Pilotage » executive view: content spec

**Audience:** Admin / Directeur de cabinet, and the insurer's claims director when a per-compagnie share is granted. **Purpose:** monthly monitoring with drill-to-evidence — not the daily operating view (the four role dashboards keep that job; nothing below duplicates them). **Cadence:** monthly review, glanceable weekly. **Placement:** a fourth tab « Direction » on the Admin dashboard, or the landing tab for the Admin role during demos.

### D1. Layout (one screen, no scrolling on a 1366×768 laptop; synthesis rule 8)

```
[ En-tête ]  Direction · Cabinet X            Période: [30 j ▾]   Données au 14:32 · en direct   [Exporter ▾] [(i) Définitions]
[ Bloc 1 — North star ]  Délai médian requête → rapport déposé   17,5 j   (P90 41 j)   vs période préc. −2,1 j   ▁▂▃▅▃▂▁ 13 sem.
[ Bloc 2 — 5 tuiles ]    En retard maintenant  ·  Dans les délais 24 h (chiffrage / terrain)  ·  Taux de révision  ·  Clôturés / Entrées  ·  Charge (en cours / personne)
[ Bloc 3 — Décomposition ]  Ouverture · Terrain · Chiffrage · Révision · Facture→Rapport  (médiane par étape, barres horizontales, cible en tick)
[ Bloc 4 — Par compagnie ]  Compagnie · Entrées · En cours · Délai médian · Dans les délais % · Révisions %  (table, 5–8 rows, sortable, row → filtered dossiers)
[ Bloc 5 — Exceptions ]     10 oldest late items across roles, owner named, row → dossier
```

Bloc 1 top-left because always-important items go where the eye lands (S65). Charts: one line for the north star, horizontal bars for the stage decomposition, nothing else (S61; synthesis "no charts on personal dashboards" is respected — this is not a personal dashboard).

### D2. KPIs, definitions, comparisons

All formulas reuse `dashboard/metrics.ts` and `buildSlaItems`; definitions are listed in `dashboard-industry-kpis.md` Part C. Each tile prints its window and one comparison (two at most, S65).

| # | Tile (FR) | Definition (fields) | Window | Comparison | Why it is here |
|---|---|---|---|---|---|
| NS | Délai médian requête → rapport déposé | median and P90 of `d(dateRequete, dateRapportDepose)` over dossiers closed in the window (closed cohort only; never mixes open files) | 30 j glissants, or month / quarter via the selector | previous equal window; 13-week trend line; firm target tick once named | the OMTM: what the insurer buys from a cabinet (S58, S68, S44, S56) |
| 1 | En retard maintenant | count of SLA items breached and not done (chiffrage, mission, création), any role | now | — (danger pair only when > 0) | exception-first, loss-aversion (S29, S50, S10) |
| 2 | Dans les délais · 24 h ouvrées | `% chiffrages completed ≤ 24 h` and `% missions photos ≤ 24 h`, two mini-values in one tile | 30 j | previous 30 j; target tick (e.g. 90 %) once the firm names it | the SLA every vendor headlines (S26, S50, S51) |
| 3 | Taux de révision | dossiers with 2ᵉ/3ᵉ accord ÷ dossiers with a 1ᵉʳ accord in the window | 30 j | previous 30 j; reference line « ≈ 35 % industrie (Veritas, 2025) » labelled | quality twin of speed (S57, S40, S45) |
| 4 | Clôturés / Entrées | `count(dateRapportDepose in window) / count(createdAt in window)` (production ratio) + both raw counts | 30 j | previous 30 j | backlog direction in one ratio (S49 aging/closure; prior research A10) |
| 5 | Charge | open dossiers ÷ active gestionnaires; open chiffrages ÷ chiffreurs; open missions ÷ agents — three small values | now | team median band (Q1–Q3) from the Admin per-person table | people view of the scorecard without a leaderboard (S63, S64, S62) |
| D | Décomposition du délai | median `d()` per stage: requête→création, création→photos avant, assignation→chiffrage terminé, 1ᵉʳ→dernier accord, facture validée→rapport déposé | same window as NS | previous window per bar; BCA reference tick on the last bar (« 48 h après facture », S44) | stage turn-time is the appraisal-ops norm (S45, S56) |
| C | Par compagnie | per `compagnie`: Entrées, En cours, Délai médian (closed), Dans les délais %, Révisions % | same window | column sort; row click → filtered dossiers | the insurer is the customer; transparency sells (S37, S25, S28) |
| E | Exceptions | union of late SLA items across roles, oldest first, owner named, cap 10 | now | — | the drill-to-evidence entry point (S46, S50, S65) |

Deliberately **not** on the view (honesty, per synthesis §5 and prior research): money (severity, devis totals, leakage), CSAT/NPS, drive time, photo-quality score, per-person ranks, "temps réel" wording unless the listener is live, any chart on the role dashboards.

**Optional, gated by data quality:** « Montant chiffré validé (30 j) » may appear on the Direction view only when ≥ 95 % of closed dossiers in the window carry a validated devis total; otherwise the tile is absent (not zero). Reason: vendors headline severity (S38, S49) and a director will ask, but a wrong money number is the fastest way to lose the room (S71).

### D3. Period logic

- Stocks (« En retard », « Charge », « Exceptions ») are **now**; the caption says « maintenant ».
- Rates and délais use the selector: **30 j glissants** (default), **Mois précédent** (calendar), **Trimestre**; captions print the real dates (« 7 août – 6 sept. »). Comparison is always the equal preceding window.
- Cycle-time metrics use the **closed cohort** in the window (prior research A14); open-file age lives in the Gestionnaire/Admin aging buckets, not here.
- Trend: 13 weekly points of the north star (median per closed week), plain line, no RAG bands; target as a dotted horizontal line once named (S61, S65).
- Business hours: 24 h ouvrées, Moroccan holidays paused (existing `buildSlaItems`); Lionheart tenant swaps the holiday calendar and units (days stay days).

### D4. Benchmarks and references (honest framing)

- **Internal first:** previous period, team median/IQR, firm target. These are always computable.
- **External second, always labelled with source + date, drawn as a reference tick, never as a score:** BCA « rapport sous 48 h après facture » (S44); « supplément ≈ 35 % industrie US » (S57); « attente assuré 11 j vs moyenne 23,9 j » (S56, US, whole-claim, so only as context in the Closing Tell, not on a tile); Decerto's 4–7 day personal-auto PD median for mature digital carriers (S50) — same caveat. For Morocco, the honest reference is regulatory (declaration 5 working days, offer within 3 months, S77) and there is no published cabinet benchmark; say so in the (i) popover.
- Once two or more tenants exist, an **opt-in anonymised cross-tenant median** can replace the foreign references — the Guidewire "data cooperative" story (S30) at cabinet scale. Not before.

### D5. Trust furniture (each one is demo-able in five seconds)

- « Données au HH:MM · en direct » stamp = time of the last Firestore snapshot, not page load; degrades to « Données au HH:MM · reconnexion… » when the listener drops (S71, S74).
- (i) popover per tile: formula, window, exclusions, source module, last definition change date (S61, S65).
- Row and tile click → filtered existing list (dossiers / queue / terrain), never a new chart; « ← Direction » returns with the view unchanged (S65).
- Dossier → « Historique » tab as the audit trail (S22, S47).
- « Exporter ▾ »: CSV of blocs C and E, PDF one-pager of the whole view with the stamp and the definitions appendix (S28, S46; S69's three-page narrative slot is the cover note).
- Access: Admin and Responsable d'équipe; a per-compagnie read-only share for the insurer's director is the natural upsell (S37).

---

## PART E — Demo pitfalls to avoid (checked against the sources)

1. **Empty or thin tenant.** An empty reporting dashboard says nothing (S8). Seed ≥ 6 months of dossiers so the 13-week trend and the 30 j/previous comparison are both populated.
2. **Stale seeded dates.** A stamp reading « Données au » with dossiers created three months ago before the demo reads as abandoned. Hard-reset the tenant to a template with dates relative to today before every demo (S18, S16).
3. **Placeholder names and round numbers.** No "Acme", no "Test 1", no 100 %/0 % tiles; numbers sized to the prospect's volume (S16). No real client names or assurés (pitch memory: no fake clients, and no real ones either).
4. **Calling it « temps réel » when it is not, or showing a stamp that is page-load time** (S71, S74).
5. **Numbers that disagree between the Direction tile, Suivi d'équipe and the list**, or between the marketing-site screenshot and the live app (S21, S17, S28). Re-shoot the site screenshots from the demo tenant after every dashboard change.
6. **Starting in settings, admin, or login.** Executives "don't want to see how to set up or administer the system" (S1, S2). Be logged in, on the Direction view, before screen-share starts.
7. **Feature tour instead of a story.** Generic tours lose the buyer (S7); over-sharing "manufactures objections" (S11). Show one number, one drill, one export, one role view; stop.
8. **Show-Tell-Tell.** Explaining definitions mid-click instead of in the Opening Tell (S4). Announce "watch the stamp, then the late count" before showing.
9. **ROI slides before the product**; broad social proof ("used by big companies") that cuts close rate (S10). The modeled ROI comes last, in the buyer's own assumptions.
10. **Slow loads and the Firestore ca9 wedge.** Have the recorded backup ready (S7, S9); pre-warm the tenant; test the room's network (memory: forced long-polling is dev-only — verify prod behaves on the demo network).
11. **Leaderboards or per-person ranks on screen**, even "just for the demo" — they contradict the product's own rulings and hand the buyer's HR a reason to object (S62; synthesis rule 6).
12. **Unsourced benchmark claims** ("the market average is X") for Morocco or Canada; only labelled reference lines with source and date (Part D4).
13. **Too many tiles.** If the presenter cannot recite the Direction view's metrics from memory, neither can the director (S68); five tiles plus the north star is the ceiling.
14. **Gauges, pies, RAG traffic lights** on the Direction view — the practitioners who design executive reports reject them (S61, S65) and they read as generic BI templates (S55).
15. **Ignoring the silent question.** Every screen needs the "so you can…" hand-off to the director's level (S4); a screen without a Closing Tell is a screen the buyer forgets.

---

## PART F — Could not fetch

| URL | Reason | Stand-in used |
|---|---|---|
| https://greatdemo.com/old-vs-new-why-upgrade-to-great-demo-third-edition/ | HTTP 403 | S1, S2, S3 |
| https://greatdemo.com/illustrations-doing-the-last-thing-first/ | HTTP 403 | S1 (same author, interview) |
| https://greatdemo.com/demos-for-executives-a-never-stop-learning-article/ | HTTP 403 | S2 (haiku), S3 (index) |
| https://greatdemo.com/a-perfect-demo-environment-never-stop-learning/ | HTTP 403 | S16, S18 |
| https://news.ycombinator.com/item?id=29814371 ("Ask HN: How to give product demos that don't suck?") | HTTP 429 on two attempts | S14, S15, S19 |
| https://old.reddit.com/r/salesengineers/… (and any reddit.com URL) | domain blocked for this crawler | none — practitioner voice via S4–S15 |
| https://www.cccis.com/reports/crash-course-2026 and …/crash-course-2025/q1 | HTTP 403 | S40–S42 (trade-press coverage) |
| https://www.repairerdrivennews.com/2025/01/20/mitchell-… | HTTP 403 | S38, S39 |
| https://www.gartner.com/en/information-technology/glossary/claims-analytics | HTTP 403 | vendor pages S30–S32 |
| https://www.gartner.com/en/digital-markets/insights/research-rundown-2025-software-journey | HTTP 403 | S20, S21 (press coverage of Gartner surveys) |
| https://www.g2.com/categories/insurance-claims-management | HTTP 403 | S22–S25 (Capterra, SoftwareAdvice, GetApp, SourceForge) |
| https://www.celent.com/en/insights/916794809 and /457595269 | HTTP 403 | none (Celent's evaluation criteria could not be verified) |
| https://www.verisk.com/products/xactanalysis/ and /xactanalysis-qr/ | page body empty (title only) | not cited; the "Performance Scorecard" wording seen only in a search snippet is not used |
| https://www.claimcentral.com.au/technology/property | TLS certificate expired | S25 (SourceForge description) |
| https://www.clever-docs.com/blog/claims-metrics-for-efficiency/ | DNS not found | S50, S51 |
| https://hackernoon.com/dashboard-trust-is-a-data-governance-problem-not-a-bi-tool-problem | HTTP 403 | S71–S74 |
| https://lukebeacon.com.au/data-freshness-labels-… | DNS not found | S71 |
| https://www.staceybarr.com/measure-up/three-questions-to-design-your-kpi-reports/ and the category page | HTTP 403 | S60, S61 |
| https://1.tractable.ai/blog/touchless-line-by-line-… | DNS not found | S35, S36 |
| https://join-talent-bridge.com/blog/sales-demo-environment-strategy-b2b | HTTP 403 | S16 |
| https://www.geckoboard.com/solutions/executive-visibility/ | fetched, but the page carries no guidance (marketing shell) | S66 |
| https://www.cccis.com Q4 2025 report figures for cycle time / supplement frequency | not on the fetched trade-press pages | S41 gives Q2 2025 figures instead |

Search-snippet-only claims deliberately **not** used as findings: Guidewire "predefined … KPI definitions for workload, cycle time, service delivery, and exception trends" (ranking site, not vendor page); XactAnalysis "Performance Scorecard … cycle times, customer satisfaction, and estimate quality" (Verisk page body not retrievable); the Gartner Digital Markets "vendor engagements dropped from 3.2 to 2.5" figure (page 403).
