import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', "'Times New Roman'", 'Times', 'serif'],
        sans: [
          "'Inter'",
          'system-ui',
          '-apple-system',
          "'Segoe UI'",
          'Roboto',
          "'Noto Sans Tamil'",
          'sans-serif',
        ],
        mono: ["'IBM Plex Mono'", "'SF Mono'", 'Menlo', 'monospace'],
      },
      colors: {
        paper: 'var(--paper)',
        surface: 'var(--surface)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        faint: 'var(--faint)',
        line: 'var(--line)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        danger: 'var(--danger)',
        info: 'var(--info)',
      },
      maxWidth: {
        prose: '68ch',
        content: '1120px',
      },
    },
  },
  plugins: [],
};

export default config;
