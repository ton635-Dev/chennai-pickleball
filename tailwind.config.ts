import type { Config } from "tailwindcss";

// デザイン指針(仕様書 第10章)のカラートークンをそのまま反映
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F4F7F5",
        surface: "#FFFFFF",
        ink: "#14211C",
        muted: "#5F6E67",
        line: "#E2EAE5",
        primary: {
          DEFAULT: "#0E7C63",
          dark: "#0A5C4A",
        },
        accent: "#D8EC3F",
        navy: "#122B33",
        navy2: "#0C1F26",
        amber: "#E8A93C",
        gray: {
          DEFAULT: "#9AA8A2",
        },
      },
      fontFamily: {
        sans: [
          "'Hiragino Kaku Gothic ProN'",
          "'Noto Sans JP'",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "16px",
        pill: "999px",
      },
      maxWidth: {
        app: "1180px",
      },
    },
  },
  plugins: [],
};

export default config;
