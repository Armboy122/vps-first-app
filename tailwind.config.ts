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
          25: "#fdfdff", // Ultra light purple
          50: "#faf5ff", // Very light purple
          100: "#f3e8ff", // Light purple
          200: "#e9d5ff", // Lighter purple
          300: "#d8b4fe", // Light purple
          400: "#c084fc", // Medium purple
          500: "#9333ea", // PEA main purple
          600: "#7c3aed", // Darker purple
          700: "#6d28d9", // Dark purple
          800: "#5b21b6", // Very dark purple
          900: "#4c1d95", // Darkest purple
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
        pea: ["Inter", "Sarabun", "sans-serif"],
      },
      boxShadow: {
        pea: "0 4px 20px rgba(147, 51, 234, 0.15)",
        "pea-lg": "0 10px 40px rgba(147, 51, 234, 0.2)",
      },
    },
  },
  plugins: [],
};
export default config;
