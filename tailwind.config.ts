import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './src/**/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        line: 'var(--line)',
        text: 'var(--text)',
        dim: 'var(--dim)',
        accent: 'var(--accent)',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        'roboto-flex': ['"Roboto Flex"', 'sans-serif'],
        'bricolage-grotesque': ['"Bricolage Grotesque"', 'sans-serif'],
        fraunces: ['Fraunces', 'serif'],
        anybody: ['Anybody', 'sans-serif'],
        'instrument-serif': ['"Instrument Serif"', 'serif'],
        'jetbrains-mono': ['"JetBrains Mono"', 'monospace'],
        'archivo-expanded': ['"Archivo Expanded"', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
