/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        moss: "#1F4D33",
        leaf: "#2E6B47",
        sage: "#B4C69A",
        mist: "#F3F5EE",
        surface: "#FFFFFF",
        ink: "#17271D",
        muted: "#46554B",
        ember: "#A84E17",
        smog: "#4A3D30",
      },
      fontFamily: {
        display: ["BricolageGrotesque_700Bold"],
        "display-medium": ["BricolageGrotesque_500Medium"],
        body: ["DMSans_400Regular"],
        "body-medium": ["DMSans_500Medium"],
      },
      borderRadius: {
        btn: "14px",
        tile: "16px",
        card: "20px",
      },
    },
  },
  plugins: [],
};
