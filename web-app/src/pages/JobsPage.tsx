import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
} from 'lucide-react'
import { PageHeader, StatusBadge } from '@/components'

type JobRow = {
  assignedWorker: string
  customer: string
  dueTime: string
  id: string
  job: string
  location: string
  priority: 'High' | 'Low' | 'Medium'
  status: 'Completed' | 'In Progress' | 'Pending'
}

const jobs: JobRow[] = [
  {
    assignedWorker: 'Michael Chen',
    customer: 'Green Residency',
    dueTime: '14:00',
    id: 'ac-installation',
    job: 'AC Installation',
    location: '124 Park Avenue',
    priority: 'High',
    status: 'In Progress',
  },
  {
    assignedWorker: 'Unassigned',
    customer: 'City Hospital',
    dueTime: '15:30',
    id: 'electrical-repair',
    job: 'Electrical Repair',
    location: '850 Health Blvd',
    priority: 'Medium',
    status: 'Pending',
  },
  {
    assignedWorker: 'Sarah Jenkins',
    customer: 'Smith Residence',
    dueTime: '11:00',
    id: 'plumbing-leak-fix',
    job: 'Plumbing Leak Fix',
    location: '422 Oak St',
    priority: 'Low',
    status: 'Completed',
  },
]

const priorityTone: Record<JobRow['priority'], 'danger' | 'default' | 'warning'> = {
  High: 'danger',
  Low: 'default',
  Medium: 'warning',
}

const statusTone: Record<JobRow['status'], 'default' | 'primary' | 'success'> = {
  Completed: 'success',
  'In Progress': 'primary',
  Pending: 'default',
}

const filters = [
  { icon: Filter, label: 'Priority' },
  { icon: ClipboardList, label: 'Status' },
  { icon: Calendar, label: 'Date' },
]

export function JobsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <PageHeader
          title="Jobs"
          description="Track today's service jobs and team assignments."
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-80 xl:hidden">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Search jobs..."
              type="search"
            />
          </div>
          {filters.map((filter) => (
            <button
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
              key={filter.label}
              type="button"
            >
              <filter.icon aria-hidden="true" className="size-4" />
              {filter.label}
            </button>
          ))}
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Create Job
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-background/60">
                {[
                  'Job',
                  'Customer',
                  'Location',
                  'Assigned Worker',
                  'Priority',
                  'Status',
                  'Due Time',
                  'Actions',
                ].map((header) => (
                  <th
                    className="px-6 py-4 text-xs font-medium tracking-[0.08em] text-muted-foreground"
                    key={header}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {jobs.map((job) => (
                <tr className="transition hover:bg-background/60" key={job.id}>
                  <td className="px-6 py-5 font-medium text-foreground">{job.job}</td>
                  <td className="px-6 py-5 font-medium text-foreground">
                    {job.customer}
                  </td>
                  <td className="px-6 py-5 text-muted-foreground">{job.location}</td>
                  <td className="px-6 py-5">
                    <span
                      className={
                        job.assignedWorker === 'Unassigned'
                          ? 'italic text-muted-foreground'
                          : 'text-foreground'
                      }
                    >
                      {job.assignedWorker}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <StatusBadge tone={priorityTone[job.priority]}>
                      {job.priority}
                    </StatusBadge>
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex items-center gap-1.5">
                      {job.status === 'Completed' ? (
                        <Check aria-hidden="true" className="size-3.5 text-emerald-600" />
                      ) : null}
                      <StatusBadge tone={statusTone[job.status]}>
                        {job.status}
                      </StatusBadge>
                    </span>
                  </td>
                  <td className="px-6 py-5 text-muted-foreground">{job.dueTime}</td>
                  <td className="px-6 py-5 text-right">
                    <button
                      aria-label={`More actions for ${job.job}`}
                      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      type="button"
                    >
                      <MoreHorizontal aria-hidden="true" className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border bg-background/50 px-6 py-4">
          <p className="text-sm text-muted-foreground">Showing 1 to 3 of 48 jobs</p>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground opacity-50"
              disabled
              type="button"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
            <button
              className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
              type="button"
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
