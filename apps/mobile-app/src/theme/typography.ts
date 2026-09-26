import { TextStyle } from 'react-native'

export const typography = {
  sizes: {
    '2xs': 10,
    xs: 12,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
  },
  weights: {
    regular: '400' as TextStyle['fontWeight'],
    medium: '500' as TextStyle['fontWeight'],
    semibold: '600' as TextStyle['fontWeight'],
    bold: '700' as TextStyle['fontWeight'],
    extrabold: '800' as TextStyle['fontWeight'],
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
} as const
