import { PriorityBadge, StatusBadge } from '@/components'
import type { Job } from '@/types/job'

export type JobTableProps = {
  jobs: Job[]
  onSelectJob?: (job: Job) => void
}

export function JobTable({ jobs, onSelectJob }: JobTableProps) {
  if (jobs.length === 0) {
    return null
  }

  return (
    <div className="overflow-x-auto rounded-card border border-wf-border bg-wf-surface shadow-card">
      <table className="w-full text-left text-[15px]">
        <thead className="border-b border-wf-separator bg-wf-surface-raised text-[13px] font-medium text-wf-ink-3">
          <tr>
            <th className="px-4 py-3">Job details</th>
            <th className="px-4 py-3">Customer & location</th>
            <th className="px-4 py-3">Priority</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-wf-separator">
          {jobs.map((job) => (
            <tr
              key={job.id}
              className="h-14 hover:bg-wf-surface-sunken transition-colors cursor-pointer"
              onClick={() => onSelectJob?.(job)}
            >
              <td className="px-4 py-2.5">
                <p className="font-medium text-wf-ink text-[15px] leading-tight">
                  {job.title}
                </p>
                <p className="mt-0.5 text-[13px] text-wf-ink-3 line-clamp-1">
                  {job.description || 'No description provided'}
                </p>
              </td>
              <td className="px-4 py-2.5">
                <p className="font-medium text-wf-ink text-[15px]">{job.customerName}</p>
                <p className="text-[13px] text-wf-ink-3">{job.location || job.serviceAddress}</p>
              </td>
              <td className="px-4 py-2.5">
                <PriorityBadge priority={job.priority} />
              </td>
              <td className="px-4 py-2.5">
                <StatusBadge tone={job.status === 'completed' ? 'success' : 'default'}>
                  {job.status.replace('_', ' ')}
                </StatusBadge>
              </td>
              <td className="px-4 py-2.5 text-right">
                <button
                  className="rounded-control border border-wf-border bg-wf-surface px-3 py-1.5 text-[13px] font-medium text-wf-ink-2 hover:bg-wf-surface-sunken focus:outline-none focus:ring-2 focus:ring-wf-accent/30"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectJob?.(job)
                  }}
                  type="button"
                >
                  View details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

