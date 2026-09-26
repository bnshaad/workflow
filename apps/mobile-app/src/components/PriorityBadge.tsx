import React from 'react'
import { StyleSheet, Text, View, ViewStyle } from 'react-native'
import { color, space } from '../theme/theme'

export interface PriorityBadgeProps {
  priority: string
  label?: string
  size?: 'sm' | 'md'
  showLowMedium?: boolean
  style?: ViewStyle
}

export function PriorityBadge({
  priority,
  label,
  size = 'md',
  showLowMedium = true,
  style,
}: PriorityBadgeProps) {
  const normalized = priority.toLowerCase()
  const isSmall = size === 'sm'
  const fontSize = isSmall ? 11 : 12

  if (normalized === 'urgent') {
    return (
      <View style={[styles.row, style]}>
        <View style={styles.urgentDot} />
        <Text style={[styles.text, { color: color.danger, fontSize, fontWeight: '600' }]}>
          {label || 'Urgent'}
        </Text>
      </View>
    )
  }

  if (normalized === 'high') {
    return (
      <View style={[styles.row, style]}>
        <Text style={[styles.text, { color: color.warn, fontSize, fontWeight: '600' }]}>
          {label || 'High'}
        </Text>
      </View>
    )
  }

  if (!showLowMedium) {
    return null
  }

  const displayLabel = label || (normalized === 'medium' ? 'Medium' : 'Low')

  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.text, { color: color.ink3, fontSize, fontWeight: '400' }]}>
        {displayLabel}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  urgentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: color.danger,
    marginRight: space.xs,
  },
  text: {
    letterSpacing: -0.1,
  },
})
