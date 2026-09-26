import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View, ViewStyle } from 'react-native'
import { colors, radius, spacing } from '../theme'

export interface SkeletonBoxProps {
  width?: number | string
  height?: number
  borderRadius?: number
  style?: ViewStyle
}

export function SkeletonBox({
  width = '100%',
  height = 16,
  borderRadius = radius.sm,
  style,
}: SkeletonBoxProps) {
  const opacity = useRef(new Animated.Value(0.35)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[
        styles.box,
        {
          width: width as any,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  )
}

export function JobCardSkeleton() {
  return (
    <View style={styles.rowSkeleton}>
      <View style={styles.skeletonTopRow}>
        <SkeletonBox width="60%" height={18} borderRadius={radius.xs} />
        <SkeletonBox width={16} height={16} borderRadius={radius.xs} />
      </View>
      <SkeletonBox width="45%" height={14} borderRadius={radius.xs} style={{ marginBottom: 8 }} />
      <View style={styles.skeletonStatusRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <SkeletonBox width={8} height={8} borderRadius={4} />
          <SkeletonBox width={70} height={12} borderRadius={radius.xs} />
        </View>
        <SkeletonBox width={60} height={12} borderRadius={radius.xs} />
      </View>
    </View>
  )
}

export function JobDetailSkeleton() {
  return (
    <View style={styles.detailContainer}>
      {/* Top Header Card Skeleton */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <SkeletonBox width={80} height={20} borderRadius={radius.xs} />
          <SkeletonBox width={90} height={20} borderRadius={radius.full} />
        </View>
        <SkeletonBox width="90%" height={24} style={styles.title} />
        <SkeletonBox width="100%" height={14} style={{ marginBottom: spacing.xs }} />
        <SkeletonBox width="70%" height={14} />
      </View>

      {/* Quick Action Bar Skeleton */}
      <View style={styles.quickActionRow}>
        <SkeletonBox width="48%" height={44} borderRadius={radius.md} />
        <SkeletonBox width="48%" height={44} borderRadius={radius.md} />
      </View>

      {/* Details Card Skeleton */}
      <View style={styles.card}>
        <SkeletonBox width={120} height={18} style={{ marginBottom: spacing.lg }} />
        <SkeletonBox width="100%" height={16} style={{ marginBottom: spacing.md }} />
        <SkeletonBox width="100%" height={16} style={{ marginBottom: spacing.md }} />
        <SkeletonBox width="100%" height={16} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.border,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    marginBottom: spacing.md,
  },
  infoBlock: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  detailContainer: {
    padding: spacing.lg,
  },
  quickActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  rowSkeleton: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    minHeight: 88,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  skeletonTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  skeletonStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
})
