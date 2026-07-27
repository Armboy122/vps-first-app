import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pea: {
          25: "#f8fbf9",
          50: "#f1f7f3",
          100: "#eaf3ed",
          200: "#d3e5d9",
          300: "#a9cdb5",
          400: "#75aa87",
          500: "#4b8964",
          600: "#2f7554",
          700: "#245d42",
          800: "#1b4933",
          900: "#143827",
        },
        "pea-accent": {
          50: "#f0f9ff", // Light blue accent
          100: "#e0f2fe", // Light blue
          200: "#bae6fd", // Medium light blue
          300: "#7dd3fc", // Medium blue
          400: "#38bdf8", // Blue
          500: "#0ea5e9", // Main blue accent
          600: "#0284c7", // Darker blue
          700: "#0369a1", // Dark blue
          800: "#075985", // Very dark blue
          900: "#0c4a6e", // Darkest blue
        },
      },
      fontFamily: {
        pea: ["var(--font-sans)", "IBM Plex Sans Thai", "sans-serif"],
      },
      boxShadow: {
        pea: "0 1px 3px rgba(20, 56, 39, 0.14)",
        "pea-lg": "0 6px 18px rgba(20, 56, 39, 0.18)",
      },
    },
  },
  plugins: [],
};
export default config;
