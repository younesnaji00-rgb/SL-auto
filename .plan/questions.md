# Plan review — answer every question, then remove [BLOCKING] and re-invoke /loop



## Notes for the reviewer
- 6 items across 4 clusters; 4 visual+behavioral, 1 visual, 1 behavioral.
- Lean question set (just 2) — the other decisions are clear from your spec
  or covered by default policies.
- 2ème accord ou + (step 11) is still deferred per round 8. Items here
  don't touch it.

---

## Q-1 — When `/utilisateurs?email=foo@bar.com` doesn't match any user

After clicking a username link, the page filters to that email. If no user
matches (deleted account, legacy email, typo):

- **A.** Filter the list to nothing and show "Aucun utilisateur trouvé"
  (existing empty state). Clear visual signal that no match exists.
- **B.** Show all users with a toast "Email '…' non trouvé" so the page
  isn't blank.
- **C.** Same as A but also show a small banner at top: "Aucun utilisateur
  ne correspond à l'email '…' — peut-être un compte supprimé."

Recommendation: **C** — silent empty state can confuse if you arrived via
a click; the banner explains why.

Answer:

always show the user, even if the user was deleted, every user i currently have has their names written, and moving forward, the name fields are mandatory and cannot be empty when creating a user account

## Q-2 — Per-slot "Éditer" button: replace empty-state text or add below?

Pending accord/proposition slots currently show italic text
"En attente de chiffrage". When we add a per-slot Éditer button:

- **A.** Replace the "En attente de chiffrage" text entirely with the
  Éditer button (compact, single action affordance).
- **B.** Keep the "En attente de chiffrage" text AND add the Éditer button
  below it (vertical stack — clearer that the slot is awaiting AND
  actionable).

Recommendation: **B** — preserves the status indicator that the slot is
incomplete; the button is then the next step.

Answer:

b

## Freeform notes
