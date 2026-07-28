import React, { useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  ArrowLeft,
  User,
  MapPin,
  Phone,
  Play,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Check,
} from 'lucide-react-native'
import { Icon } from '../../src/components/Icon'
import type { Job } from '../../src/domain'
import { useAssignedJobs } from '../../src/hooks/useAssignedJobs'
import { useAuth } from '../../src/hooks/useAuth'

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

  const job = jobs.find((j: Job) => j.id === id)

  if (loading && !job) {
    return (
      <View style={[styles.rootView, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Loading job details...</Text>
        </View>
      </View>
    )
  }

  if (!job) {
    return (
      <View style={[styles.rootView, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Icon icon={ArrowLeft} size={20} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Details</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.centerContainer}>
          <Text style={styles.notFoundTitle}>Job Not Found</Text>
          <Text style={styles.notFoundSub}>
            This job may have been reassigned, unassigned, or completed.
          </Text>
          <TouchableOpacity style={styles.returnBtn} onPress={() => router.back()}>
            <Text style={styles.returnBtnText}>Return to Assigned Jobs</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const handleStartJob = async () => {
    setActionError(null)
    try {
      await startJob(job.id)
    } catch (err: any) {
      setActionError(err.message || 'Failed to start job. Please try again.')
    }
  }

  const handleCompleteJob = async () => {
    setActionError(null)
    try {
      await completeJob(job.id)
      router.replace('/(tabs)')
    } catch (err: any) {
      setActionError(err.message || 'Failed to complete job. Please try again.')
    }
  }

  const isAssigned = job.status === 'assigned'
  const isInProgress = job.status === 'in_progress'
  const isCompleted = job.status === 'completed'

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' }
      case 'high':
        return { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' }
      case 'medium':
        return { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd' }
      default:
        return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' }
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'in_progress':
        return { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd', label: 'IN PROGRESS' }
      case 'assigned':
        return { bg: '#fef3c7', text: '#b45309', border: '#fde68a', label: 'ASSIGNED' }
      case 'completed':
        return { bg: '#dcfce7', text: '#15803d', border: '#86efac', label: 'COMPLETED' }
      default:
        return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', label: status.toUpperCase() }
    }
  }

  const priorityStyle = getPriorityStyle(job.priority)
  const statusStyle = getStatusStyle(job.status)

  return (
    <View style={[styles.rootView, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Icon icon={ArrowLeft} size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {actionError ? (
          <View style={styles.errorToast}>
            <Icon icon={AlertCircle} size={16} color="#dc2626" style={styles.errorIcon} />
            <Text style={styles.errorToastText}>{actionError}</Text>
          </View>
        ) : null}

        {/* Main Overview Card */}
        <View style={styles.card}>
          <View style={styles.badgeRow}>
            <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.bg, borderColor: priorityStyle.border }]}>
              <Text style={[styles.priorityBadgeText, { color: priorityStyle.text }]}>
                {job.priority.toUpperCase()} PRIORITY
              </Text>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
              <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
                {statusStyle.label}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>{job.title}</Text>
          <Text style={styles.description}>{job.description}</Text>
        </View>

        {/* Customer Information Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Customer Details</Text>

          <View style={styles.detailRow}>
            <Icon icon={User} size={16} color="#64748b" style={styles.detailIcon} />
            <Text style={styles.detailLabel}>Customer:</Text>
            <Text style={styles.detailValue}>{job.customerName}</Text>
          </View>

          <View style={styles.detailRow}>
            <Icon icon={Phone} size={16} color="#64748b" style={styles.detailIcon} />
            <Text style={styles.detailLabel}>Phone:</Text>
            <Text style={styles.detailValue}>{job.customerPhone || 'N/A'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Icon icon={MapPin} size={16} color="#64748b" style={styles.detailIcon} />
            <Text style={styles.detailLabel}>Address:</Text>
            <Text style={styles.detailValue}>{job.serviceAddress || job.location || 'N/A'}</Text>
          </View>
        </View>

        {/* Required Skills Card */}
        {job.requiredSkills && job.requiredSkills.length > 0 ? (
          <View style={styles.card}>
            <View style={styles.skillsHeaderRow}>
              <Icon icon={Wrench} size={16} color="#0284c7" />
              <Text style={styles.sectionHeader}>Required Skills</Text>
            </View>

            <View style={styles.skillsBox}>
              {job.requiredSkills.map((skill: string, index: number) => (
                <View key={index} style={styles.skillPill}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Status Action Banner */}
        <View style={styles.actionCard}>
          {isAssigned ? (
            <TouchableOpacity
              style={[styles.primaryBtn, styles.startBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleStartJob}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View style={styles.btnContent}>
                  <Icon icon={Play} size={18} color="#ffffff" fill="#ffffff" />
                  <Text style={styles.btnText}>Start Job (Set In Progress)</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : null}

          {isInProgress ? (
            <TouchableOpacity
              style={[styles.primaryBtn, styles.completeBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleCompleteJob}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View style={styles.btnContent}>
                  <Icon icon={CheckCircle2} size={20} color="#ffffff" />
                  <Text style={styles.btnText}>Mark Job as Completed</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : null}

          {isCompleted ? (
            <View style={styles.completedNotice}>
              <Icon icon={Check} size={18} color="#15803d" />
              <Text style={styles.completedNoticeText}>This job has been completed.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  rootView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerBar: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerRightPlaceholder: {
    width: 36,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  notFoundSub: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  returnBtn: {
    marginTop: 18,
    backgroundColor: '#0284c7',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  returnBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  errorToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorToastText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    lineHeight: 25,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  skillsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailIcon: {
    marginRight: 10,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    width: 90,
  },
  detailValue: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
    flex: 1,
  },
  skillsBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  skillPill: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  skillText: {
    fontSize: 13,
    color: '#0284c7',
    fontWeight: '600',
  },
  actionCard: {
    marginTop: 8,
  },
  primaryBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  startBtn: {
    backgroundColor: '#0284c7',
  },
  completeBtn: {
    backgroundColor: '#16a34a',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  completedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
    borderWidth: 1,
    padding: 16,
    borderRadius: 14,
  },
  completedNoticeText: {
    color: '#15803d',
    fontWeight: '700',
    fontSize: 14,
  },
})
