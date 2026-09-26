import React from 'react'
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { CheckCircle2, ChevronRight } from 'lucide-react-native'
import {
  EmptyState,
  JobCardSkeleton,
  StatusBadge,
} from '../../src/components'
import type { Job } from '../../src/domain'
import { useAssignedJobs } from '../../src/hooks/useAssignedJobs'
import { useAuth } from '../../src/hooks/useAuth'
import { color, radius, space, type } from '../../src/theme/theme'

function toSafeDate(val: any): Date | null {
  if (!val) return null
  if (typeof val?.toDate === 'function') {
    try {
      const d = val.toDate()
      return isNaN(d.getTime()) ? null : d
    } catch {
      return null
    }
  }
  if (typeof val?.seconds === 'number') {
    const d = new Date(val.seconds * 1000)
    return isNaN(d.getTime()) ? null : d
  }
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val
  }
  if (typeof val === 'number') {
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d
  }
  if (typeof val === 'string') {
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

function formatCompletionDate(timestamp: any): string {
  const date = toSafeDate(timestamp)
  if (!date) return 'Recently completed'
  const today = new Date()
  const isTodayDate =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()

  if (isTodayDate) {
    return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })
}

function isToday(timestamp: any): boolean {
  const date = toSafeDate(timestamp)
  if (!date) return false
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

function getTimestampMillis(val: any): number {
  const date = toSafeDate(val)
  return date ? date.getTime() : 0
}

export default function JobHistoryScreen() {
  const insets = useSafeAreaInsets()
  const { user, profile } = useAuth()
  const { jobs, loading, refreshJobs } = useAssignedJobs(
    profile?.organizationId,
    user?.uid || profile?.id
  )
  const router = useRouter()

  const completedJobs = jobs
    .filter((j: Job) => j.status === 'completed')
    .sort((a, b) => {
      const timeA = getTimestampMillis(a.completedAt)
      const timeB = getTimestampMillis(b.completedAt)
      return timeB - timeA
    })

  const completedTodayCount = completedJobs.filter((j) => isToday(j.completedAt)).length

  return (
    <View style={[styles.rootView, { paddingTop: Math.max(insets.top, 12) }]}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <Text style={styles.screenTitle}>History</Text>
        <Text style={styles.subtitleText}>
          {completedJobs.length} completed · {completedTodayCount > 0 ? `${completedTodayCount} today` : 'none today'}
        </Text>
      </View>

      {/* Main List: iOS Inset-Grouped Style */}
      <View style={styles.listContainer}>
        {loading && completedJobs.length === 0 ? (
          <View style={styles.insetCard}>
            <JobCardSkeleton />
            <JobCardSkeleton />
            <JobCardSkeleton />
          </View>
        ) : completedJobs.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No completed jobs"
            description="Completed service assignments will appear here."
            actionLabel="View active jobs"
            onAction={() => router.push('/(tabs)')}
            style={styles.emptyState}
          />
        ) : (
          <View style={styles.insetCard}>
            <FlatList
              data={completedJobs}
              keyExtractor={(item: Job) => item.id}
              renderItem={({ item, index }: { item: Job; index: number }) => {
                const secondaryLine =
                  [item.customerName, item.serviceAddress || item.location]
                    .filter(Boolean)
                    .join(' · ') || 'Customer not specified'
                const isLast = index === completedJobs.length - 1

                return (
                  <TouchableOpacity
                    style={[styles.row, isLast && styles.rowLast]}
                    onPress={() => router.push(`/job/${item.id}`)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.title}, ${secondaryLine}, Completed`}
                  >
                    {/* Line 1: Title + Trailing Chevron */}
                    <View style={styles.topRow}>
                      <Text style={styles.jobTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <ChevronRight size={18} color={color.ink3} />
                    </View>

                    {/* Line 2: Customer Name · Location */}
                    <Text style={styles.secondaryText} numberOfLines={1}>
                      {secondaryLine}
                    </Text>

                    {/* Line 3: Completed status badge + Completed timestamp */}
                    <View style={styles.statusRow}>
                      <StatusBadge status="completed" size="sm" />
                      <Text style={styles.timestampText}>
                        {formatCompletionDate(item.completedAt)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              }}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={loading}
                  onRefresh={refreshJobs}
                  tintColor={color.accent}
                  colors={[color.accent]}
                />
              }
            />
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  rootView: {
    flex: 1,
    backgroundColor: color.surfaceSunken,
  },
  headerBar: {
    backgroundColor: color.surfaceSunken,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xs,
  },
  screenTitle: {
    ...type.screenTitle,
    color: color.ink,
    letterSpacing: -0.4,
  },
  subtitleText: {
    ...type.meta,
    color: color.ink3,
    marginTop: 2,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.lg,
  },
  insetCard: {
    backgroundColor: color.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    overflow: 'hidden',
  },
  row: {
    backgroundColor: color.surface,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    minHeight: 88,
    maxHeight: 96,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.separator,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: color.ink,
    letterSpacing: -0.2,
    flex: 1,
    marginRight: space.xs,
  },
  secondaryText: {
    ...type.body,
    color: color.ink2,
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timestampText: {
    ...type.meta,
    color: color.ink3,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
  },
})
