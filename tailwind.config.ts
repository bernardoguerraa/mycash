import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#09090b',
          1: '#0c0d10',
          2: '#111318',
          3: '#16181d',
          4: '#1c1f26',
        },
        edge: {
          1: 'rgba(255,255,255,0.06)',
          2: 'rgba(255,255,255,0.09)',
          3: 'rgba(255,255,255,0.12)',
          4: 'rgba(255,255,255,0.18)',
        },
        accent: {
          DEFAULT: '#10b981',
          light: '#34d399',
          dark: '#059669',
          muted: 'rgba(16,185,129,0.12)',
        },
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-up': 'fade-up 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        shimmer: 'shimmer 2s infinite',
      },
    },
  },
  plugins: [],
};
export default config;
