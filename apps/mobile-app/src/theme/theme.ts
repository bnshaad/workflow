export const color = {
  ink: '#000000',
  ink2: '#3C3C43',
  ink3: '#8E8E93',
  separator: '#C6C6C8',
  border: '#E3E3E7',
  surface: '#FFFFFF',
  surfaceSunken: '#F2F2F7',
  surfaceRaised: '#FAFAFC',
  accent: '#005EB8',
  accentPress: '#004A94',
  accentWash: '#EAF2FA',
  danger: '#C8102E',
  dangerWash: '#FCEBEE',
  warn: '#B45309',
  done: '#157F3D',
} as const

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const
export const radius = { control: 10, card: 14, sheet: 20, pill: 999 } as const

export const type = {
  screenTitle: { fontSize: 28, fontWeight: '600', lineHeight: 34 },
  sectionTitle: { fontSize: 20, fontWeight: '600', lineHeight: 25 },
  rowTitle: { fontSize: 17, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 20 },
  meta: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
} as const
