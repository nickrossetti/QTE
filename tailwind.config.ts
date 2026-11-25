import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0D1D36",
        "navy-ink": "#071533",
        royal: "#0040A9",
        "royal-dark": "#00348a",
        mist: "#EEF2F8",
        line: "#D5DCE8",
        go: "#11823B",
      },
      fontFamily: {
        sans: ['"Barlow"', "system-ui", "sans-serif"],
        display: ['"Barlow Condensed"', '"Arial Narrow"', "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(13, 29, 54, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
