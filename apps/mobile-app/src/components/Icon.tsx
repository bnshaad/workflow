import React, { type ComponentType } from 'react'
import { color as themeColor } from '../theme/theme'

export interface IconProps {
  icon: ComponentType<any>
  size?: number | string
  color?: string
  style?: any
  fill?: string
}

export function Icon({ icon: Component, size = 20, color = themeColor.ink3, style, fill }: IconProps) {
  return <Component size={size} color={color} stroke={color} style={style} fill={fill} />
}
