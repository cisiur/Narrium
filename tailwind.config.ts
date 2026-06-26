import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#121417',
          800: '#252a31',
          600: '#4d5662',
        },
        parchment: {
          50: '#fbfaf7',
          100: '#f1eee7',
        },
        accent: {
          500: '#2f7d73',
          600: '#26665e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
