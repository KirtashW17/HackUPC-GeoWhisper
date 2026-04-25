// Icons — line-stroked, hairline weight to match paper aesthetic.
// All accept `c` (color) and `s` (size).

const Icon = {
  ghost: ({ c = 'currentColor', s = 20 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M5 11a7 7 0 0 1 14 0v9l-2-1.5L15 20l-2-1.5L11 20l-2-1.5L7 20l-2-1.5V11Z"
        stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="9.5" cy="11" r="0.9" fill={c} />
      <circle cx="14.5" cy="11" r="0.9" fill={c} />
    </svg>
  ),
  pin: ({ c = 'currentColor', s = 20 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12Z"
        stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" stroke={c} strokeWidth="1.5" />
    </svg>
  ),
  plus: ({ c = 'currentColor', s = 20 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  list: ({ c = 'currentColor', s = 20 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16M4 12h16M4 17h10" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  user: ({ c = 'currentColor', s = 20 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.5" stroke={c} strokeWidth="1.5" />
      <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  eye: ({ c = 'currentColor', s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" stroke={c} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.5" stroke={c} strokeWidth="1.5" />
    </svg>
  ),
  clock: ({ c = 'currentColor', s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.5" />
      <path d="M12 7v5l3 2" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  near: ({ c = 'currentColor', s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="2.5" fill={c} />
      <circle cx="12" cy="12" r="6" stroke={c} strokeWidth="1.4" opacity="0.55" />
      <circle cx="12" cy="12" r="9.5" stroke={c} strokeWidth="1.2" opacity="0.25" />
    </svg>
  ),
  arrow: ({ c = 'currentColor', s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M13 6l6 6-6 6" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  back: ({ c = 'currentColor', s = 18 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M15 6l-6 6 6 6" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  globe: ({ c = 'currentColor', s = 18 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.5" />
      <path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" stroke={c} strokeWidth="1.3" />
    </svg>
  ),
  feather: ({ c = 'currentColor', s = 20 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M20 4c-7 0-13 6-13 13v3h3c7 0 13-6 13-13V4h-3Z" stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 20l9-9M11 13h5M13 11v-4" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  spark: ({ c = 'currentColor', s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l4 4M14 14l4 4M18 6l-4 4M10 14l-4 4"
        stroke={c} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  wave: ({ c = 'currentColor', s = 18 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M2 12c2 0 2-3 4-3s2 3 4 3 2-3 4-3 2 3 4 3 2-3 4-3"
        stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

window.Icon = Icon;
