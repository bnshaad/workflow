import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Loader2, RefreshCw, Search, UserCheck } from 'lucide-react'
import { CreateJobDrawer, PageHeader, TeamMemberCard, type TeamMember } from '@/components'
import type { Availability } from '@/components/AvailabilityBadge'
import { useAuth } from '@/hooks'
import { jobService } from '@/services/jobs'
import { cacheService } from '@/services/cache/cacheService'
import type { Job, UserProfile } from '@/types'
import { cn } from '@/utils'

const PAGE_SIZE = 10

export function TeamPage() {
  const { profile } = useAuth()
  const [employees, setEmployees] = useState<UserProfile[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSkill, setSelectedSkill] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState<Availability | 'all'>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const refreshTeamData = async () => {
    if (!profile) return

    cacheService.invalidate()
    setIsRefreshing(true)
    setErrorMessage('')

    try {
      const [fetchedEmployees, fetchedJobs] = await Promise.all([
        jobService.listAssignableEmployees(profile, profile.organizationId),
        jobService.listJobs(profile, profile.organizationId, { limit: 100 }),
      ])

      setEmployees(fetchedEmployees)
      setJobs(fetchedJobs)
    } catch {
      setErrorMessage('Unable to load team members. Please try again.')
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    async function loadTeamData() {
      if (!profile) return

      setIsLoading(true)
      setErrorMessage('')

      try {
        const [fetchedEmployees, fetchedJobs] = await Promise.all([
          jobService.listAssignableEmployees(profile, profile.organizationId),
          jobService.listJobs(profile, profile.organizationId, { limit: 100 }),
        ])

        if (isMounted) {
          setEmployees(fetchedEmployees)
          setJobs(fetchedJobs)
        }
      } catch {
        if (isMounted) {
          setErrorMessage('Unable to load team members. Please try again.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadTeamData()

    return () => {
      isMounted = false
    }
  }, [profile])

  // Extract all unique skills across all employees for the filter dropdown
  const availableSkills = useMemo(() => {
    const skillSet = new Set<string>()
    employees.forEach((emp) => {
      if (emp.skills) {
        emp.skills.forEach((skill) => skillSet.add(skill))
      }
    })
    return Array.from(skillSet).sort()
  }, [employees])

  // Map UserProfile -> TeamMember with live Firestore workload calculations
  const teamMembers = useMemo<TeamMember[]>(() => {
    return employees.map((emp) => {
      const name = emp.displayName || 'Technician'
      const initials = name
        .split(' ')
        .map((part: string) => part[0])
        .filter(Boolean)
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'TECH'

      const activeJobCount = jobs.filter(
        (j) =>
          j.assignedEmployeeIds.includes(emp.id) &&
          (j.status === 'assigned' || j.status === 'in_progress')
      ).length

      const completedJobCount = jobs.filter(
        (j) => j.assignedEmployeeIds.includes(emp.id) && j.status === 'completed'
      ).length

      let availabilityLabel: Availability = 'Available'
      const rawAvailability = String(emp.availability || '').toLowerCase()
      if (rawAvailability === 'busy' || activeJobCount >= 3) {
        availabilityLabel = 'Busy'
      } else if (rawAvailability === 'leave' || rawAvailability === 'on leave') {
        availabilityLabel = 'On Leave'
      }

      return {
        id: emp.id,
        activeJobCount,
        availability: availabilityLabel,
        completedJobCount,
        completedJobs: `${completedJobCount} completed`,
        currentJobs: `${activeJobCount} active`,
        initials,
        name,
        role: emp.role === 'admin' ? 'Administrator' : emp.role === 'manager' ? 'Service manager' : 'Field technician',
        skills: emp.skills || [],
      }
    })
  }, [employees, jobs])

  // Filter team members based on search and selected filters
  const filteredTeamMembers = useMemo(() => {
    return teamMembers.filter((member) => {
      // Search text matching
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase()
        const matchesName = member.name.toLowerCase().includes(query)
        const matchesRole = member.role.toLowerCase().includes(query)
        const matchesSkill = member.skills.some((s) => s.toLowerCase().includes(query))
        if (!matchesName && !matchesRole && !matchesSkill) return false
      }

      // Skill filter matching
      if (selectedSkill !== 'all') {
        if (!member.skills.includes(selectedSkill)) return false
      }

      // Status filter matching
      if (selectedStatus !== 'all') {
        if (member.availability !== selectedStatus) return false
      }

      return true
    })
  }, [teamMembers, searchQuery, selectedSkill, selectedStatus])

  const totalPages = Math.max(1, Math.ceil(filteredTeamMembers.length / PAGE_SIZE))
  const paginatedMembers = useMemo(
    () => filteredTeamMembers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredTeamMembers, currentPage],
  )

  const hasActiveFilters = searchQuery.trim().length > 0 || selectedSkill !== 'all' || selectedStatus !== 'all'

  function clearFilters() {
    setSearchQuery('')
    setSelectedSkill('all')
    setSelectedStatus('all')
    setCurrentPage(1)
  }

  // Handle Export CSV
  const handleExportCSV = () => {
    if (filteredTeamMembers.length === 0) return

    const headers = ['Name', 'Role', 'Availability', 'Active jobs', 'Completed jobs', 'Skills']
    const rows = filteredTeamMembers.map((m) => [
      `"${m.name}"`,
      `"${m.role}"`,
      `"${m.availability}"`,
      `"${m.activeJobCount ?? 0}"`,
      `"${m.completedJobCount ?? 0}"`,
      `"${m.skills.join(', ')}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `team-roster-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-3">
      <PageHeader
        actions={
          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-9 items-center gap-2 rounded-control border border-wf-border bg-wf-surface px-3 text-[13px] font-medium text-wf-ink-2 shadow-card transition-colors hover:bg-wf-surface-sunken focus:outline-none focus:ring-2 focus:ring-wf-accent/30 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={filteredTeamMembers.length === 0}
              onClick={handleExportCSV}
              type="button"
            >
              <Download aria-hidden="true" className="size-4" />
              <span>Export CSV</span>
            </button>
            <button
              aria-label="Refresh team list"
              className="inline-flex size-9 items-center justify-center rounded-control border border-wf-border bg-wf-surface text-wf-ink-2 shadow-card transition-colors hover:bg-wf-surface-sunken focus:outline-none focus:ring-2 focus:ring-wf-accent/30"
              disabled={isRefreshing}
              onClick={refreshTeamData}
              type="button"
            >
              <RefreshCw aria-hidden="true" className={cn('size-3.5', isRefreshing && 'animate-spin')} />
            </button>
          </div>
        }
        title="Team"
      />

      {errorMessage ? (
        <div className="rounded-card border border-wf-danger/30 bg-wf-danger-wash p-3.5 text-xs font-medium text-wf-danger" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <section aria-label="Team filters" className="rounded-card border border-wf-border bg-wf-surface p-3 shadow-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-wf-ink-3"
            />
            <input
              aria-label="Find technician by name, role, or skill"
              className="h-9 w-full rounded-control border border-wf-border bg-wf-surface pl-9 pr-4 text-[13px] text-wf-ink outline-none transition placeholder:text-wf-ink-3 focus:border-wf-accent focus:ring-2 focus:ring-wf-accent/20"
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Find technician by name, role, or skill..."
              type="search"
              value={searchQuery}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              aria-label="Filter by skill"
              className="h-9 min-w-40 rounded-control border border-wf-border bg-wf-surface px-3 text-[13px] text-wf-ink outline-none transition hover:border-wf-ink-3 focus:border-wf-accent focus:ring-2 focus:ring-wf-accent/20"
              onChange={(e) => {
                setSelectedSkill(e.target.value)
                setCurrentPage(1)
              }}
              value={selectedSkill}
            >
              <option value="all">All skills</option>
              {availableSkills.map((skill) => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by status"
              className="h-9 min-w-40 rounded-control border border-wf-border bg-wf-surface px-3 text-[13px] text-wf-ink outline-none transition hover:border-wf-ink-3 focus:border-wf-accent focus:ring-2 focus:ring-wf-accent/20"
              onChange={(e) => {
                setSelectedStatus(e.target.value as Availability | 'all')
                setCurrentPage(1)
              }}
              value={selectedStatus}
            >
              <option value="all">All statuses</option>
              <option value="Available">Available</option>
              <option value="Busy">Busy</option>
              <option value="On Leave">On leave</option>
            </select>

            {hasActiveFilters ? (
              <button
                className="inline-flex h-9 items-center justify-center rounded-control border border-wf-border bg-wf-surface px-3 text-[13px] font-medium text-wf-ink-3 transition-colors hover:bg-wf-surface-sunken hover:text-wf-ink focus:outline-none focus:ring-2 focus:ring-wf-accent/30"
                onClick={clearFilters}
                type="button"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section aria-labelledby="team-members-heading" className="overflow-hidden rounded-card border border-wf-border bg-wf-surface shadow-card">
        <div className="flex items-center justify-between gap-3 border-b border-wf-separator px-4 py-3">
          <h2 className="text-[17px] font-semibold leading-[24px] text-wf-ink" id="team-members-heading">
            Team members
          </h2>
          <span className="shrink-0 text-[13px] font-medium tabular-nums text-wf-ink-3">
            {filteredTeamMembers.length} member{filteredTeamMembers.length === 1 ? '' : 's'}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-[13px] text-wf-ink-3">
            <Loader2 className="mr-2 size-4 animate-spin text-wf-accent" />
            Loading team roster...
          </div>
        ) : filteredTeamMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-wf-surface-sunken text-wf-ink-3">
              <UserCheck className="size-5" />
            </div>
            <h3 className="text-[15px] font-semibold text-wf-ink">No team members found</h3>
            <p className="mt-1 text-[13px] text-wf-ink-3">
              {teamMembers.length === 0
                ? 'No active employee profiles found in this organization.'
                : 'No technicians match your current search and filter criteria.'}
            </p>
            {hasActiveFilters ? (
              <button
                className="mt-4 inline-flex h-8 items-center justify-center rounded-control border border-wf-border bg-wf-surface px-3 text-[13px] font-medium text-wf-ink-2 shadow-card hover:bg-wf-surface-sunken focus:outline-none focus:ring-2 focus:ring-wf-accent/30"
                onClick={clearFilters}
                type="button"
              >
                Reset filters
              </button>
            ) : null}
          </div>
        ) : (
          <div className="divide-y divide-wf-separator">
            {paginatedMembers.map((member) => (
              <TeamMemberCard
                key={member.id || member.name}
                {...member}
                onSchedule={() => setIsCreateDrawerOpen(true)}
              />
            ))}
          </div>
        )}

        {!isLoading && filteredTeamMembers.length > 0 ? (
          <div className="flex flex-col gap-3 border-t border-wf-separator bg-wf-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between text-[13px] text-wf-ink-3">
            <span className="tabular-nums">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredTeamMembers.length)} of {filteredTeamMembers.length} members
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-medium text-wf-ink tabular-nums">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  aria-label="Previous page"
                  className="inline-flex h-8 items-center justify-center rounded-control border border-wf-border bg-wf-surface px-2.5 text-[13px] font-medium text-wf-ink-2 shadow-card transition-colors hover:bg-wf-surface-sunken disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                  <span className="sr-only sm:not-sr-only sm:ml-1">Previous</span>
                </button>
                <button
                  aria-label="Next page"
                  className="inline-flex h-8 items-center justify-center rounded-control border border-wf-border bg-wf-surface px-2.5 text-[13px] font-medium text-wf-ink-2 shadow-card transition-colors hover:bg-wf-surface-sunken disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  type="button"
                >
                  <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
                  <ChevronRight aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <CreateJobDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onJobCreated={() => void refreshTeamData()}
      />
    </div>
  )
}


