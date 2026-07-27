// Tiny inline-SVG icon set — avoids an icon-library dependency.
const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function TranslateIcon(p) {
  return (
    <svg {...base} {...p}>
      <path d="M4 5h7" />
      <path d="M7 4c0 4.5-2 7-4 8.5" />
      <path d="M5 8c0 2.5 2.5 4.5 5 5.5" />
      <path d="M13 20l4-9 4 9" />
      <path d="M14.5 17h5" />
    </svg>
  )
}

export function ChatIcon(p) {
  return (
    <svg {...base} {...p}>
      <path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19l1-4.3A7.5 7.5 0 1 1 20 11.5Z" />
      <path d="M8.5 11h.01M12 11h.01M15.5 11h.01" />
    </svg>
  )
}

export function BookIcon(p) {
  return (
    <svg {...base} {...p}>
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5Z" />
      <path d="M5 19.5A1.5 1.5 0 0 1 6.5 18H19v3H6.5A1.5 1.5 0 0 1 5 19.5Z" />
    </svg>
  )
}

export function SettingsIcon(p) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 6.6 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H2a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4 6.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6h.1A1.7 1.7 0 0 0 10 3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 17.4 5l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.9 1.3Z" />
    </svg>
  )
}

export function BookmarkIcon({ filled, ...p }) {
  return (
    <svg {...base} fill={filled ? 'currentColor' : 'none'} {...p}>
      <path d="M6 4h12v16l-6-4-6 4Z" />
    </svg>
  )
}

export function SendIcon(p) {
  return (
    <svg {...base} {...p}>
      <path d="M4 12l16-7-7 16-2-6-7-3Z" />
    </svg>
  )
}

export function SparkIcon(p) {
  return (
    <svg {...base} {...p}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
    </svg>
  )
}

export function TrashIcon(p) {
  return (
    <svg {...base} {...p}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13" />
    </svg>
  )
}

export function CheckIcon(p) {
  return (
    <svg {...base} {...p}>
      <path d="M4 12.5 9 17.5 20 6.5" />
    </svg>
  )
}

export function SearchIcon(p) {
  return (
    <svg {...base} {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  )
}

export function FlameIcon(p) {
  return (
    <svg {...base} {...p}>
      <path d="M12 3c1 3-1 4-1 6a3 3 0 0 0 6 .5c.4 1 1 2.2 1 3.5a6 6 0 1 1-11.5-2.3C7.5 8 10 7 12 3Z" />
    </svg>
  )
}
