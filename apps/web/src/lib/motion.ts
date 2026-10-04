import { Easing, FadeInUp } from "react-native-reanimated";

// Shared "gentle ease-in" entrance: a short fade paired with a subtle
// upward slide, applied per-section with a small stagger so a screen's
// cards settle into place in sequence rather than popping in all at once.

const DURATION_MS = 420;
const STAGGER_MS = 60;
const SLIDE_OFFSET = 14;

export function revealEntrance(index = 0) {
  return FadeInUp.duration(DURATION_MS)
    .delay(index * STAGGER_MS)
    .easing(Easing.out(Easing.ease))
    .withInitialValues({ opacity: 0, translateY: SLIDE_OFFSET });
}
