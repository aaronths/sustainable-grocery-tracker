## Backend brief

Build a stub REST API for GreenGro in Express + TypeScript with an in-memory store seeded with realistic demo data. Every route the frontend needs must exist and return correctly shaped data; the only real logic is the weekly scoring, baseline, streak and offset rules.

### Stack

- Node 20, Express, TypeScript, `zod` for request validation, `cors`, `multer` for receipt uploads (memory storage).
- In-memory store (`src/store.ts`) seeded on boot from `src/seed.ts`; `POST /api/dev/reset` re-seeds.
- One demo user (`u_demo`). No auth; every request acts as that user.
- Port from `PORT` (default 4000), bound to 0.0.0.0 so a phone on the same Wi-Fi can reach it; all routes under `/api`.
- Tests: `vitest` + `supertest`.

### Data models

| Model         | Key fields                                                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`        | id, name, initials, createdAt, settings { units, notifications }                                                                                                          |
| `Week`        | id, startDate, endDate, totalKg, baselineAtClose, limitAtClose, status (`below` / `within` / `over`), outcome (`new_low` / `kept` / `offset` / `broken` / `open`), closed |
| `StreakState` | current, best, baselineKg, savesUsed                                                                                                                                      |
| `Receipt`     | id, weekId, store, uploadedAt, status (`processing` / `ready` / `confirmed`), items\[\]                                                                                   |
| `LineItem`    | id, rawText, name, categoryId, quantity, massKg, kgCo2e, confidence (0–1)                                                                                                 |
| `Category`    | id, name, group (Meat & fish, Dairy & eggs, Produce, Grains & bakery, Snacks & drinks), kgCo2ePerKg                                                                       |
| `Swap`        | id, fromName, toName, context, savingKg, committed                                                                                                                        |
| `Challenge`   | id, title, target, progress, endsAt                                                                                                                                       |
| `OffsetQuote` | id, kg, costCents, feeCents, totalCents, provider, project, expiresAt                                                                                                     |
| `Offset`      | id, quoteId, weekId, kg, totalCents, createdAt                                                                                                                            |
| `League`      | id, name, kind (`friends` / `campus` / `global`), inviteCode, members\[\] { userId, name, initials, streak, pctVsBaseline }                                               |

Store money as integer cents and mass as kg with one decimal in responses.

### Business rules (the only real logic)

- **Baseline:** the first closed week's total. When a week closes below the current baseline, that total becomes the new baseline and the outcome is `new_low`.
- **Limit:** `baseline × 1.10`.
- **Status of the open week:** `below` if total < baseline; `within` if baseline ≤ total ≤ limit; `over` if total > limit.
- **Closing a week:** `new_low` or `kept` → streak + 1. `over` with an offset covering the excess → `offset`, streak + 1, savesUsed + 1. `over` without one → `broken`, streak resets to 0. Best streak updates.
- **Offset quote:** `excessKg = total − limit`; `costCents = round(excessKg / 1000 × OFFSET_PRICE_PER_TONNE_CENTS)`; `feeCents = round(costCents × 0.05)`; total = cost + fee. Price per tonne comes from an env var (default 4000 cents = $40/t). Quotes expire after 15 minutes.
- **Week window:** Monday to Sunday in the user's timezone (hardcode `America/Detroit` for the demo).

Keep these in one pure module (`src/domain/scoring.ts`) with no Express imports, so they can be unit tested and changed in one place (for example, if the baseline rule moves to a rolling average).

### Routes

| Method | Path                              | Purpose                                                                    | Stub behaviour                                                        |
| ------ | --------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| GET    | `/api/health`                     | Liveness                                                                   | `{ ok: true }`                                                        |
| GET    | `/api/me`                         | Profile, streak state, baseline                                            | From store                                                            |
| PATCH  | `/api/me/settings`                | Update settings                                                            | Validates and saves                                                   |
| GET    | `/api/dashboard`                  | Home: total, baseline, limit, status, headroom or excess, streak, daysLeft | Computed from the open week via scoring module                        |
| POST   | `/api/receipts`                   | Upload a receipt image (multipart `image`)                                 | Returns `{ id, status: "processing" }`; becomes `ready` after \~1.5 s |
| GET    | `/api/receipts`                   | List receipts, optional `?weekId=`                                         | From store                                                            |
| GET    | `/api/receipts/:id`               | Receipt with parsed line items                                             | Canned items from `src/stubs/parser.ts`                               |
| PATCH  | `/api/receipts/:id/items/:itemId` | Correct category or quantity                                               | Recomputes kgCo2e from category factor                                |
| POST   | `/api/receipts/:id/confirm`       | Add receipt to the open week                                               | Updates week total; returns new dashboard                             |
| DELETE | `/api/receipts/:id`               | Remove a receipt                                                           | Recomputes week total                                                 |
| GET    | `/api/categories`                 | Category taxonomy with emission factors                                    | From `src/data/categories.json`                                       |
| GET    | `/api/weeks?limit=12`             | Week history with status and outcome                                       | From store, newest first                                              |
| GET    | `/api/weeks/current`              | Open week detail                                                           | From store                                                            |
| POST   | `/api/weeks/current/close`        | Close the week and apply streak rules                                      | Returns `{ week, streak, newLow, outcome }`                           |
| GET    | `/api/stats/categories?weeks=12`  | Average weekly kg by category group                                        | Aggregated from line items                                            |
| GET    | `/api/swaps`                      | Suggested swaps from recent receipts                                       | Canned list ranked by savingKg                                        |
| POST   | `/api/swaps/:id/commit`           | Add a swap to this week                                                    | Sets `committed: true`                                                |
| GET    | `/api/challenges/current`         | This week's challenge                                                      | From store                                                            |
| POST   | `/api/challenges/:id/progress`    | Increment progress                                                         | Caps at target                                                        |
| POST   | `/api/offsets/quote`              | Quote an offset for the current excess                                     | Rules above; 400 if not over limit                                    |
| POST   | `/api/offsets`                    | Purchase a quote (`{ quoteId }`)                                           | Records offset; marks week as covered; no real payment                |
| GET    | `/api/offsets`                    | Offset history and totals                                                  | From store                                                            |
| GET    | `/api/leagues`                    | Leagues the user is in, by kind                                            | From store                                                            |
| GET    | `/api/leagues/:id`                | Standings, ranked by pctVsBaseline ascending                               | Sorted from store                                                     |
| POST   | `/api/leagues`                    | Create a league                                                            | Returns invite code                                                   |
| POST   | `/api/leagues/join`               | Join with `{ inviteCode }`                                                 | Adds demo user                                                        |
| POST   | `/api/dev/simulate`               | Force the open week into `{ status: "below" \| "within" \| "over" }`       | Rewrites open-week items to hit the target                            |
| POST   | `/api/dev/reset`                  | Re-seed everything                                                         | Restores seed data                                                    |

Errors use one shape: `{ "error": { "code": "NOT_OVER_LIMIT", "message": "..." } }` with a matching HTTP status.

### Seed data

Twelve closed weeks matching the mockups: 36.2, 34.8, 35.9, 33.5, 33.0, 31.8, 32.4, 33.6, 32.0, 37.2 (offset), 33.1, 28.4 kg; current baseline 28.4 kg, streak 12, best streak 17, one save used. An open week at 33.1 kg with three receipts. One friends league with five members. About 40 categories with factors taken from the Poore & Nemecek (2018) dataset via Our World in Data.

### Seams for later

- `src/stubs/parser.ts` exports `parseReceipt(image: Buffer): Promise<LineItem[]>`. Replace the canned implementation with the real extraction and category-resolution pipeline without touching routes.
- `src/stubs/offsetProvider.ts` exports `purchaseOffset(quote)`. Swap in a real provider API later.

### Folder structure

```
apps/api/src/
  index.ts            app setup, cors, json, error handler
  routes/             me, dashboard, receipts, weeks, stats, swaps, challenges, offsets, leagues, dev
  domain/scoring.ts   baseline, limit, status, close-week, offset quote (pure functions)
  domain/types.ts     shared types (copy to apps/web/src/api/types.ts)
  store.ts, seed.ts
  stubs/              parser.ts, offsetProvider.ts
  data/categories.json
  tests/scoring.test.ts, tests/routes.test.ts
```

### Acceptance checklist

- [ ] Every route in the table responds with typed, validated data
- [ ] `scoring.test.ts` covers: first week sets baseline, new low resets baseline, exactly +10% is within, above +10% is over, offset keeps streak, no offset breaks streak, fee rounding
- [ ] `/dev/simulate` produces each of the three Home states
- [ ] `npm test` and `tsc --noEmit` pass; `npm run dev` starts with seed data loaded
