/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366f1',
          foreground: '#ffffff',
        },
        panel: {
          DEFAULT: 'rgba(24, 28, 37, 0.68)',
          border: 'rgba(99,102,241,0.16)'
        },
        surface: {
          DEFAULT: '#0b0f16',
        },
        text: {
          DEFAULT: '#e0e7ef',
          muted: '#a3aed6'
        },
      },
      boxShadow: {
        panel: '0 8px 32px rgba(30,41,59,0.45)',
        soft: '0 4px 24px rgba(99,102,241,0.25)'
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      }
    },
  },
  plugins: [],
}
