import { Download, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { PageHeader, TeamMemberCard, type TeamMember } from '@/components'

const teamMembers: TeamMember[] = [
  {
    availability: 'Available',
    completedJobs: '12 this week',
    currentJobs: '2 Active',
    initials: 'MC',
    name: 'Michael Chen',
    role: 'Senior HVAC Tech',
    skills: ['HVAC', 'Electrical'],
  },
  {
    availability: 'Busy',
    completedJobs: '15 this week',
    currentJobs: 'Fully Booked',
    initials: 'SJ',
    name: 'Sarah Jenkins',
    role: 'Master Plumber',
    skills: ['Plumbing', 'HVAC'],
  },
  {
    availability: 'Available',
    completedJobs: '8 this week',
    currentJobs: '1 Active',
    initials: 'DR',
    name: 'David Rodriguez',
    role: 'Electrician II',
    skills: ['Electrical'],
  },
  {
    availability: 'On Leave',
    completedJobs: '2 this week',
    currentJobs: '0 Active',
    initials: 'AL',
    name: 'Anita Lopez',
    role: 'General Handyman',
    skills: ['General', 'Plumbing'],
  },
]

export function TeamPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Team"
        description="See who's available and what everyone is working on."
        actions={
          <>
            <button
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
              type="button"
            >
              <Download aria-hidden="true" className="size-4" />
              Export
            </button>
            <button
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
              Add Team Member
            </button>
          </>
        }
      />

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              className="h-12 w-full rounded-lg border border-border bg-background pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Find someone by name or skill..."
              type="search"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              className="h-12 min-w-44 rounded-lg border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              defaultValue="Any Skill"
            >
              <option>Any Skill</option>
              <option>HVAC</option>
              <option>Electrical</option>
              <option>Plumbing</option>
              <option>General</option>
            </select>
            <select
              className="h-12 min-w-44 rounded-lg border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              defaultValue="Any Status"
            >
              <option>Any Status</option>
              <option>Available</option>
              <option>Busy</option>
              <option>On Leave</option>
            </select>
            <button
              className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-card px-4 text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground"
              type="button"
              aria-label="More filters"
            >
              <SlidersHorizontal aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>
      </section>

      <section
        aria-label="Team members"
        className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4"
      >
        {teamMembers.map((member) => (
          <TeamMemberCard key={member.name} {...member} />
        ))}
      </section>
    </div>
  )
}
