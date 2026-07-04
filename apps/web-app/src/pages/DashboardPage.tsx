import {
  AlertTriangle,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ClipboardList,
  Plus,
  RefreshCcw,
  Upload,
  UserPlus,
  UsersRound,
} from 'lucide-react'
import {
  DataTable,
  MetricCard,
  PageHeader,
  RecentActivityItem,
  StatusBadge,
} from '@/components'

type RecentJob = {
  customer: string
  id: string
  jobId: string
  status: 'Completed' | 'In Progress' | 'Needs Dispatch' | 'Scheduled'
  teamMember: string
  teamMemberInitials: string
}

const metrics = [
  {
    icon: BriefcaseBusiness,
    label: 'Active Jobs',
    value: '24',
  },
  {
    icon: ClipboardList,
    label: 'Pending Assignments',
    value: '5',
  },
  {
    icon: RefreshCcw,
    label: 'Jobs In Progress',
    tone: 'primary' as const,
    value: '8',
  },
  {
    icon: CheckCircle2,
    label: 'Completed Today',
    tone: 'success' as const,
    value: '12',
  },
  {
    icon: UsersRound,
    label: 'Available Team Members',
    value: '12',
  },
  {
    icon: AlertTriangle,
    label: 'Open Issues',
    tone: 'danger' as const,
    value: '0',
  },
]

const recentJobs: RecentJob[] = [
  {
    customer: '123 Main St - AC Tune-up',
    id: 'job-0842',
    jobId: '#JOB-0842',
    status: 'In Progress',
    teamMember: 'J. Smith',
    teamMemberInitials: 'JS',
  },
  {
    customer: '456 Elm St - Leaky Faucet',
    id: 'job-0841',
    jobId: '#JOB-0841',
    status: 'Needs Dispatch',
    teamMember: 'A. Wong',
    teamMemberInitials: 'AW',
  },
  {
    customer: '789 Oak Ave - Water Heater Repair',
    id: 'job-0840',
    jobId: '#JOB-0840',
    status: 'Completed',
    teamMember: 'R. Jones',
    teamMemberInitials: 'RJ',
  },
  {
    customer: '202 Cedar Rd - Furnace Inspection',
    id: 'job-0838',
    jobId: '#JOB-0838',
    status: 'Scheduled',
    teamMember: 'M. Khan',
    teamMemberInitials: 'MK',
  },
]

const recentActivity = [
  {
    icon: UserPlus,
    meta: 'Just now - Admin',
    text: 'Suggested Worker assigned to #JOB-0842',
    tone: 'primary' as const,
  },
  {
    icon: Upload,
    meta: '5 mins ago - E. Lee',
    text: 'Work Proof uploaded for #JOB-0839',
  },
  {
    icon: AlertTriangle,
    meta: '15 mins ago - M. Khan',
    text: 'Issue reported: Material shortage',
    tone: 'danger' as const,
  },
  {
    icon: Check,
    meta: '45 mins ago - R. Jones',
    text: 'Job #JOB-0840 completed',
    tone: 'success' as const,
  },
  {
    icon: CheckCircle2,
    meta: '1 hour ago - S. Manager',
    text: 'Manager approved assignment #JOB-0838',
    tone: 'primary' as const,
  },
]

const statusTone: Record<RecentJob['status'], 'default' | 'primary' | 'success' | 'warning'> = {
  Completed: 'success',
  'In Progress': 'primary',
  'Needs Dispatch': 'warning',
  Scheduled: 'default',
}

export function DashboardPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Today's Overview"
        description="Operational snapshot for your service business."
        actions={
          <>
            <button
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
              type="button"
            >
              <UserPlus aria-hidden="true" className="size-4" />
              Add Team Member
            </button>
            <button
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
              Create Job
            </button>
          </>
        }
      />

      <section
        aria-label="Dashboard metrics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-8 py-6">
            <h2 className="text-lg font-semibold text-foreground">Recent Jobs</h2>
            <button
              className="text-sm font-medium text-primary transition hover:text-primary/80"
              type="button"
            >
              View All
            </button>
          </div>
          <DataTable
            rows={recentJobs}
            columns={[
              {
                header: 'Job ID',
                key: 'jobId',
                render: (job) => (
                  <span className="font-mono text-sm text-muted-foreground">
                    {job.jobId}
                  </span>
                ),
              },
              {
                header: 'Customer / Description',
                key: 'customer',
                render: (job) => (
                  <span className="font-medium text-foreground">{job.customer}</span>
                ),
              },
              {
                header: 'Team Member',
                key: 'teamMember',
                render: (job) => (
                  <span className="flex items-center gap-3 text-muted-foreground">
                    <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                      {job.teamMemberInitials}
                    </span>
                    {job.teamMember}
                  </span>
                ),
              },
              {
                header: 'Status',
                key: 'status',
                render: (job) => (
                  <StatusBadge tone={statusTone[job.status]}>{job.status}</StatusBadge>
                ),
              },
            ]}
          />
        </section>

        <section className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
          <div className="relative mt-8 space-y-8 pl-5 before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border">
            {recentActivity.map((item) => (
              <RecentActivityItem key={`${item.text}-${item.meta}`} {...item} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
