# GreenGro: Claude Code Build Briefs

Oct 3, 2026 · @Aaron

## How to use this doc

Export the Frontend and Backend briefs as Markdown into your repo (`docs/frontend-brief.md`, `docs/backend-brief.md`), then point Claude Code at one phase at a time. Build the backend stub first: it fixes the API contract the frontend codes against.

- Each brief is self-contained, so Claude Code can read it cold in a fresh session.
- Business rules (baseline, streak, offset) live in the backend only. The frontend renders whatever status the API returns.
- Scope for the hackathon: one demo user, no auth, no real payments, no real receipt OCR yet. Each of these has a stub with a clear seam to replace later.
- I assumed TypeScript on both sides because shared types make Claude Code noticeably more reliable. Swap to plain JS by editing the Stack lines if you prefer.

## Frontend brief

Build GreenGro, a mobile-first web app that turns grocery receipts into a weekly CO₂e score with a streak, using Expo (React Native), TypeScript and Tailwind via NativeWind, tested on a real phone with Expo Go. It talks to the Express stub described in the Backend brief.

### Product in one paragraph

Users scan grocery receipts. Each week gets a total in kg CO₂e. The first week sets a baseline; any later week below it becomes the new baseline (a "new personal low"). A week may finish up to 10% above baseline without breaking the streak. Above that, the streak breaks unless the user buys an offset for the excess, and GreenGro takes a 5% fee on the offset.

### Stack

- Expo + React Native + TypeScript, Expo Router for tabs, Tailwind classes via NativeWind for all styling.
- Test on a real phone with Expo Go (`npx expo start`, scan the QR code). The same code runs in the browser with `npx expo start --web` for quick checks and screenshots.
- Data fetching with plain `fetch` wrapped in a small typed API client (`src/api/client.ts`); TanStack Query is optional if you want caching.
- Graphics and icons: `react-native-svg` for the scenes, `lucide-react-native` or inline SVG for icons. No component library.
- API base URL from `EXPO_PUBLIC_API_URL`. On a phone, `localhost` is the phone itself, so use your laptop's LAN IP (for example `http://192.168.x.x:4000/api`).

### Design system

Minimal, eco aesthetic. Mobile frame: max width 430px, centred on desktop with the page background around it.

| Token | Value | Use |
| --- | --- | --- |
| `moss` | #1F4D33 | Primary buttons, active tab, home tab circle |
| `leaf` | #2E6B47 | New-low accents, bars, savings text |
| `sage` | #B4C69A | Within-baseline bars, soft fills |
| `mist` | #F3F5EE | App background |
| `surface` | #FFFFFF | Cards |
| `ink` | #17271D | Body text |
| `muted` | #46554B | Secondary text (keep 4.5:1 contrast) |
| `ember` | #A84E17 | Offset button and over-limit fill only |
| `smog` | #4A3D30 | Over-limit pill |

- Fonts: Bricolage Grotesque (display numbers, headings), DM Sans (body), via the @expo-google-fonts packages.
- Radii: 14px buttons, 16px tiles, 20px cards, full pills. Touch targets at least 44px.
- No gradients-as-decoration, no emoji. Scenes are flat layered SVG shapes.

### Screens and routes

Five tabs in a fixed bottom bar, Home in the centre as a raised circle.

| Route | Screen | What it shows | API |
| --- | --- | --- | --- |
| `/` | Home | Scene background by status, big weekly number, status pill, baseline/limit meter, status card, Scan CTA; Offset CTA when over | `GET /dashboard` |
| `/scan` | Scan flow | Capture or upload photo, parsing state, review line items, confirm | `POST /receipts`, `GET /receipts/:id`, `PATCH .../items/:itemId`, `POST .../confirm` |
| `/stats` | Stats | 3 summary tiles, 12-week bar chart coloured by week status, category breakdown | `GET /weeks?limit=12`, `GET /stats/categories` |
| `/swaps` | Swaps | Hero swap card, list of smaller swaps, weekly challenge progress | `GET /swaps`, `POST /swaps/:id/commit`, `GET /challenges/current` |
| `/leagues` | Leagues | Friends / Campus / Global switch, standings ranked by % vs own baseline, invite | `GET /leagues`, `GET /leagues/:id` |
| `/profile` | Profile | Avatar, streak tiles, streak rules, offsets, receipt settings | `GET /me`, `GET /offsets` |

Overlays (not routes): `OffsetSheet` (bottom sheet from Home) and `NewLowCelebration` (shown when a closed week sets a new low).

### Home screen states

The API returns `status`: `below` | `within` | `over`. The frontend never computes it.

| Status | Scene | Pill | Card copy (template) | Actions |
| --- | --- | --- | --- | --- |
| `below` | Lush forest: tall pines framing the number, dark ground | "New personal low" (moss) | "Your lowest week yet. Your new baseline is {total} kg." | Scan receipt |
| `within` | Calm plains: rolling hills, soft sun | "Within baseline" (sage) | "You're {headroom} kg under your limit with {daysLeft} days to go." | Scan receipt |
| `over` | Smoggy sky: haze bands, smokestacks, plumes | "Over limit" (smog) | "{excess} kg over your limit. Your streak breaks when the week closes." | Offset {excess} kg for ${price} (ember), Scan receipt (outline) |
|  |  |  |  |  |

Meter: track from 0 to `max(limit, total) × 1.25`; fill to `total`; tick at `baseline`; lighter tick at `limit`; legend "Baseline X kg · Limit Y kg (+10%)".

### Key flows

1. **Scan:** `expo-image-picker` opens the camera or photo library → upload as multipart → skeleton while parsing → review list (name, category, kg CO₂e, confidence). Items under 0.7 confidence show a category picker to correct. Confirm updates the dashboard and returns to Home.
2. **Offset:** Offset CTA → `POST /offsets/quote` with the excess → sheet shows offset cost, 5% fee, total → confirm calls `POST /offsets` → Home shows the streak saved. "Let the streak end" just closes the sheet.
3. **New low:** after `POST /weeks/current/close` returns `newLow: true`, show the celebration overlay, then Home in the forest state.
4. **Demo controls:** a hidden dev panel (long-press the logo) calling `/dev/simulate` and `/dev/reset`, so the demo can flip between forest, plains and smog on stage.

### Folder structure

```
apps/web/
  app/              Expo Router screens: (tabs)/_layout.tsx, (tabs)/index.tsx (Home), stats, swaps, leagues, profile; scan.tsx
  src/api/          client.ts, types.ts (mirror backend types)
  src/components/   TabBar, Scene (Forest|Plains|Smog), BigNumber, StatusPill, Meter, StatusCard, Sheet, Tile, BarChart, CategoryBars
  src/features/     home/, scan/, stats/, swaps/, leagues/, profile/, offset/, dev/
```

### Acceptance checklist

- [ ] All five tabs render with seed data from the stub API; no hardcoded numbers in components
- [ ] Home switches scene, pill, copy and actions correctly for all three statuses
- [ ] Scan flow works end to end with the stub parser on a real phone, including correcting a low-confidence item
- [ ] Offset sheet shows cost, 5% fee and total from the quote endpoint, and confirming keeps the streak
- [ ] Dev panel flips Home between states for the demo
- [ ] Runs in Expo Go on a phone and in the browser via the web target; `npx tsc --noEmit` passes

Out of scope: auth, real payments, offline support, app store release.

## Backend brief

Build a stub REST API for GreenGro in Express + TypeScript with an in-memory store seeded with realistic demo data. Every route the frontend needs must exist and return correctly shaped data; the only real logic is the weekly scoring, baseline, streak and offset rules.

### Stack

- Node 20, Express, TypeScript, `zod` for request validation, `cors`, `multer` for receipt uploads (memory storage).
- In-memory store (`src/store.ts`) seeded on boot from `src/seed.ts`; `POST /api/dev/reset` re-seeds.
- One demo user (`u_demo`). No auth; every request acts as that user.
- Port from `PORT` (default 4000), bound to 0.0.0.0 so a phone on the same Wi-Fi can reach it; all routes under `/api`.
- Tests: `vitest` + `supertest`.

### Data models

| Model | Key fields |
| --- | --- |
| `User` | id, name, initials, createdAt, settings { units, notifications } |
| `Week` | id, startDate, endDate, totalKg, baselineAtClose, limitAtClose, status (`below` / `within` / `over`), outcome (`new_low` / `kept` / `offset` / `broken` / `open`), closed |
| `StreakState` | current, best, baselineKg, savesUsed |
| `Receipt` | id, weekId, store, uploadedAt, status (`processing` / `ready` / `confirmed`), items\[\] |
| `LineItem` | id, rawText, name, categoryId, quantity, massKg, kgCo2e, confidence (0–1) |
| `Category` | id, name, group (Meat & fish, Dairy & eggs, Produce, Grains & bakery, Snacks & drinks), kgCo2ePerKg |
| `Swap` | id, fromName, toName, context, savingKg, committed |
| `Challenge` | id, title, target, progress, endsAt |
| `OffsetQuote` | id, kg, costCents, feeCents, totalCents, provider, project, expiresAt |
| `Offset` | id, quoteId, weekId, kg, totalCents, createdAt |
| `League` | id, name, kind (`friends` / `campus` / `global`), inviteCode, members\[\] { userId, name, initials, streak, pctVsBaseline } |

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

| Method | Path | Purpose | Stub behaviour |
| --- | --- | --- | --- |
| GET | `/api/health` | Liveness | `{ ok: true }` |
| GET | `/api/me` | Profile, streak state, baseline | From store |
| PATCH | `/api/me/settings` | Update settings | Validates and saves |
| GET | `/api/dashboard` | Home: total, baseline, limit, status, headroom or excess, streak, daysLeft | Computed from the open week via scoring module |
| POST | `/api/receipts` | Upload a receipt image (multipart `image`) | Returns `{ id, status: "processing" }`; becomes `ready` after \~1.5 s |
| GET | `/api/receipts` | List receipts, optional `?weekId=` | From store |
| GET | `/api/receipts/:id` | Receipt with parsed line items | Canned items from `src/stubs/parser.ts` |
| PATCH | `/api/receipts/:id/items/:itemId` | Correct category or quantity | Recomputes kgCo2e from category factor |
| POST | `/api/receipts/:id/confirm` | Add receipt to the open week | Updates week total; returns new dashboard |
| DELETE | `/api/receipts/:id` | Remove a receipt | Recomputes week total |
| GET | `/api/categories` | Category taxonomy with emission factors | From `src/data/categories.json` |
| GET | `/api/weeks?limit=12` | Week history with status and outcome | From store, newest first |
| GET | `/api/weeks/current` | Open week detail | From store |
| POST | `/api/weeks/current/close` | Close the week and apply streak rules | Returns `{ week, streak, newLow, outcome }` |
| GET | `/api/stats/categories?weeks=12` | Average weekly kg by category group | Aggregated from line items |
| GET | `/api/swaps` | Suggested swaps from recent receipts | Canned list ranked by savingKg |
| POST | `/api/swaps/:id/commit` | Add a swap to this week | Sets `committed: true` |
| GET | `/api/challenges/current` | This week's challenge | From store |
| POST | `/api/challenges/:id/progress` | Increment progress | Caps at target |
| POST | `/api/offsets/quote` | Quote an offset for the current excess | Rules above; 400 if not over limit |
| POST | `/api/offsets` | Purchase a quote (`{ quoteId }`) | Records offset; marks week as covered; no real payment |
| GET | `/api/offsets` | Offset history and totals | From store |
| GET | `/api/leagues` | Leagues the user is in, by kind | From store |
| GET | `/api/leagues/:id` | Standings, ranked by pctVsBaseline ascending | Sorted from store |
| POST | `/api/leagues` | Create a league | Returns invite code |
| POST | `/api/leagues/join` | Join with `{ inviteCode }` | Adds demo user |
| POST | `/api/dev/simulate` | Force the open week into `{ status: "below" \| "within" \| "over" }` | Rewrites open-week items to hit the target |
| POST | `/api/dev/reset` | Re-seed everything | Restores seed data |

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

## Claude Code setup tips

The biggest wins: one focused session per phase, plan before code, and a check Claude can run itself (tests, typecheck, screenshots). Context is the scarce resource; performance drops as a session fills up, so clear often and keep specs in files rather than in chat.

### One-time setup

1. Create the repo yourself: `greengro/` with `apps/api`, `apps/web`, `docs/` (put both briefs here), then `git init` and a first commit.
2. Run `/init` in the repo root to generate a starter `CLAUDE.md`, then cut it down to what Claude can't guess. Example below.
3. Pre-approve safe commands (`npm run *`, `npx tsc`, `git add`, `git commit`) with `/permissions` so you're not clicking through prompts. Newer versions also offer auto mode, where a classifier blocks only risky actions.
4. Install the `gh` CLI if you'll push to GitHub; Claude uses it directly.

```markdown
# GreenGro
Monorepo: apps/api (Express + TS), apps/web (Expo + React Native + NativeWind).
Specs: @docs/backend-brief.md and @docs/frontend-brief.md are the source of truth.

# Commands
- api: cd apps/api && npm run dev | npm test | npx tsc --noEmit
- web: cd apps/web && npx expo start (scan QR in Expo Go) | npx expo start --web | npx tsc --noEmit

# Rules
- Business rules live only in apps/api/src/domain/scoring.ts. The app never computes status.
- Keep apps/web/src/api/types.ts in sync with apps/api/src/domain/types.ts.
- Phone testing: EXPO_PUBLIC_API_URL must use the laptop's LAN IP, not localhost.
- Ask before adding a dependency not named in the briefs.
- After a change: run typecheck and tests, and show the output.
```

### The loop for each phase

1. **Fresh session.** `/clear` (or a new terminal) and `/rename` it after the phase, e.g. `api-scoring`.
2. **Plan mode.** Press Shift+Tab until it shows plan mode. Prompt: "Read @docs/backend-brief.md. Plan phase 1 only: domain types, scoring.ts and its tests. List files and the test cases." Edit the plan with Ctrl+G if needed, then approve.
3. **Implement with a check.** "Implement the plan. Run `npm test` and `npx tsc --noEmit`, fix failures, and paste the final output."
4. **Review.** Run `/code-review`, or: "Use a subagent to check this diff against the acceptance checklist in the brief. Report only gaps that affect correctness."
5. **Commit.** "Commit with a descriptive message." Checkpoints only cover Claude's file edits, so git is your real safety net.

### Suggested phase order

1. API: types + `scoring.ts` + unit tests (the only logic that must be right).
2. API: store, seed data, all routes, `/dev/simulate`; verify with `curl` against each route.
3. Web: Expo + NativeWind setup (confirm it loads in Expo Go), design tokens, tab bar, routing shell.
4. Web: Home with the three scenes, wired to `/dashboard` and the dev panel.
5. Web: Scan flow, then Offset sheet.
6. Web: Stats, Swaps, Leagues, Profile.
7. End-to-end pass: run both apps, click through the demo script, fix rough edges.

Once phase 2 is committed, the API contract is stable, so you can run a second session in a git worktree on the frontend while the first polishes the API.

### Habits that save hours

- **Show, don't describe the UI.** Export the mockup artboards as images and paste them in: "Implement this screen. Run the web target, screenshot the result, compare with the mockup, list differences and fix them."
- **Interrupt early.** Esc stops Claude mid-action; Esc twice or `/rewind` restores earlier code and conversation.
- **Two strikes rule.** If you've corrected the same thing twice, `/clear` and rewrite the prompt with what you learned. A clean session beats a polluted one.
- **Reference files with @** instead of pasting them, and use `/context` to see what's eating your window.
- **Keep scope tight.** Say "stub only" and "no auth" explicitly; agents happily over-build.
- **Resume, don't restart.** `claude --continue` picks up the last session after a break.

Source: [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices) (official docs).
