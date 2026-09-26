import React, { useState } from 'react'
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  Briefcase,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native'
import {
  EmptyState,
  Icon,
  JobCard,
  JobCardSkeleton,
  SegmentedControl,
} from '../../src/components'
import type { Job } from '../../src/domain'
import { useAssignedJobs } from '../../src/hooks/useAssignedJobs'
import { useAuth } from '../../src/hooks/useAuth'
import { color, radius, space, type } from '../../src/theme/theme'

type FilterTab = 'all' | 'assigned' | 'in_progress'

export default function AssignedJobsScreen() {
  const insets = useSafeAreaInsets()
  const { user, profile } = useAuth()
  const {
    jobs,
    loading,
    error,
    refreshJobs,
  } = useAssignedJobs(profile?.organizationId, user?.uid || profile?.id)
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const activeAssignedJobs = jobs.filter(
    (j: Job) => j.status === 'assigned' || j.status === 'in_progress'
  )

  const assignedCount = jobs.filter((j: Job) => j.status === 'assigned').length
  const inProgressCount = jobs.filter((j: Job) => j.status === 'in_progress').length

  const filteredJobs = activeAssignedJobs.filter((job: Job) => {
    if (activeTab === 'assigned') return job.status === 'assigned'
    if (activeTab === 'in_progress') return job.status === 'in_progress'
    return true
  })

  const handleNavigateDetails = (jobId: string) => {
    router.push(`/job/${jobId}`)
  }

  return (
    <View style={[styles.rootView, { paddingTop: Math.max(insets.top, 12) }]}>
      {/* Top Header Bar: Clean & Minimalist, No Ghost Sign Out */}
      <View style={styles.headerBar}>
        <Text style={styles.screenTitle}>Jobs</Text>
        <Text style={styles.subtitleText}>
          {profile?.displayName || 'Technician'} · {activeAssignedJobs.length} active
        </Text>
      </View>

      {/* Filter Segmented Control: iOS surfaceRaised track with white thumb */}
      <View style={styles.segmentedContainer}>
        <SegmentedControl<FilterTab>
          segments={[
            { id: 'all', label: 'All', count: activeAssignedJobs.length },
            { id: 'assigned', label: 'Assigned', count: assignedCount },
            { id: 'in_progress', label: 'In progress', count: inProgressCount },
          ]}
          selectedId={activeTab}
          onSelect={(tab) => setActiveTab(tab)}
        />
      </View>

      {/* Error Banner if any */}
      {error ? (
        <View style={styles.errorBanner}>
          <Icon icon={AlertCircle} size={16} color={color.danger} style={styles.errorIcon} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {/* Main List: iOS Inset-Grouped Style */}
      <View style={styles.listContainer}>
        {loading && activeAssignedJobs.length === 0 ? (
          <View style={styles.insetCard}>
            <JobCardSkeleton />
            <JobCardSkeleton />
            <JobCardSkeleton />
          </View>
        ) : filteredJobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No active jobs"
            description={
              activeTab === 'all'
                ? 'When a dispatcher assigns a service job to you, it will appear here.'
                : activeTab === 'assigned'
                ? 'You have no pending jobs waiting to start.'
                : 'You have no jobs currently in progress.'
            }
            actionLabel="Refresh list"
            actionIcon={RefreshCw}
            onAction={refreshJobs}
            style={styles.emptyState}
          />
        ) : (
          <View style={styles.insetCard}>
            <FlatList
              data={filteredJobs}
              keyExtractor={(item: Job) => item.id}
              renderItem={({ item, index }: { item: Job; index: number }) => (
                <JobCard
                  job={item}
                  onPressDetails={handleNavigateDetails}
                  isLast={index === filteredJobs.length - 1}
                />
              )}
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
  segmentedContainer: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  errorBanner: {
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.md,
    backgroundColor: color.dangerWash,
    borderColor: color.danger,
    borderWidth: 1,
    borderRadius: radius.control,
  },
  errorIcon: {
    marginRight: space.sm,
  },
  errorBannerText: {
    color: color.danger,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  listContainer: {
    flex: 1,
    paddingTop: space.xs,
    paddingBottom: space.lg,
  },
  insetCard: {
    marginHorizontal: space.lg,
    backgroundColor: color.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    overflow: 'hidden',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
  },
})

