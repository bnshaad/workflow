import React, { useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  Wrench,
  MapPin,
  User,
  LogOut,
  Play,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Briefcase,
  AlertTriangle,
} from 'lucide-react-native'
import { Icon } from '../../src/components/Icon'
import type { Job } from '../../src/domain'
import { useAssignedJobs } from '../../src/hooks/useAssignedJobs'
import { useAuth } from '../../src/hooks/useAuth'

type FilterTab = 'all' | 'assigned' | 'in_progress'

export default function AssignedJobsScreen() {
  const insets = useSafeAreaInsets()
  const { user, profile, logout } = useAuth()
  const { jobs, loading, isSubmitting, error, refreshJobs, startJob, completeJob } =
    useAssignedJobs(profile?.organizationId, user?.uid || profile?.id)
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [actionJobId, setActionJobId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

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

  const handleSignOut = async () => {
    try {
      await logout()
    } catch (err) {
      console.error('Sign out error:', err)
    } finally {
      router.replace('/(auth)/login')
    }
  }

  const handleQuickStart = async (jobId: string) => {
    setActionJobId(jobId)
    setActionError(null)
    try {
      await startJob(jobId)
    } catch (err: any) {
      setActionError(err.message || 'Failed to start job.')
    } finally {
      setActionJobId(null)
    }
  }

  const handleQuickComplete = async (jobId: string) => {
    setActionJobId(jobId)
    setActionError(null)
    try {
      await completeJob(jobId)
    } catch (err: any) {
      setActionError(err.message || 'Failed to complete job.')
    } finally {
      setActionJobId(null)
    }
  }

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
      default:
        return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', label: status.toUpperCase() }
    }
  }

  const renderJobItem = ({ item }: { item: Job }) => {
    const priorityStyle = getPriorityStyle(item.priority)
    const statusStyle = getStatusStyle(item.status)
    const isJobSubmitting = isSubmitting && actionJobId === item.id

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/job/${item.id}`)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.bg, borderColor: priorityStyle.border }]}>
            <Text style={[styles.priorityBadgeText, { color: priorityStyle.text }]}>
              {item.priority.toUpperCase()} PRIORITY
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
            <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
              {statusStyle.label}
            </Text>
          </View>
        </View>

        <Text style={styles.jobTitle}>{item.title}</Text>

        <View style={styles.infoBlock}>
          <View style={styles.infoRow}>
            <Icon icon={User} size={15} color="#64748b" style={styles.infoIcon} />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.customerName}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Icon icon={MapPin} size={15} color="#64748b" style={styles.infoIcon} />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.serviceAddress || item.location || 'Location Not Specified'}
            </Text>
          </View>
        </View>

        {/* Minimal Clicks Action Bar */}
        <View style={styles.cardActions}>
          {item.status === 'assigned' ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.startBtn, isJobSubmitting && styles.btnDisabled]}
              onPress={() => handleQuickStart(item.id)}
              disabled={isJobSubmitting}
              activeOpacity={0.8}
            >
              {isJobSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Icon icon={Play} size={14} color="#ffffff" fill="#ffffff" />
                  <Text style={styles.startBtnText}>Start Job</Text>
                </>
              )}
            </TouchableOpacity>
          ) : item.status === 'in_progress' ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.completeBtn, isJobSubmitting && styles.btnDisabled]}
              onPress={() => handleQuickComplete(item.id)}
              disabled={isJobSubmitting}
              activeOpacity={0.8}
            >
              {isJobSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Icon icon={CheckCircle2} size={15} color="#ffffff" />
                  <Text style={styles.completeBtnText}>Complete Job</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.detailsBtn}
            onPress={() => router.push(`/job/${item.id}`)}
            activeOpacity={0.7}
          >
            <Text style={styles.detailsBtnText}>Details</Text>
            <Icon icon={ChevronRight} size={16} color="#64748b" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={[styles.rootView, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.container}>
        {/* Top Branding & User Header Bar */}
        <View style={styles.headerBar}>
          <View style={styles.headerLeft}>
            <View style={styles.brandIconBox}>
              <Icon icon={Wrench} size={20} color="#0284c7" />
            </View>
            <View>
              <Text style={styles.welcomeText}>
                Hello, {profile?.displayName || profile?.name || 'Technician'}
              </Text>
              <Text style={styles.subText}>
                {activeAssignedJobs.length} active service {activeAssignedJobs.length === 1 ? 'job' : 'jobs'} assigned
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Icon icon={LogOut} size={16} color="#ef4444" />
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Segment Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'all' && styles.tabItemActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              All ({activeAssignedJobs.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'assigned' && styles.tabItemActive]}
            onPress={() => setActiveTab('assigned')}
          >
            <Text style={[styles.tabText, activeTab === 'assigned' && styles.tabTextActive]}>
              Assigned ({assignedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'in_progress' && styles.tabItemActive]}
            onPress={() => setActiveTab('in_progress')}
          >
            <Text style={[styles.tabText, activeTab === 'in_progress' && styles.tabTextActive]}>
              In Progress ({inProgressCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Toast */}
        {error || actionError ? (
          <View style={styles.errorBox}>
            <Icon icon={AlertTriangle} size={16} color="#dc2626" style={styles.errorIcon} />
            <Text style={styles.errorBoxText}>{actionError || error}</Text>
          </View>
        ) : null}

        {/* Main Jobs List / Empty State */}
        {loading && activeAssignedJobs.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#0284c7" />
            <Text style={styles.loadingText}>Loading assigned jobs...</Text>
          </View>
        ) : filteredJobs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Icon icon={Briefcase} size={36} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>No Active Jobs</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'all'
                ? 'When a manager assigns a service job to you, it will appear here.'
                : activeTab === 'assigned'
                ? 'You have no pending assigned jobs to start.'
                : 'You have no jobs currently in progress.'}
            </Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={refreshJobs} activeOpacity={0.8}>
              <Icon icon={RefreshCw} size={16} color="#0284c7" />
              <Text style={styles.refreshBtnText}>Refresh List</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredJobs}
            keyExtractor={(item: Job) => item.id}
            renderItem={renderJobItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={refreshJobs}
                tintColor="#0284c7"
                colors={['#0284c7']}
              />
            }
          />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  rootView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerBar: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  brandIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  subText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 10,
  },
  logoutBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  tabItemActive: {
    backgroundColor: '#0284c7',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  errorBox: {
    marginHorizontal: 16,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 10,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorBoxText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 280,
  },
  refreshBtn: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  refreshBtnText: {
    color: '#0284c7',
    fontWeight: '700',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
  jobTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
    lineHeight: 22,
  },
  infoBlock: {
    gap: 6,
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  startBtn: {
    backgroundColor: '#0284c7',
  },
  completeBtn: {
    backgroundColor: '#16a34a',
  },
  startBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  completeBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  detailsBtnText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
})
