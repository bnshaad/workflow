import React, { ComponentType } from 'react'
import { StyleSheet, Text, View, ViewStyle } from 'react-native'
import { Icon } from './Icon'
import { Button } from './Button'
import { color, radius, space, type } from '../theme/theme'

export interface EmptyStateProps {
  icon: ComponentType<any>
  title: string
  description: string
  actionLabel?: string
  actionIcon?: ComponentType<any>
  onAction?: () => void
  style?: ViewStyle
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Icon icon={icon} size={26} color={color.ink3} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          icon={actionIcon}
          variant="secondary"
          size="sm"
          onPress={onAction}
          style={styles.actionBtn}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: space.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.card,
    backgroundColor: color.surfaceSunken,
    borderWidth: 1,
    borderColor: color.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: space.lg,
  },
  title: {
    fontSize: type.rowTitle.fontSize,
    fontWeight: type.rowTitle.fontWeight,
    lineHeight: type.rowTitle.lineHeight,
    color: color.ink,
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: space.xs,
  },
  description: {
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight,
    color: color.ink2,
    textAlign: 'center',
    maxWidth: 280,
  },
  actionBtn: {
    marginTop: space.lg,
  },
})
