import React from 'react'
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { color, space } from '../theme/theme'
import type { Job } from '../domain'

export interface JobCardProps {
  job: Job
  onPressDetails: (jobId: string) => void
  onQuickStart?: (jobId: string) => void
  onQuickComplete?: (jobId: string) => void
  isSubmitting?: boolean
  isActionTarget?: boolean
  isLast?: boolean
}

function formatDueDate(dueDate: unknown | null): { text: string; isOverdue: boolean } {
  if (!dueDate) return { text: '', isOverdue: false }
  try {
    let date: Date | null = null
    if (typeof (dueDate as { toMillis?: () => number }).toMillis === 'function') {
      date = new Date((dueDate as { toMillis: () => number }).toMillis())
    } else if (typeof (dueDate as { seconds?: number }).seconds === 'number') {
      date = new Date((dueDate as { seconds: number }).seconds * 1000)
    } else if (dueDate instanceof Date) {
      date = dueDate
    } else if (typeof dueDate === 'string' || typeof dueDate === 'number') {
      date = new Date(dueDate)
    }
    if (!date || isNaN(date.getTime())) return { text: '', isOverdue: false }

    const now = new Date()
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()

    if (isToday) {
      return { text: 'Due today', isOverdue: false }
    }
    if (date.getTime() < now.getTime()) {
      return { text: 'Overdue', isOverdue: true }
    }
    return {
      text: `Due ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      isOverdue: false,
    }
  } catch {
    return { text: '', isOverdue: false }
  }
}

const statusDotColor: Record<string, string> = {
  in_progress: color.accent,
  completed: color.done,
  assigned: color.ink3,
  cancelled: color.ink3,
  draft: color.ink3,
  open: color.ink3,
}

const statusLabels: Record<string, string> = {
  in_progress: 'In progress',
  completed: 'Completed',
  assigned: 'Assigned',
  cancelled: 'Cancelled',
  draft: 'Draft',
  open: 'Open',
}

export function JobCard({
  job,
  onPressDetails,
  isLast = false,
}: JobCardProps) {
  const secondaryLine =
    [job.customerName, job.serviceAddress || job.location]
      .filter(Boolean)
      .join(' · ') || 'Customer not specified'

  const dueInfo = formatDueDate(job.dueDate)

  return (
    <TouchableOpacity
      style={[styles.row, isLast && styles.rowLast]}
      onPress={() => onPressDetails(job.id)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${job.title}, ${secondaryLine}, ${statusLabels[job.status] || job.status}`}
    >
      {/* Line 1: Title + Trailing Chevron */}
      <View style={styles.topRow}>
        <View style={styles.titleContainer}>
          {job.priority === 'Urgent' ? <View style={styles.urgentDot} /> : null}
          <Text style={styles.title} numberOfLines={1}>
            {job.title}
          </Text>
        </View>
        <ChevronRight size={18} color={color.ink3} />
      </View>

      {/* Line 2: Customer Name · Location (15/400 ink2) */}
      <Text style={styles.secondaryText} numberOfLines={1}>
        {secondaryLine}
      </Text>

      {/* Line 3: Status dot + label, and Due date (13/400) */}
      <View style={styles.statusRow}>
        <View style={styles.statusGroup}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: statusDotColor[job.status] || color.ink3 },
            ]}
          />
          <Text style={styles.statusText}>
            {statusLabels[job.status] || job.status}
          </Text>
        </View>

        {dueInfo.text ? (
          <Text
            style={[
              styles.dueText,
              dueInfo.isOverdue && styles.overdueText,
            ]}
          >
            {dueInfo.text}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: space.sm,
  },
  urgentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.danger,
    marginRight: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: color.ink,
    letterSpacing: -0.2,
    flex: 1,
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '400',
    color: color.ink2,
    lineHeight: 20,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '400',
    color: color.ink2,
  },
  dueText: {
    fontSize: 13,
    fontWeight: '400',
    color: color.ink3,
  },
  overdueText: {
    color: color.danger,
    fontWeight: '500',
  },
})

