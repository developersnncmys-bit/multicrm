/** @type {import('tailwindcss').Config} */
const shade = (n) => `rgb(var(--brand-${n}) / <alpha-value>)`;
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"] },
      colors: {
        brand: { 50: shade(50), 100: shade(100), 200: shade(200), 300: shade(300), 400: shade(400), 500: shade(500), 600: shade(600), 700: shade(700), 800: shade(800), 900: shade(900) },
      },
      boxShadow: {
        card: "0 1px 2px rgb(16 24 40 / 0.05)",
        pop: "0 12px 32px -8px rgb(16 24 40 / 0.18), 0 4px 8px -4px rgb(16 24 40 / 0.08)",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(8px) scale(.98)" }, to: { opacity: 1, transform: "none" } },
        slideLeft: { from: { transform: "translateX(100%)" }, to: { transform: "none" } },
      },
      animation: { fadeIn: "fadeIn .15s ease-out", slideUp: "slideUp .18s ease-out", slideLeft: "slideLeft .22s cubic-bezier(.2,.8,.2,1)" },
    },
  },
  plugins: [],
};
