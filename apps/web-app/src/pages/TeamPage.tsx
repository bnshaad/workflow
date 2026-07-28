import { useEffect, useMemo, useState } from 'react'
import { Download, Loader2, RefreshCw, Search, UserCheck } from 'lucide-react'
import { CreateJobDrawer, PageHeader, TeamMemberCard, type TeamMember } from '@/components'
import type { Availability } from '@/components/AvailabilityBadge'
import { useAuth } from '@/hooks'
import { jobService } from '@/services/jobs'
import { cacheService } from '@/services/cache/cacheService'
import type { Job, UserProfile } from '@/types'

export function TeamPage() {
  const { profile } = useAuth()
  const [employees, setEmployees] = useState<UserProfile[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false)


  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSkill, setSelectedSkill] = useState('Any Skill')
  const [selectedStatus, setSelectedStatus] = useState('Any Status')

  const refreshTeamData = async () => {
    if (!profile) return

    cacheService.invalidate()
    setIsLoading(true)
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
      setIsLoading(false)
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
        availability: availabilityLabel,
        completedJobs: `${completedJobCount} Completed`,
        currentJobs: activeJobCount === 0 ? '0 Active' : `${activeJobCount} Active`,
        initials,
        name,
        role: emp.role === 'admin' ? 'Administrator' : emp.role === 'manager' ? 'Service Manager' : 'Field Technician',
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
      if (selectedSkill !== 'Any Skill') {
        if (!member.skills.includes(selectedSkill)) return false
      }

      // Status filter matching
      if (selectedStatus !== 'Any Status') {
        if (member.availability !== selectedStatus) return false
      }

      return true
    })
  }, [teamMembers, searchQuery, selectedSkill, selectedStatus])

  // Handle Export CSV
  const handleExportCSV = () => {
    if (filteredTeamMembers.length === 0) return

    const headers = ['Name', 'Role', 'Availability', 'Active Jobs', 'Completed Jobs', 'Skills']
    const rows = filteredTeamMembers.map((m) => [
      `"${m.name}"`,
      `"${m.role}"`,
      `"${m.availability}"`,
      `"${m.currentJobs}"`,
      `"${m.completedJobs}"`,
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
        title="Team"
        actions={
          <>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              type="button"
              onClick={handleExportCSV}
              disabled={filteredTeamMembers.length === 0}
            >
              <Download aria-hidden="true" className="size-4" />
              Export CSV
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
              type="button"
              onClick={refreshTeamData}
              title="Refresh Team List"
            >
              <RefreshCw aria-hidden="true" className="size-4" />
            </button>
          </>
        }
      />

      {errorMessage ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-lg border border-border bg-card p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Find technician by name, role, or skill..."
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              className="h-10 min-w-40 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
            >
              <option value="Any Skill">Any Skill</option>
              {availableSkills.map((skill) => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </select>

            <select
              className="h-10 min-w-40 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="Any Status">Any Status</option>
              <option value="Available">Available</option>
              <option value="Busy">Busy</option>
              <option value="On Leave">On Leave</option>
            </select>

            {(searchQuery || selectedSkill !== 'Any Skill' || selectedStatus !== 'Any Status') ? (
              <button
                className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedSkill('Any Skill')
                  setSelectedStatus('Any Status')
                }}
              >
                Clear Filters
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section aria-label="Team members" className="overflow-hidden rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin text-primary" />
            Loading team roster from Firestore...
          </div>
        ) : filteredTeamMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
              <UserCheck className="size-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No Team Members Found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {teamMembers.length === 0
                ? 'No active employee profiles found in this organization.'
                : 'No technicians match your current search and filter criteria.'}
            </p>
            {teamMembers.length > 0 ? (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedSkill('Any Skill')
                  setSelectedStatus('Any Status')
                }}
                className="mt-4 rounded-md border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
                type="button"
              >
                Reset Filters
              </button>
            ) : null}
          </div>
        ) : (
          filteredTeamMembers.map((member) => (
            <TeamMemberCard
              key={member.id || member.name}
              {...member}
              onSchedule={() => setIsCreateDrawerOpen(true)}
            />
          ))
        )}
      </section>

      <CreateJobDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onJobCreated={() => void refreshTeamData()}
      />
    </div>
  )
}

