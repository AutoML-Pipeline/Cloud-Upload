import defaultTheme from "tailwindcss/defaultTheme";
import animate from "tailwindcss-animate";

// Tailwind CSS configuration
// - Modern color palette with primary, secondary, and accent (with usable shades)
// - Clean sans-serif font stack
// - Consistent spacing scale (named sizes added without overriding Tailwind defaults)
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors with shades for flexibility
        primary: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
          DEFAULT: "#6366f1",
          foreground: "#ffffff",
        },
        secondary: {
          50:  "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
          DEFAULT: "#0ea5e9",
          foreground: "#ffffff",
        },
        accent: {
          50:  "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
          DEFAULT: "#10b981",
          foreground: "#0b0f16",
        },

        // Existing custom tokens used throughout the app
        panel: {
          DEFAULT: "rgba(24, 28, 37, 0.68)",
          border: "rgba(99,102,241,0.16)",
        },
        surface: { DEFAULT: "#0b0f16" },
        text: { DEFAULT: "#e0e7ef", muted: "#a3aed6" },
      },

      fontFamily: {
        // Clean, modern sans-serif stack (no font files required by default)
        sans: [
          "Inter",
          "Poppins",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "Noto Sans",
          ...defaultTheme.fontFamily.sans,
        ],
      },

      // Add named spacing tokens while preserving Tailwind's numeric scale
      spacing: {
        xs: "0.5rem",   // 8px
        sm: "0.75rem",  // 12px
        md: "1rem",     // 16px
        lg: "1.5rem",   // 24px
        xl: "2rem",     // 32px
        "2xl": "3rem", // 48px
        "3xl": "4rem", // 64px
      },

      boxShadow: {
        panel: "0 8px 32px rgba(30,41,59,0.45)",
        soft: "0 4px 24px rgba(99,102,241,0.25)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-in-out',
      },
    },
  },
  plugins: [animate],
};
