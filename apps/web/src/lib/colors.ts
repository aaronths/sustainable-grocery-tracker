// Mirrors the color tokens in tailwind.config.js. NativeWind's className
// interop doesn't reach react-native-svg primitives, so SVG scenes and chart
// fills need these as literal values.
export const colors = {
  moss: "#1F4D33",
  leaf: "#2E6B47",
  sage: "#B4C69A",
  mist: "#F3F5EE",
  surface: "#FFFFFF",
  ink: "#17271D",
  muted: "#46554B",
  ember: "#A84E17",
  smog: "#4A3D30",
  amber: "#C99A2E",
  orange: "#C2672B",
  maroon: "#7A2320",
} as const;

export type ColorToken = keyof typeof colors;
