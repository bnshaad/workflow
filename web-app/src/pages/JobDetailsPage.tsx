import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Download,
  Edit3,
  MapPin,
  Phone,
  Settings2,
} from 'lucide-react'
import {
  DataTable,
  IssueCard,
  ProofGallery,
  StatusBadge,
  SuggestedWorkerCard,
  Timeline,
} from '@/components'

const job = {
  assignedWorker: 'Pending assignment',
  customer: {
    address: '123 Maple Street, Springfield, IL 62704',
    name: 'Sarah Jenkins',
    phone: '(555) 123-4567',
  },
  description:
    'Perform annual preventive maintenance on main residential AC unit. Check coolant levels, replace filters, inspect belts, and clear condensation lines. Verify thermostat communication.',
  dueDate: 'Oct 24, 2023',
  duration: '2.5h',
  facility: 'Jenkins Residence (Main Unit)',
  id: 'JOB-4829',
  location: '123 Maple Street, Springfield, IL 62704',
  priority: 'Normal',
  scheduleDate: 'Oct 24, 2023 (13:00 - 17:00)',
  title: 'Annual HVAC Inspection',
  travelTime: '15 mins',
  type: 'Maintenance',
}

const suggestedWorker = {
  matchScore: 98,
  name: 'Alex Rivera',
  reasons: [
    'Required skills',
    'Available now',
    'Nearby',
    'Low workload',
    'Strong completion history',
  ],
  role: 'Senior HVAC Technician',
}

const timelineItems = [
  { state: 'done' as const, time: 'Today, 08:30 AM', title: 'Job Created' },
  { state: 'current' as const, time: 'Today, 08:31 AM', title: 'Worker Suggested' },
  { state: 'pending' as const, time: 'Pending', title: 'Worker Assigned' },
  { state: 'pending' as const, time: 'Pending', title: 'Work Started' },
  { state: 'pending' as const, time: 'Pending', title: 'Work Proof Uploaded' },
  { state: 'pending' as const, time: 'Pending', title: 'Reviewed' },
  { state: 'pending' as const, time: 'Pending', title: 'Completed' },
]

const activityRows = [
  {
    action: 'Job Created',
    details: 'Generated from PM Template #HVAC-ANNUAL',
    id: 'created',
    timestamp: 'Oct 23, 08:30:12',
    user: 'System',
  },
  {
    action: 'Worker Suggested',
    details: 'Evaluated available workers; Suggested A. Rivera',
    id: 'suggested',
    timestamp: 'Oct 23, 08:31:05',
    user: 'System',
  },
]

function InfoCard({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="border-b border-border pb-4 text-lg font-semibold text-foreground">
        {title}
      </h2>
      <div className="pt-6">{children}</div>
    </section>
  )
}

function DetailItem({
  children,
  label,
}: {
  children: React.ReactNode
  label: string
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <div className="text-sm leading-6 text-foreground">{children}</div>
    </div>
  )
}

export function JobDetailsPage() {
  return (
    <div className="space-y-8">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Jobs</span>
        <ChevronRight aria-hidden="true" className="size-4" />
        <span>{job.type}</span>
        <ChevronRight aria-hidden="true" className="size-4" />
        <span className="font-medium text-foreground">{job.id}</span>
      </nav>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {job.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StatusBadge tone="warning">Pending Assignment</StatusBadge>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar aria-hidden="true" className="size-4" />
              Due: {job.dueDate}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
            type="button"
          >
            <Edit3 aria-hidden="true" className="size-4" />
            Edit Job
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-500 bg-card px-4 text-sm font-medium text-emerald-600 shadow-sm transition hover:bg-emerald-50"
            type="button"
          >
            <CheckCircle2 aria-hidden="true" className="size-4" />
            Mark Complete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <InfoCard title="Job Information">
            <DetailItem label="Description">{job.description}</DetailItem>
          </InfoCard>

          <InfoCard title="Customer Information">
            <div className="grid gap-6 md:grid-cols-3">
              <DetailItem label="Customer Name">{job.customer.name}</DetailItem>
              <DetailItem label="Phone">
                <span className="inline-flex items-center gap-2">
                  <Phone aria-hidden="true" className="size-4 text-muted-foreground" />
                  {job.customer.phone}
                </span>
              </DetailItem>
              <DetailItem label="Service Address">
                <span className="inline-flex items-start gap-2">
                  <MapPin
                    aria-hidden="true"
                    className="mt-1 size-4 shrink-0 text-muted-foreground"
                  />
                  {job.customer.address}
                </span>
              </DetailItem>
              <DetailItem label="Job Type">{job.type}</DetailItem>
              <DetailItem label="Schedule Date">{job.scheduleDate}</DetailItem>
              <DetailItem label="Estimated Duration">{job.duration}</DetailItem>
            </div>
          </InfoCard>

          <SuggestedWorkerCard {...suggestedWorker} />

          <InfoCard title="Assigned Worker">
            <div className="rounded-lg border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
              {job.assignedWorker}
            </div>
          </InfoCard>

          <InfoCard title="Location">
            <div className="grid gap-6 md:grid-cols-4">
              <div className="md:col-span-2">
                <DetailItem label="Facility Name / Details">{job.facility}</DetailItem>
              </div>
              <DetailItem label="Travel Time">{job.travelTime}</DetailItem>
              <DetailItem label="Priority">{job.priority}</DetailItem>
            </div>
          </InfoCard>
        </div>

        <aside className="space-y-6">
          <Timeline items={timelineItems} />
          <ProofGallery
            notes="Pending"
            uploadedTime="Pending"
            verificationStatus="Pending"
          />
          <section className="rounded-xl border border-amber-500/30 bg-card p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
              <Settings2 aria-hidden="true" className="size-5 text-amber-500" />
              Job Issues
            </h2>
            <div className="space-y-3">
              <IssueCard
                title="Customer unavailable"
                description="Customer is not answering the door or phone calls. Reported 5 mins ago."
              />
              <IssueCard
                tone="primary"
                title="Waiting for spare parts"
                description="Specialized filter for Model X-2000 is currently out of stock. System status."
              />
            </div>
          </section>
        </aside>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-background/40 px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Activity</h2>
          <button
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
            type="button"
          >
            Export History
            <Download aria-hidden="true" className="size-4" />
          </button>
        </div>
        <DataTable
          rows={activityRows}
          columns={[
            { header: 'Timestamp', key: 'timestamp' },
            { header: 'User / System', key: 'user' },
            { header: 'Action', key: 'action' },
            {
              header: 'Details',
              key: 'details',
              render: (row) => (
                <span className="text-muted-foreground">{row.details}</span>
              ),
            },
          ]}
        />
      </section>
    </div>
  )
}
