import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        wf: {
          ink: 'var(--wf-ink)',
          'ink-2': 'var(--wf-ink-2)',
          'ink-3': 'var(--wf-ink-3)',
          separator: 'var(--wf-separator)',
          border: 'var(--wf-border)',
          surface: 'var(--wf-surface)',
          'surface-sunken': 'var(--wf-surface-sunken)',
          'surface-raised': 'var(--wf-surface-raised)',
          accent: 'var(--wf-accent)',
          'accent-press': 'var(--wf-accent-press)',
          'accent-wash': 'var(--wf-accent-wash)',
          danger: 'var(--wf-danger)',
          'danger-wash': 'var(--wf-danger-wash)',
          warn: 'var(--wf-warn)',
          done: 'var(--wf-done)',
        },
      },
      borderRadius: {
        control: 'var(--wf-r-control)',
        card: 'var(--wf-r-card)',
        sheet: 'var(--wf-r-sheet)',
      },
      boxShadow: {
        card: 'var(--wf-shadow-card)',
      },
    },
  },
} satisfies Config
