/**
 * Minimalist Design System Palette
 * Strict Minimalism: Monochromatic Zinc & Carbon base with ONE single functional accent color.
 * No generic blue shades, no gradients, no rainbow color soup.
 */
export const colors = {
  // Monochromatic Base: Solid Carbon (Dark ink)
  primary: '#18181b', // Zinc 900
  primaryHover: '#27272a', // Zinc 800
  primaryContrast: '#ffffff',

  // Surfaces & Backgrounds (Clean, off-white, no tint)
  background: '#fafafa', // Pure clean off-white
  surface: '#ffffff', // Card surface
  surfaceSubtle: '#f4f4f5', // Zinc 100
  surfaceHover: '#e4e4e7', // Zinc 200

  // Hairline & Structural Borders
  border: '#e4e4e7', // Zinc 200 (1px hairline)
  borderSubtle: '#f4f4f5', // Zinc 100
  borderStrong: '#d4d4d8', // Zinc 300
  borderDark: '#27272a',

  // Monochromatic Text Hierarchy
  text: {
    primary: '#09090b', // Zinc 950 (Sharp, high-contrast ink)
    secondary: '#52525b', // Zinc 600 (Readable secondary body)
    muted: '#71717a', // Zinc 500 (Subtle labels)
    subtle: '#a1a1aa', // Zinc 400 (Placeholders)
    inverse: '#ffffff',
  },

  // THE SINGLE ACCENT COLOUR: Refined Emerald (#16a34a)
  // Used purposefully across the app for active states, highlights, and primary badges.
  accent: {
    primary: '#16a34a', // Emerald 600 (The single accent)
    hover: '#15803d', // Emerald 700
    subtle: '#f0fdf4', // Emerald 50 (Soft tint)
    border: '#bbf7d0', // Emerald 200
    contrast: '#ffffff',
  },

  // Minimalist Status Badges (Monochromatic with single accent highlight)
  status: {
    assigned: {
      bg: '#f4f4f5',
      text: '#3f3f46',
      border: '#e4e4e7',
      dot: '#71717a',
      label: 'Assigned',
    },
    in_progress: {
      bg: '#18181b', // Active Carbon
      text: '#ffffff',
      border: '#18181b',
      dot: '#16a34a', // Single accent dot
      label: 'In Progress',
    },
    completed: {
      bg: '#f0fdf4', // Accent tint
      text: '#15803d',
      border: '#bbf7d0',
      dot: '#16a34a',
      label: 'Completed',
    },
    blocked: {
      bg: '#fafafa',
      text: '#71717a',
      border: '#d4d4d8',
      dot: '#18181b',
      label: 'Blocked',
    },
  },

  // Minimalist Urgency (Understated tags, no neon)
  priority: {
    urgent: {
      bg: '#18181b',
      text: '#ffffff',
      border: '#18181b',
      label: 'Urgent',
    },
    high: {
      bg: '#f4f4f5',
      text: '#18181b',
      border: '#d4d4d8',
      label: 'High',
    },
    medium: {
      bg: '#fafafa',
      text: '#52525b',
      border: '#e4e4e7',
      label: 'Medium',
    },
    low: {
      bg: '#fafafa',
      text: '#71717a',
      border: '#e4e4e7',
      label: 'Low',
    },
  },
} as const

export type StatusKey = keyof typeof colors.status
export type PriorityKey = keyof typeof colors.priority
