# Research: Zero-training intuitive UI + small admin/CRUD page UX

Date: 2026-09-02. Researcher: UX-research subagent (Claude).
Target: SL Auto Expertise / Appraisio French back-office — pages: utilisateurs (user CRUD + roles + sessions), tampons (stamp image CRUD), jours fériés (holiday date CRUD), 5 queue/list pages. Design system locked; findings govern structure, affordances, flows, wording.

Source policy honored: theory/practitioner material prioritized over design-system docs (one design-system pattern doc — GitLab Pajamas — used as practitioner-grade supplementary evidence on save feedback; flagged as such).

---

## A. Source log

Legend: FETCHED = full page fetched via WebFetch and summarized; SEARCH = content came from search-result snippets only; FAILED = could not fetch; TRAINING = claim from model training knowledge, flagged inline.

### Theory: self-evidence, signifiers, mapping, feedback

1. **Don Norman, "Signifiers, not affordances" (jnd.org)** — FAILED. `https://jnd.org/signifiers_not_affordances/` → HTTP 404; `r.jina.ai` mirror also returned jnd.org's 404 page (site restructured). Substitute sources 2 and 3 below cover the same theory. TRAINING note (flagged): Norman's essay argues designers should stop saying "affordance" when they mean the *perceivable signal* of what's possible; a signifier is "any mark or sound, any perceivable indicator that communicates appropriate behavior to a person." Confidence high but unverified against the live essay.
2. **UX Magazine, "Understanding Don Norman's Principles of Interaction"** — FETCHED. `https://uxmag.com/articles/understanding-don-normans-principles-of-interaction`
   - Affordance: "An affordance means that the object tells you what actions are possible just by looking at it."
   - Signifier: signs/labels pointing to *where/how* to act — "A label that says 'PUSH.' A blinking light that draws your attention."
   - Constraints: "A USB stick only fits one direction... The design keeps you on the right track without needing warnings." (UI: input masks, disabled/absent invalid options.)
   - Mapping: "Buttons next to a door should control that specific door." (UI: control sits next to the thing it changes.)
   - Feedback: "A 'beep' when your phone takes a picture. A message saying 'Payment accepted.'"
   - Conceptual model: "Clicking a folder 'opens' it, pressing a green button 'starts' something."
   - Its clickability checklist: raised/shadowed buttons, color-differentiated interactive elements, cursor change on hover, underlined links, bordered text fields, icons consistent with learned mental models.
3. **NN/g, "Flat UI Elements Attract Less Attention and Cause Uncertainty"** — FETCHED. `https://www.nngroup.com/articles/flat-ui-less-attention-cause-uncertainty/`
   - Empirical: with weak clickability signifiers "participants spent 22% more time" and had "25% more fixations" finding targets.
   - "even when they do see the weak element, they don't feel confident that it is what they want, so they keep looking around the page."
   - Flat design survives only with: low information density + traditional layout (elements in expected locations) + high-contrast targets. Recommendation: keep "visual simplicity, external consistency, clear visual hierarchy, and contrast."
4. **NN/g, "Response Times: 3 Important Limits" (Nielsen, 1993/updated)** — FETCHED. `https://www.nngroup.com/articles/response-times-3-important-limits/`
   - 0.1 s = "the limit for having the user feel that the system is reacting instantaneously... no special feedback is necessary except to display the result."
   - 1.0 s = "the limit for the user's flow of thought to stay uninterrupted, even though the user will notice the delay."
   - 10 s = "the limit for keeping the user's attention focused on the dialogue."
   - Percent-done indicators "for operations taking more than about 10 seconds"; a spinner or status text is better than silence for unquantifiable waits.

### Theory: Krug, recognition, progressive disclosure, learnability, defaults

5. **Chester Grant, "Summary: Don't Make Me Think Revisited — Steve Krug"** — FETCHED. `https://www.chestergrant.com/summary-dont-make-me-think-revisited-steve-krug`
   - Law 1: pages must be "self-evident. Obvious. Self-explanatory."
   - "We don't read pages. We scan them."
   - Law 2: "It doesn't matter how many times I have to click, as long as each click is a mindless, unambiguous choice."
   - Law 3: "Get rid of half the words on each page, then get rid of half of what's left."
   - "Take advantage of conventions"; build "effective visual hierarchies"; support scanning via headings, short blocks, highlighted key terms. Every page should answer: What is this? What can I do here?
   - TRAINING (flagged): Krug's "trunk test" — dropped onto any page you should be able to answer: What site is this? What page am I on? What are the major sections? Where am I in the scheme of things? — and his rule that the page name should match what the user clicked, are from the book itself; the fetched summary covered the navigation questions only generally.
6. **NN/g, "Recognition and Recall in User Interfaces"** — FETCHED. `https://www.nngroup.com/articles/recognition-and-recall/`
   - "The difference between recognition and recall is the number of cues that help memory retrieval; recall involves fewer cues than recognition."
   - "Recognition is easier than recall because it involves more cues: all those cues spread activation to related information in memory."
   - GUI menus beat command lines because you "look at the menu of formatting options and easily recognize the term Strikethrough" instead of recalling syntax. Show recent items/history. Make "information and interface functions visible and easily accessible." Use "contextual tips tailored to the page," not up-front tutorials that demand memorization.
7. **NN/g, "Progressive Disclosure" (Nielsen)** — FETCHED. `https://www.nngroup.com/articles/progressive-disclosure/`
   - Defers "advanced or rarely used features to a secondary screen, making applications easier to learn and less error-prone."
   - Two steps: "Initially, show users only a few of the most important options" then "Offer a larger set of specialized options upon request."
   - Must "disclose everything that users frequently need up front"; "it must be obvious how users progress" with labels that set "clear expectations."
   - Designs with >2 disclosure levels "typically have low usability because users often get lost."
   - Staged disclosure = linear sequence (wizards) for task-ordered steps.
8. **NN/g, "How to Measure Learnability of a User Interface"** — FETCHED (correct slug `https://www.nngroup.com/articles/measure-learnability/`; the `/how-to-measure-learnability/` slug 404'd).
   - Learnability = "how easy it is for users to accomplish a task the first time they encounter the interface and how many repetitions it takes for them to become efficient."
   - Three aspects: first-use performance, slope of the learning curve, ultimate efficiency plateau. "A learnable system is not always efficient" (wizard example). Learnability studies matter for "complex [apps] and ones that users access frequently."
9. **UI-Patterns, "Good Defaults" pattern** — FETCHED. `https://ui-patterns.com/patterns/GoodDefaults`
   - Problem: "The user needs to enter data into the system, where some input values are most likely to match default values." Solution: "Pre-fill form fields with best guesses at what the user wants."
   - Caution: "Do not use for input fields that are important for the user to think about" (consent, critical decisions).
10. **Zuko, "How to use Smart Defaults to Optimize your Form UX"** — FETCHED. `https://www.zuko.io/blog/how-to-use-defaults-to-optimize-your-form-ux`
    - "Use default when it's the choice of MOST users"; "Use what you know about your users to inform your default choices."
    - Never re-ask known data; never default sensitive/political fields; never dark-pattern pre-ticks.

### Destructive actions, undo, confirmation

11. **Aza Raskin, "Never Use a Warning When You Mean Undo" (A List Apart)** — FETCHED. `https://alistapart.com/article/neveruseawarning/`
    - "Software should know that we form habits... we'll probably click 'Okay' this time too, even if we don't mean to."
    - "The solution to our warning woes is undo." / "Never use a warning when you mean undo."
    - Guidance: immediate undo after destructive actions; soft delete (trash before permanent removal); design for recovery, not prevention; louder warnings only speed up habitual dismissal.
12. **NN/g, "Confirmation Dialogs Can Prevent User Errors — If Not Overused"** — FETCHED. `https://www.nngroup.com/articles/confirmation-dialog/`
    - Confirm only "before committing to actions with serious consequences — such as destroying users' work or costing large amounts of money."
    - "explain what *this* is, in user-centric terms" (criticizes YouTube's dialog that doesn't name the video being deleted).
    - Buttons must "summarize what will happen for each possible response" — e.g. "Delete file" / "Keep file," never Yes/No/OK. No default answer on the destructive side. "If you warn people too much, they stop paying attention." Undo is the complementary safety net to "reduce anxiety and allow users to recover."
13. **SaaSUI.design, "SaaS Destructive Actions & Confirmation UX Patterns (2026)"** — FETCHED. `https://www.saasui.design/blog/saas-destructive-actions-confirmation-ux-patterns`
    - Four-rung friction ladder: (1) no confirmation + undo — "Archiving one item that can be un-archived in a click deserves almost no friction — ideally none, with an undo instead."; (2) simple confirm — "Deleting a single record that can be restored from a trash deserves a light confirmation."; (3) explicit-consequence confirm — "A confirmation is only protective if it tells the user what is about to happen in concrete, specific terms" (name the object, what's lost, recoverability, ripple effects on other users); (4) type-to-confirm — "For the truly irreversible... a single click on a red button is not enough friction."
    - Buttons: action verbs ("Delete", "Cancel subscription"), destructive styling, never auto-focus the destructive button, safe path = easy default. Behind the undo toast keep durable recovery (trash) so users can recover "ten minutes later."
14. **Josh Wayne, "Confirm or Undo?"** — FETCHED. `https://joshwayne.com/posts/confirm-or-undo/`
    - Confirm dialogs fail three ways: "The dialog box forces them to stop thinking about the work they were doing"; users have "the habit of closing dialog boxes quickly"; "If nothing stands out, we assume everything is good and click confirm because it removes the little box."
    - Undo "respects user competence" — "The interface does what it's suppose to without asking the user if they're sure" — and "encourages exploration" because users know "they won't break something."
    - Implementation: visible undo placement (banner/adjacent), recovery locations (trash/archive), delayed execution (15-second email send delay).
    - When confirm IS right: "Confirmations only work when they are unexpected"; make them unique (type the project name); specific language ("Delete *filename*", not Yes).
15. **Fountn (digest of Josh Wayne), "Confirm or undo? Which is the better option?"** — FETCHED. `https://fountn.design/resource/confirm-or-undo-which-is-the-better-option/` — corroborates 14: confirm dialogs "disrupt the user's flow," "exploit habitual clicking behavior," go "unread"; undo assumes competence, is unobtrusive, invites exploration.
16. Search-only corroboration (SEARCH, not fetched): Android design guidelines "Confirming & Acknowledging"; tes.com style guide "Use undo"; Hacker News thread 7478166 — all surfaced in results agreeing that confirm dialogs are for truly irreversible actions only.

### Hick / Fitts applied

17. **LogRocket, "What is Fitts's law? UI examples and best practices"** — FETCHED. `https://blog.logrocket.com/ux-design/fitts-law-ui-examples-best-practices/`
    - Touch: "all touchscreen controls and interactive elements should have a hit target that measures at least 44×44 pt" (Apple figure). Desktop: no exact px floor given; "bigger is better."
    - Don't crowd — "too many buttons too close to each other" causes mistakes. Put primary actions near the user's locus of attention; edges/corners are cheap targets but "avoid placing essential or irreversible actions there." Keep destructive actions "deliberately separated from frequently-used buttons."
    - TRAINING (flagged): WCAG 2.2 SC 2.5.8 sets a 24×24 CSS-px minimum target size (AA) with spacing exception; Material recommends 48dp touch / ~32px pointer. Not in the fetched page; high confidence.
18. **Laws of UX, "Hick's Law"** — FETCHED. `https://lawsofux.com/hicks-law/`
    - "Minimize choices when response times are critical to decrease decision time."
    - "Break complex tasks into smaller steps in order to decrease cognitive load."
    - "Avoid overwhelming users by highlighting recommended options."
    - "Use progressive onboarding to minimize cognitive load for new users."
    - "Be careful not to simplify to the point of abstraction."

### Inline vs modal vs page editing

19. **UX Design World, "Best Practices for Inline Editing in Table Design"** — FETCHED. `https://uxdworld.com/inline-editing-in-tables-design/`
    - Inline for "limited data" / quick single-field changes with no context loss; modal to "ensure simplicity" for complex records; separate page for multi-row bulk edits.
    - Editability signifiers: pencil icon "displayed constantly or by hovering over the cell"; when only some cells are editable, "a clear indication is required with the editable cells."
    - Save patterns: click-outside auto-save OR explicit save icon + "option to discard the changes by clicking the Cancel button." "Input validation is a mandatory feature to provide along with inline editing."
20. **Rakibul Ism (Medium), "Choosing Modals Over Inline Actions: A UX Case Study on Table Complexity"** — SEARCH only (Medium pages unreliable through fetcher; not fetched). Snippet: "Modal dialogs are best used when a task requires focused attention and a separation from the main workflow; they handle multiple decisions and conditional input states in an isolated space."
21. **UX Movement newsletter, "The Easiest Way to Bulk Edit Data" + inline-edit threads** — SEARCH only. Snippet: "Turning the horizontal table format into a vertical form format is better for bulk editing by displaying the fields in a modal drawer." Also, from Web App Huddle snippet (`https://webapphuddle.com/inline-edit-design/`, SEARCH): moving the user to a separate view "loses the context of their work"; inline edit means "a tiny HTTP PATCH... each time a field change is committed."

### Feedback / optimistic UI / toasts

22. **GitLab Pajamas, "Saving and feedback" pattern** — FETCHED (design-system doc, used as supplementary practitioner-grade evidence). `https://design.gitlab.com/patterns/saving-and-feedback/`
    - Manual save: "Confirm the result in the least disruptive way: if the change is already visible on the page, no confirmation is needed; otherwise prefer an inline confirmation near the save control."
    - Auto-save "should be applied to each input individually and not to forms as a whole"; avoid auto-save for data with "financial, security, or privacy impacts."
    - "show an inline status indicator near the affected content rather than a toast." A "Changes saved" toast acceptable only "when the result isn't otherwise visible, but it must not carry actions."
    - Failed auto-save: inline danger alert "Failed to save x changes" + manual retry, persists until success (toasts auto-dismiss — inaccessible for errors).
    - Undo: "a persistent inline control next to the change, not an action inside a toast, which cannot be reached accessibly before the toast dismisses."
    - Optimistic UI: show result at 50% opacity + spinner while in flight; 100% on confirm.
23. **UX Movement, "Why toasts aren't the best for button feedback"** — FAILED (paywalled; only the setup fetched: toasts are "a common approach" but "there's a UX problem with them that most designers miss"; alternative = button-adjacent inline feedback). Direction corroborated by 22.
24. **UX Tigers (Nielsen), "Think-Time UX"** — SEARCH only (surfaced; not fetched; corroborates feedback-timing guidance).

### Empty states

25. **72 Technologies, "Empty States as Onboarding: A Practical UX Playbook"** — FETCHED. `https://www.72technologies.com/blog/empty-states-as-onboarding-surface`
    - Four jobs of a first-use empty state: (1) name the value in outcomes — "'Track which deals are stalling' beats 'Your pipeline is empty'"; (2) show the shape of success (ghost row/screenshot of populated state); (3) "one obvious next action" — a single primary CTA (+ at most one escape hatch: sample data/import/demo); (4) remove friction at zero (pre-seeded deletable sample data).
    - Three variants need different tone: first-use (onboarding), user-cleared (confirmation — "A reassuring 'Inbox zero — nice work' is delightful after the user archives their last ticket. It's bewildering on day one"), error-adjacent (recovery).
    - Copy: "No apologies. 'Oops, nothing here yet!' infantilises the user." "'Create project' beats 'Get started' because it tells the user what's about to happen." "One sentence of value, one sentence of how. That's it."
26. **Eleken, "Empty state UX examples"** + **Setproduct "Empty state UI design"** + **UserOnboard empty-states pattern** — SEARCH only, corroborating: first-run empty states "must invoke action, typically with a primary call to action button"; "give one clear primary action."

### Admin/user-management teardowns

27. **SaaSUI.design, "SaaS Permissions & Roles UX Patterns"** — FETCHED. `https://www.saasui.design/blog/saas-permissions-roles-ux-patterns`
    - Roles: small, well-differentiated set, and "describe each one in plain language right where it is assigned: not just 'Admin' but 'Admin — can manage billing, members, and settings.'" Test: an admin who never read the docs picks the right role first try; "if they have to guess, the model is too abstract and abstraction in access control is how over-granting happens" (from search snippet of same article).
    - Invite flow: "invite by email (ideally several at once), assign a role in the same step so access is scoped from the first click"; show pending state; allow resend/revoke/role-change without re-inviting.
    - User table: per row "who the person is (name, email, avatar), their role, and their status — active, invited/pending, or deactivated," visually distinct statuses, per-row actions (change role, resend invite, remove).
    - Lockout guards: "warn before an admin removes their own access or the final owner"; make consequences visible before applying. Audit trail of invites/removals/role changes; last-active indicators.
28. **Stitchflow/Perpetual/Nicelydone user-management pieces** — SEARCH only, corroborating: inline action menus "keep critical controls close at hand"; context-aware row actions ("Revoke Invite only appears for pending status users, while active users display Deactivate and Delete").

### Date entry for administrative data (holidays)

29. **NN/g, "Date-Input Form Fields: UX Design Guidelines"** — FETCHED. `https://www.nngroup.com/articles/date-input/`
    - "Calendar pickers should be used for events close to the present time — within less than a year." Holidays for the current/next year fit this.
    - "Allow users to type the date even if other input methods are available."
    - Against split dropdowns: "This method increases interaction cost... We advise against using this pattern."
    - "Whatever format users chose for entering the date (dashes, spaces, slashes, dots...) their input should be recognized." No forced leading zeros.
    - "For a limited number of date options, provide a list of the applicable dates" (≤10).
    - International: "Spell out the name of the month to distinguish it from the day."
30. **UX Patterns for Developers, "Date Input Pattern"** + Designary tip — SEARCH only: typed input "is the preferred approach for entering known dates... where a calendar view adds unnecessary complexity"; hybrid "input calendar" (typed field + optional picker) serves both keyboard and pointer users.

### Navigation legibility

31. **Pencil & Paper, "Breadcrumbs UX Navigation — The Ultimate Design Guide"** — FETCHED. `https://www.pencilandpaper.io/articles/breadcrumbs-ux`
    - Breadcrumbs earn their place in "hierarchical, complex information structures" (enterprise SaaS, deep nesting); on detail pages they preserve context. Breadcrumbs must "complement, not duplicate" existing navigation — avoid "redundancy in what's shown" when the sidebar already communicates location. Current page = terminal, non-link point.
32. **NN/g "Breadcrumbs: 11 Design Guidelines"** + Smashing Magazine breadcrumbs + Eleken breadcrumbs — SEARCH only, corroborating: breadcrumbs answer "Where am I?"; "always highlight the active page or section"; "use the words your users use"; helpful "especially when they land deep inside a product from search results, bookmarks, or shared links."

---

## B. Could-not-fetch list (honest accounting)

- `https://jnd.org/signifiers_not_affordances/` — 404 (direct AND via r.jina.ai; jnd.org restructured). Theory reconstructed from UX Magazine fetch + flagged training knowledge.
- `https://uxmovement.substack.com/p/why-toasts-arent-the-best-for-button` — paywalled; only the framing paragraph retrieved.
- `https://www.nngroup.com/articles/how-to-measure-learnability/` — 404 wrong slug; recovered successfully at `/articles/measure-learnability/`.
- Medium-hosted case studies (Rakibul Ism modal-vs-inline; Gloria Solinas Krug takeaways) — not attempted individually after repeated Medium fetch unreliability; used search snippets only, marked SEARCH.
- No specific r/UXDesign thread was retrievable through search (Reddit results did not surface); practitioner-debate coverage instead comes from A List Apart, Josh Wayne, Fountn, HN-thread search snippets.

Fetched-successfully count: 21 pages (sources 2–15, 17–19, 22 partial, 25, 27, 29, 31). Search-snippet-only: ~10 more.

---

## C. Synthesis mapped to the seven research questions

### RQ1 — Self-evident UI: signifiers checklist, mapping, feedback timing
- Everything actionable must *look* actionable without hover: buttons with contained shape/contrast, links underlined or color-differentiated, editable fields with visible borders, icons from the learned vocabulary (pencil = edit, trash = delete) [2, 3]. Hover-only affordances are supplements, not the signal — NN/g measured 22% more time / 25% more fixations with weak signifiers [3].
- Flat styling is safe only where density is low, layout is conventional, and targets contrast with their surroundings [3]. In dense queue tables, actions need explicit signifiers.
- Mapping: put the control next to the thing it changes (role select in the user row/panel, not a distant settings screen) [2].
- Feedback: <0.1 s show the result itself; ~1 s tolerable without indicator; >1 s show a spinner; >10 s show progress/percent [4]. Silence is never acceptable feedback [4, 22].
- Constraints beat warnings: make invalid actions impossible (disable/omit) rather than warn after [2].

### RQ2 — Hick/Fitts applied
- Fewer choices per decision point; highlight the recommended option; split complex tasks into steps; but don't abstract away meaning [18]. Krug: clicks are cheap if each is "a mindless, unambiguous choice" [5].
- Targets: ≥44 pt touch (Apple, via [17]); WCAG 2.2 floor 24×24 px (TRAINING flag); desktop-first app should still keep row actions ≥32 px hit area for responsive/touch reuse. Space targets; separate destructive from frequent actions physically [17].
- One primary action per screen region, biggest and nearest the locus of attention [17, 25].

### RQ3 — Destructive actions
- Practitioner consensus is a *ladder*, not a binary: undo-only → light confirm → explicit-consequence confirm → type-to-confirm [13], with Raskin/Wayne establishing undo-first because warnings habituate [11, 14, 12].
- Always name the object; state consequences and reversibility; verb-labeled buttons; no Yes/No; don't focus/default the destructive button [12, 13, 14].
- Small CRUD lists (users, stamps, holidays): soft delete + undo window + trash-style durable recovery where feasible; reserve type-to-confirm for account-level catastrophes only — "Confirmations only work when they are unexpected" [14].

### RQ4 — Inline vs dialog vs page
Decision criteria practitioners use [19, 20, 21]:
- Single scalar field, low risk, no dependent fields → inline edit in place (role dropdown, stamp label, holiday date). Requires explicit editability signifier + validation + visible save/cancel or immediate-save-with-undo.
- Multi-field record, conditional inputs, focused decision → modal/drawer (vertical form) — e.g., create user (email + role + scope), edit stamp (image + label).
- Many rows / bulk operations or a record with its own sub-navigation → separate page.
- Role changes specifically: inline select is fine *because* the consequence text can appear at the point of assignment [27]; if role change has ripple effects (session kill), use a light confirm naming the person and effect [13, 27].

### RQ5 — Empty states / first-run
- First-use empty state = onboarding surface: name the value in outcome language, show the populated shape (ghost rows), give exactly one primary CTA labeled with the action verb ("Ajouter un jour férié", not "Commencer"), optional single escape hatch [25, 26].
- Distinguish first-use vs cleared vs error empties; never apologize; two sentences max [25].

### RQ6 — Micro-feedback and trust
- Inline status near the changed element beats corner toasts (zero eye travel) [22, 23]. Toast only when the result isn't visible on screen, and never with actions inside it [22].
- Optimistic UI: render result immediately, dim/spinner while in flight, restore on confirm; on failure a persistent inline alert with retry — never an auto-dismissing error toast [22].
- Auto-save per field, not per form; manual save for financial/security/privacy-grade data [22]. Undo control persistent and adjacent, not trapped in a toast [22, 11].

### RQ7 — Navigation legibility
- Users must answer "Where am I?" from the page alone: highlighted active nav item, page title matching the nav label verbatim (Krug: page name matches what was clicked — TRAINING flag on exact phrasing), breadcrumb on detail pages only (list → detail), current crumb non-link [5, 31, 32].
- Breadcrumbs complement, never duplicate, the sidebar; keep labels in the users' vocabulary and identical across nav, title, breadcrumb [31, 32, 6].

---

## D. Application notes for the target pages (French back-office)

- **Utilisateurs**: table columns nom/email/avatar + rôle + statut (Actif / Invitation en attente / Désactivé as visually distinct badges) + row actions contextual to status [27, 28]. Role select with one-line plain-French consequence per role at the point of assignment. Invite = email(s) + rôle in one step. Guard: block deleting/demoting the last Admin; warn when editing your own account [27]. Session termination ("Déconnecter l'appareil") = light confirm naming the user + device. Prefer "Désactiver" (reversible) over "Supprimer" as the prominent action; deletion behind the ladder [13].
- **Tampons** (stamp images): card/grid with image preview = recognition over recall [6]; label inline-editable with pencil signifier [19]; replace/delete via row/card actions; delete = light confirm naming the stamp + undo, since a stamp is re-uploadable but referenced by documents — if referenced, explicit-consequence confirm stating where it's used [13].
- **Jours fériés**: typed date field with flexible parsing + optional picker (dates within a year → picker appropriate) [29, 30]; month spelled out in French display ("25 décembre 2026"); list per year with obvious year switcher; delete = no dialog, row removal + undo (trivially re-creatable = lowest ladder rung) [13, 11]. Smart default: propose the standard Moroccan/Canadian public-holiday set as pre-seeded suggestions (good-defaults pattern; deletable sample data) [9, 25].
- **Queue/list pages**: strong signifiers on row actions (no hover-only icon reveal in dense tables) [3]; primary action top-right consistent across all five pages (consistency = external conventions) [5, 3]; feedback per RQ6; empty states per RQ5 with per-page value sentence.
