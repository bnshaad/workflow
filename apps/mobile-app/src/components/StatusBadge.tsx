import React from 'react'
import { StyleSheet, Text, View, ViewStyle } from 'react-native'
import { color, radius, space } from '../theme/theme'

export interface StatusBadgeProps {
  status: string
  label?: string
  size?: 'sm' | 'md'
  showDot?: boolean
  style?: ViewStyle
}

const statusConfig: Record<
  string,
  { bg: string; border: string; dot: string; text: string; label: string }
> = {
  // Neutral by default per Section 3
  open: {
    bg: color.surfaceSunken,
    border: color.border,
    dot: color.ink3,
    text: color.ink2,
    label: 'Open',
  },
  draft: {
    bg: color.surfaceSunken,
    border: color.border,
    dot: color.ink3,
    text: color.ink2,
    label: 'Draft',
  },
  assigned: {
    bg: color.surfaceSunken,
    border: color.border,
    dot: color.ink3,
    text: color.ink2,
    label: 'Assigned',
  },
  in_progress: {
    bg: color.surfaceSunken,
    border: color.border,
    dot: color.ink3,
    text: color.ink2,
    label: 'In progress',
  },
  // Exceptional states take semantic colour
  completed: {
    bg: color.surfaceSunken,
    border: color.border,
    dot: color.done,
    text: color.done,
    label: 'Completed',
  },
  blocked: {
    bg: color.dangerWash,
    border: color.dangerWash,
    dot: color.danger,
    text: color.danger,
    label: 'Blocked',
  },
  overdue: {
    bg: color.dangerWash,
    border: color.dangerWash,
    dot: color.danger,
    text: color.danger,
    label: 'Overdue',
  },
}

export function StatusBadge({
  status,
  label,
  size = 'md',
  showDot = true,
  style,
}: StatusBadgeProps) {
  const normalizedKey = status.toLowerCase()
  const config = statusConfig[normalizedKey] || {
    bg: color.surfaceSunken,
    border: color.border,
    dot: color.ink3,
    text: color.ink2,
    label: status,
  }

  const displayLabel = label || config.label
  const isSmall = size === 'sm'

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          paddingHorizontal: isSmall ? space.xs + 2 : space.sm,
          paddingVertical: isSmall ? 2 : 4,
        },
        style,
      ]}
    >
      {showDot ? (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: config.dot,
              width: isSmall ? 5 : 6,
              height: isSmall ? 5 : 6,
              borderRadius: 3,
            },
          ]}
        />
      ) : null}
      <Text
        style={[
          styles.label,
          {
            color: config.text,
            fontSize: isSmall ? 11 : 12,
            lineHeight: isSmall ? 14 : 16,
          },
        ]}
      >
        {displayLabel}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    marginRight: space.xs,
  },
  label: {
    fontWeight: '500',
    letterSpacing: -0.1,
  },
})
