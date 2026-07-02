import { useParams } from 'react-router-dom'
import { PagePlaceholder } from '@/components/PagePlaceholder'

export function JobDetailsPage() {
  const { jobId } = useParams()

  return <PagePlaceholder eyebrow={jobId ? `Job ${jobId}` : 'Job'} title="Job Details" />
}
