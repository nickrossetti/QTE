import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0B1F4B",
        "navy-ink": "#071533",
        royal: "#1F4FD1",
        "royal-dark": "#173ea8",
        mist: "#f4f6fb",
        line: "#d5deee",
      },
      fontFamily: {
        sans: ['"Source Sans 3"', '"Liberation Sans"', "sans-serif"],
        display: ['"Barlow Condensed"', '"Arial Narrow"', "sans-serif"],
      },
      boxShadow: {
        card: "0 16px 50px rgba(11, 31, 75, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
