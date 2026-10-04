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

| Token     | Value   | Use                                          |
| --------- | ------- | -------------------------------------------- |
| `moss`    | #1F4D33 | Primary buttons, active tab, home tab circle |
| `leaf`    | #2E6B47 | New-low accents, bars, savings text          |
| `sage`    | #B4C69A | Within-baseline bars, soft fills             |
| `mist`    | #F3F5EE | App background                               |
| `surface` | #FFFFFF | Cards                                        |
| `ink`     | #17271D | Body text                                    |
| `muted`   | #46554B | Secondary text (keep 4.5:1 contrast)         |
| `ember`   | #A84E17 | Offset button and over-limit fill only       |
| `smog`    | #4A3D30 | Over-limit pill                              |

- Fonts: Bricolage Grotesque (display numbers, headings), DM Sans (body), via the @expo-google-fonts packages.
- Radii: 14px buttons, 16px tiles, 20px cards, full pills. Touch targets at least 44px.
- No gradients-as-decoration, no emoji. Scenes are flat layered SVG shapes.

### Screens and routes

Five tabs in a fixed bottom bar, Home in the centre as a raised circle.

| Route      | Screen    | What it shows                                                                                                                 | API                                                                                  |
| ---------- | --------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `/`        | Home      | Scene background by status, big weekly number, status pill, baseline/limit meter, status card, Scan CTA; Offset CTA when over | `GET /dashboard`                                                                     |
| `/scan`    | Scan flow | Capture or upload photo, parsing state, review line items, confirm                                                            | `POST /receipts`, `GET /receipts/:id`, `PATCH .../items/:itemId`, `POST .../confirm` |
| `/stats`   | Stats     | 3 summary tiles, 12-week bar chart coloured by week status, category breakdown                                                | `GET /weeks?limit=12`, `GET /stats/categories`                                       |
| `/swaps`   | Swaps     | Hero swap card, list of smaller swaps, weekly challenge progress                                                              | `GET /swaps`, `POST /swaps/:id/commit`, `GET /challenges/current`                    |
| `/leagues` | Leagues   | Friends / Campus / Global switch, standings ranked by % vs own baseline, invite                                               | `GET /leagues`, `GET /leagues/:id`                                                   |
| `/profile` | Profile   | Avatar, streak tiles, streak rules, offsets, receipt settings                                                                 | `GET /me`, `GET /offsets`                                                            |

Overlays (not routes): `OffsetSheet` (bottom sheet from Home) and `NewLowCelebration` (shown when a closed week sets a new low).

### Home screen states

The API returns `status`: `below` | `within` | `over`. The frontend never computes it.

| Status   | Scene                                                   | Pill                      | Card copy (template)                                                    | Actions                                                         |
| -------- | ------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| `below`  | Lush forest: tall pines framing the number, dark ground | "New personal low" (moss) | "Your lowest week yet. Your new baseline is {total} kg."                | Scan receipt                                                    |
| `within` | Calm plains: rolling hills, soft sun                    | "Within baseline" (sage)  | "You're {headroom} kg under your limit with {daysLeft} days to go."     | Scan receipt                                                    |
| `over`   | Smoggy sky: haze bands, smokestacks, plumes             | "Over limit" (smog)       | "{excess} kg over your limit. Your streak breaks when the week closes." | Offset {excess} kg for ${price} (ember), Scan receipt (outline) |
|          |                                                         |                           |                                                                         |                                                                 |

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
