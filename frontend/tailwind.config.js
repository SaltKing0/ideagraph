/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#09090b",              // sehr dunkel
        surface: "#111113",         // dunkelgrau mit Blau-Stich
        card: "#18181b",            // Karten
        panel: "#1e1e21",
        border: "#27272a",          // sehr subtil
        muted: "#a1a1aa",           // body text
        heading: "#fafafa",         // headings
        accent: "#6366f1",          // Indigo lebendig
        accent2: "#8b5cf6",         // Violett
        accentSoft: "rgba(99,102,241,0.12)",
      },
      fontFamily: {
        sans: ["Inter", "Geist", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Geist Mono", "monospace"],
        display: ["Inter", "Geist", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03) inset",
        cardHover: "0 4px 24px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05) inset",
        glow: "0 0 20px rgba(99,102,241,0.35)",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "16px",
      },
      animation: {
        "fade-in": "fadeIn 300ms ease-out",
        "slide-up": "slideUp 300ms ease-out",
        "skeleton": "skeleton 1.6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        skeleton: { "0%,100%": { opacity: "0.6" }, "50%": { opacity: "0.3" } },
      },
    },
  },
  plugins: [],
}
