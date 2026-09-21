import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111009",
        deep: "#111009",
        primary: "#FFC400",
        paper: "#F7F1E7",
        muted: "#6a6055",
        line: "#d2c5b2",
        moss: "#394236",
        clay: "#a06d52"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Lora", "Georgia", "serif"]
      },
      boxShadow: {
        soft: "0 24px 80px rgba(23, 23, 23, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
