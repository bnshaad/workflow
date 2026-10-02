import { useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { WhatsAppPhoneSimulator } from '@/components/whatsapp/WhatsAppPhoneSimulator'
import { useAuth } from '@/hooks'

export function WhatsAppStandaloneSimulatorPage() {
  const [searchParams] = useSearchParams()
  const { profile } = useAuth()
  const orgFromQuery = searchParams.get('org')
  const activeOrgId = orgFromQuery || profile?.organizationId || 'demo_org_default'

  return (
    <div className="min-h-screen bg-wf-surface-sunken text-wf-ink">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-wf-border bg-wf-surface px-4 sm:px-6 shadow-xs">
        <div className="flex items-center gap-3">
          <a
            className="inline-flex items-center gap-1.5 rounded-lg border border-wf-border bg-wf-surface px-3 py-1.5 text-xs font-semibold text-wf-ink shadow-xs hover:bg-wf-surface-sunken transition-colors"
            href="/jobs"
          >
            <ArrowLeft className="size-3.5" />
            <span>Return to Manager Portal</span>
          </a>
          <span className="hidden sm:inline-block text-wf-separator">|</span>
          <span className="hidden sm:inline-block text-xs font-medium text-wf-ink-2">
            WhatsApp Customer Simulator
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-900">
            Live Demo
          </span>
        </div>
      </header>

      {/* Main Simulator View - Centered & Clean */}
      <main className="mx-auto flex justify-center p-4 sm:p-6 lg:p-8">
        <WhatsAppPhoneSimulator
          isStandalone={true}
          organizationId={activeOrgId}
        />
      </main>
    </div>
  )
}
