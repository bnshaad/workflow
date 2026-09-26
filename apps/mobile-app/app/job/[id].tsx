import React, { useState } from 'react'
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  ChevronLeft,
  Phone,
  Navigation,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react-native'
import {
  ConfirmModal,
  EmptyState,
  Icon,
  JobDetailSkeleton,
  ReportBlockerModal,
} from '../../src/components'
import type { IncidentCategory, Job } from '../../src/domain'
import { useAssignedJobs } from '../../src/hooks/useAssignedJobs'
import { useAuth } from '../../src/hooks/useAuth'
import { reportJobIncident } from '../../src/services/incidentService'
import { color, radius, space, type } from '../../src/theme/theme'

const statusLabels: Record<string, string> = {
  in_progress: 'In progress',
  completed: 'Completed',
  assigned: 'Assigned',
  cancelled: 'Cancelled',
  draft: 'Draft',
  open: 'Open',
}

export default function JobDetailScreen() {
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user, profile } = useAuth()
  const { jobs, loading, isSubmitting, startJob, completeJob } = useAssignedJobs(
    profile?.organizationId,
    user?.uid || profile?.id
  )
  const router = useRouter()

  const [actionError, setActionError] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [showBlockerModal, setShowBlockerModal] = useState(false)
  const [submittingBlocker, setSubmittingBlocker] = useState(false)

  const job = jobs.find((j: Job) => j.id === id)

  const handleBack = () => {
    if (router.back) {
      router.back()
    } else {
      router.replace('/(tabs)')
    }
  }

  const handleCallCustomer = async () => {
    if (!job?.customerPhone) return
    const cleanedPhone = job.customerPhone.replace(/[^\d+]/g, '')
    const url = `tel:${cleanedPhone}`
    try {
      const supported = await Linking.canOpenURL(url)
      if (supported) {
        await Linking.openURL(url)
      } else {
        setActionError('Phone calling is not supported on this device.')
      }
    } catch {
      setActionError('Unable to initiate phone call.')
    }
  }

  const handleOpenNavigation = async () => {
    const address = job?.serviceAddress || job?.location
    if (!address) return
    const encodedAddress = encodeURIComponent(address)
    const url = Platform.select({
      ios: `maps:0,0?q=${encodedAddress}`,
      default: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
    })
    try {
      await Linking.openURL(url)
    } catch {
      setActionError('Unable to open map navigation.')
    }
  }

  const handleStartJob = async () => {
    if (!job || isSubmitting) return
    setActionError(null)
    try {
      await startJob(job.id)
    } catch (err: any) {
      setActionError(err.message || 'Unable to start job. Please try again.')
    }
  }

  const handleReportBlocker = async (category: IncidentCategory, description: string) => {
    if (!job || !user || !profile) return
    setSubmittingBlocker(true)
    setActionError(null)
    try {
      await reportJobIncident({
        jobId: job.id,
        organizationId: job.organizationId,
        reportedByUserId: user.uid,
        reportedByUserName: profile.displayName || profile.name || 'Technician',
        category,
        description,
      })
      setSuccessBanner('Blocker reported. Dispatcher has been notified.')
      setShowBlockerModal(false)
    } catch (err: any) {
      setActionError(err.message || 'Unable to submit blocker report.')
    } finally {
      setSubmittingBlocker(false)
    }
  }

  const handleConfirmComplete = async () => {
    if (!job || isSubmitting) return
    setActionError(null)
    try {
      await completeJob(job.id)
      setShowCompleteConfirm(false)
      router.replace('/(tabs)')
    } catch (err: any) {
      setActionError(err.message || 'Unable to complete job. Please try again.')
    }
  }

  if (loading && !job) {
    return (
      <View style={[styles.rootView, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
            <ChevronLeft size={22} color={color.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job details</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>
        <JobDetailSkeleton />
      </View>
    )
  }

  if (!job) {
    return (
      <View style={[styles.rootView, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
            <ChevronLeft size={22} color={color.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job details</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <EmptyState
          icon={AlertCircle}
          title="Job not found"
          description="This job may have been reassigned, unassigned, or completed."
          actionLabel="Return to jobs"
          onAction={handleBack}
          style={styles.emptyState}
        />
      </View>
    )
  }

  const isAssigned = job.status === 'assigned'
  const isInProgress = job.status === 'in_progress'
  const isCompleted = job.status === 'completed'

  return (
    <View style={[styles.rootView, { paddingTop: Math.max(insets.top, 12) }]}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <ChevronLeft size={22} color={color.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job details</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Alert */}
        {successBanner ? (
          <View style={styles.successBanner}>
            <Icon icon={CheckCircle2} size={16} color={color.done} style={styles.alertIcon} />
            <Text style={styles.successBannerText}>{successBanner}</Text>
          </View>
        ) : null}

        {/* Error Alert */}
        {actionError ? (
          <View style={styles.errorBanner}>
            <Icon icon={AlertCircle} size={16} color={color.danger} style={styles.alertIcon} />
            <Text style={styles.errorBannerText}>{actionError}</Text>
          </View>
        ) : null}

        {/* Job Overview Card */}
        <View style={styles.card}>
          <Text style={styles.title}>{job.title}</Text>
          <Text style={styles.statusSub}>{statusLabels[job.status] || job.status}</Text>
          {job.description ? (
            <Text style={styles.description}>{job.description}</Text>
          ) : null}
        </View>

        {/* Customer & Location Card with Inline Actions */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Customer</Text>
          <Text style={styles.customerName}>{job.customerName || 'Customer not specified'}</Text>

          {job.customerPhone ? (
            <View style={styles.actionRow}>
              <Text style={styles.actionValue}>{job.customerPhone}</Text>
              <TouchableOpacity
                style={styles.iconActionBtn}
                onPress={handleCallCustomer}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Call customer"
              >
                <Phone size={16} color={color.accent} />
              </TouchableOpacity>
            </View>
          ) : null}

          {job.serviceAddress || job.location ? (
            <View style={[styles.actionRow, styles.actionRowLast]}>
              <Text style={styles.actionValue}>{job.serviceAddress || job.location}</Text>
              <TouchableOpacity
                style={styles.iconActionBtn}
                onPress={handleOpenNavigation}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Navigate to address"
              >
                <Navigation size={16} color={color.accent} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Required Skills Card */}
        {job.requiredSkills && job.requiredSkills.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Required skills</Text>
            <View style={styles.skillsBox}>
              {job.requiredSkills.map((skill: string, index: number) => (
                <View key={index} style={styles.skillChip}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Primary Action Area */}
        <View style={styles.actionArea}>
          {isAssigned ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleStartJob}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>
                {isSubmitting ? 'Starting job...' : 'Start job'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {isInProgress ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setShowCompleteConfirm(true)}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>
                {isSubmitting ? 'Completing job...' : 'Complete job'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {(isAssigned || isInProgress) ? (
            <TouchableOpacity
              style={styles.blockerTextBtn}
              onPress={() => setShowBlockerModal(true)}
              disabled={isSubmitting || submittingBlocker}
              activeOpacity={0.7}
            >
              <Text style={styles.blockerText}>Report a blocker</Text>
            </TouchableOpacity>
          ) : null}

          {isCompleted ? (
            <View style={styles.completedNotice}>
              <CheckCircle2 size={18} color={color.done} />
              <Text style={styles.completedNoticeText}>Job completed</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Complete Confirmation Modal */}
      <ConfirmModal
        visible={showCompleteConfirm}
        title="Complete job"
        message="Mark this job as completed? This will finalize the service record."
        confirmText="Complete"
        cancelText="Cancel"
        confirmVariant="accent"
        icon={CheckCircle2}
        loading={isSubmitting}
        onConfirm={handleConfirmComplete}
        onCancel={() => setShowCompleteConfirm(false)}
      />

      {/* Report Blocker Modal */}
      <ReportBlockerModal
        visible={showBlockerModal}
        loading={submittingBlocker}
        onClose={() => setShowBlockerModal(false)}
        onSubmit={handleReportBlocker}
      />
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
    paddingVertical: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.separator,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: color.ink,
    letterSpacing: -0.2,
  },
  headerRightPlaceholder: {
    width: 44,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: space.lg,
    paddingBottom: space.xxxl,
    gap: space.md,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: color.ink,
    letterSpacing: -0.3,
    lineHeight: 25,
  },
  statusSub: {
    ...type.meta,
    color: color.ink3,
    marginTop: 4,
    marginBottom: space.sm,
  },
  description: {
    ...type.body,
    color: color.ink2,
    lineHeight: 21,
  },
  sectionHeader: {
    ...type.label,
    color: color.ink3,
    marginBottom: space.sm,
  },
  customerName: {
    fontSize: 17,
    fontWeight: '600',
    color: color.ink,
    letterSpacing: -0.2,
    marginBottom: space.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  actionRowLast: {
    borderBottomWidth: 0,
  },
  actionValue: {
    ...type.body,
    color: color.ink2,
    flex: 1,
    marginRight: space.sm,
  },
  iconActionBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.control,
    backgroundColor: color.accentWash,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skillsBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  skillChip: {
    backgroundColor: color.surfaceRaised,
    borderColor: color.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  skillText: {
    fontSize: 13,
    fontWeight: '500',
    color: color.ink2,
  },
  actionArea: {
    marginTop: space.sm,
    gap: space.xs,
  },
  primaryBtn: {
    height: 50,
    backgroundColor: color.accent,
    borderRadius: radius.control,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: color.surface,
  },
  blockerTextBtn: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockerText: {
    fontSize: 15,
    fontWeight: '500',
    color: color.ink2,
  },
  completedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingVertical: space.md,
    borderRadius: radius.control,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.done,
  },
  completedNoticeText: {
    fontSize: 15,
    fontWeight: '600',
    color: color.done,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.md,
    backgroundColor: color.accentWash,
    borderColor: color.accent,
    borderWidth: 1,
    borderRadius: radius.control,
  },
  successBannerText: {
    color: color.accent,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.md,
    backgroundColor: color.dangerWash,
    borderColor: color.danger,
    borderWidth: 1,
    borderRadius: radius.control,
  },
  alertIcon: {
    marginRight: space.sm,
  },
  errorBannerText: {
    color: color.danger,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
  },
})

