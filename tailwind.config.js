/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Per-portal accent — driven by CSS variables so each of the three
        // portals re-themes as if it were its own product. Channels (not hex)
        // so Tailwind opacity modifiers still work.
        accent: {
          50: 'rgb(var(--c-accent-50) / <alpha-value>)',
          100: 'rgb(var(--c-accent-100) / <alpha-value>)',
          200: 'rgb(var(--c-accent-200) / <alpha-value>)',
          500: 'rgb(var(--c-accent-500) / <alpha-value>)',
          600: 'rgb(var(--c-accent-600) / <alpha-value>)',
          700: 'rgb(var(--c-accent-700) / <alpha-value>)',
          800: 'rgb(var(--c-accent-800) / <alpha-value>)',
          900: 'rgb(var(--c-accent-900) / <alpha-value>)',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
        pop: '0 10px 30px rgba(15, 23, 42, 0.12)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        'slide-in': { from: { opacity: 0, transform: 'translateX(12px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        ping2: { '75%, 100%': { transform: 'scale(2)', opacity: 0 } },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
        ping2: 'ping2 1.4s cubic-bezier(0,0,0.2,1) infinite',
      },
    },
  },
  plugins: [],
}
