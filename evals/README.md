# Gemini extraction evals

Purpose: before shipping a prompt change to `/api/scan-document`, `/api/scan-devis`, or `/api/scan-rapport`, run the batch here to see if extraction accuracy regressed.

## Structure

```
evals/
  scan-document/
    fixtures/      → real (anonymized) PDFs/images used as input
    expected/      → matching JSON files with the correct extraction per fixture
    run.ts         → driver script (to be added)
```

Naming convention: `fixtures/mission-wafa-01.pdf` ↔ `expected/mission-wafa-01.json`.

## How to add a fixture

1. Pick a dossier whose scan worked correctly in production.
2. **Anonymize it** — replace real names, CIN, phone numbers, registration plates. Keep the layout intact.
3. Drop the PDF/image in `fixtures/`.
4. Create a matching `.json` in `expected/` with the fields that SHOULD be extracted.

## How a run will work (once `run.ts` lands)

```bash
npx tsx evals/scan-document/run.ts
```

Output:
```
mission-wafa-01.pdf: 28/30 fields correct ✓
mission-rma-02.pdf: 25/30 fields correct ✗ (date_of_loss, policy_number regressed)
─────────
53/60 overall (88%)
```

A prompt change that drops below the baseline should not ship.

## Anonymization checklist

- [ ] Real names replaced
- [ ] Phone numbers replaced
- [ ] CIN numbers replaced
- [ ] Registration plates replaced
- [ ] Dossier reference numbers replaced
- [ ] No real addresses visible
