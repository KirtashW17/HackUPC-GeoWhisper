module.exports = {
  content: [
    './public/*.html',
    './app/helpers/**/*.rb',
    './app/javascript/**/*.js',
    './app/views/**/*.{erb,haml,html,slim}'
  ],
  theme: {
    extend: {
      colors: {
        bg:         '#f5efe4',
        'bg-deep':  '#ede5d4',
        card:       '#fffaf0',
        'card-edge': 'rgba(60, 40, 20, 0.08)',
        ink:        '#2a2118',
        'ink-soft': 'rgba(42, 33, 24, 0.62)',
        'ink-faint': 'rgba(42, 33, 24, 0.32)',
        accent:     '#b6552c',
        'accent-soft': '#e8c8a8',
        ghost:      '#7a8b7a',
        'error-ink': '#c0432b',
        'error-halo': 'rgba(192, 67, 43, 0.20)',
      },
      fontFamily: {
        serif: ['Newsreader', '"Iowan Old Style"', 'Georgia', 'serif'],
        sans:  ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
        mono:  ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'monospace'],
        hand:  ['Caveat', '"Bradley Hand"', 'cursive'],
      },
      borderRadius: {
        card: '14px',
        sheet: '16px',
        hero: '18px',
        button: '14px',
      },
      boxShadow: {
        // Two-stop drop: a tight contact shadow + a deeper diffuse halo,
        // both tinted warm (the palette ink, not pure black) so the
        // depth reads on the cream paper background instead of looking
        // muddy. The prototype's single `0 12px 30px -16px rgba(0,0,0,.2)`
        // disappeared against `bg-card` adjacents — this gives volume.
        card: '0 1px 2px rgba(60,40,20,0.06), 0 16px 32px -12px rgba(60,40,20,0.28)',
        hero: '0 30px 60px -30px rgba(0,0,0,0.35)',
        cta:  '0 12px 24px -10px rgba(182, 85, 44, 0.55)',
      },
      letterSpacing: {
        eyebrow: '0.12em',
      },
    },
  },
  plugins: [],
}
