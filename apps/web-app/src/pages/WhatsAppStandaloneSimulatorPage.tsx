import { useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Globe,
  QrCode,
  ShieldCheck,
  Smartphone,
  Zap,
} from 'lucide-react'
import { WhatsAppPhoneSimulator } from '@/components/whatsapp/WhatsAppPhoneSimulator'
import { useAuth } from '@/hooks'

export function WhatsAppStandaloneSimulatorPage() {
  const [searchParams] = useSearchParams()
  const { profile } = useAuth()
  const orgFromQuery = searchParams.get('org')
  const activeOrgId = orgFromQuery || profile?.organizationId || 'demo_org_default'

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const mobileUrl = `${origin}/demo/whatsapp?org=${encodeURIComponent(activeOrgId)}`
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(
    mobileUrl,
  )}`

  return (
    <div className="min-h-screen bg-wf-surface-sunken text-wf-ink">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-wf-border bg-wf-surface px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <a
            className="inline-flex items-center gap-1.5 rounded-lg border border-wf-border bg-wf-surface px-3 py-1.5 text-xs font-semibold text-wf-ink shadow-xs hover:bg-wf-surface-sunken transition-colors"
            href="/jobs"
          >
            <ArrowLeft className="size-3.5" />
            <span>Return to Manager Portal</span>
          </a>
          <span className="hidden sm:inline-block text-wf-separator">|</span>
          <span className="hidden sm:inline-block text-xs text-wf-ink-3">
            WhatsApp Customer Intake Simulator
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-900">
            Live Demo Mode
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          {/* Left Column: Phone Simulator (Centered) */}
          <div className="flex justify-center lg:col-span-7">
            <WhatsAppPhoneSimulator
              isStandalone={true}
              organizationId={activeOrgId}
            />
          </div>

          {/* Right Column: Presentation Telemetry & QR Code Sharing */}
          <div className="space-y-6 lg:col-span-5">
            {/* System Overview Card */}
            <section className="rounded-2xl border border-wf-border bg-wf-surface p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-wf-surface-sunken text-wf-ink">
                  <Cpu className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-wf-ink">
                    Decoupled Intake Pipeline
                  </h3>
                  <p className="text-xs text-wf-ink-3">
                    Multi-Agent Architecture Overview
                  </p>
                </div>
              </div>

              <div className="grid gap-3 text-xs text-wf-ink-2">
                <div className="flex items-start gap-2.5 rounded-xl border border-wf-border bg-wf-surface-sunken p-3">
                  <Smartphone className="size-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <h5 className="font-semibold text-wf-ink">
                      1. Natural Language Ingestion
                    </h5>
                    <p className="text-wf-ink-3 mt-0.5">
                      Unstructured customer communication delivered through simulated WhatsApp Business messaging.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl border border-wf-border bg-wf-surface-sunken p-3">
                  <Zap className="size-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <h5 className="font-semibold text-wf-ink">
                      2. Gemini AI Structured Drafting
                    </h5>
                    <p className="text-wf-ink-3 mt-0.5">
                      Extracts service category, urgency priority, and required technician skillsets with tenant isolation.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl border border-wf-border bg-wf-surface-sunken p-3">
                  <ShieldCheck className="size-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <h5 className="font-semibold text-wf-ink">
                      3. Dispatcher Supervised Confirm
                    </h5>
                    <p className="text-wf-ink-3 mt-0.5">
                      Manager reviews proposed job, verifies Smart Match score, and dispatches in a single atomic transaction.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Cross-Device Smartphone QR Card */}
            <section className="rounded-2xl border border-wf-border bg-wf-surface p-5 shadow-xs text-center space-y-4">
              <div className="flex items-center justify-between border-b border-wf-separator pb-3">
                <div className="flex items-center gap-2 text-left">
                  <QrCode className="size-4 text-wf-ink" />
                  <span className="text-xs font-semibold text-wf-ink">
                    Test on Real Smartphone
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-700">
                  <Globe className="size-3" />
                  <span>Cross-Device</span>
                </div>
              </div>

              <div className="mx-auto flex size-48 items-center justify-center rounded-xl border border-wf-border bg-white p-2 shadow-inner">
                <img
                  alt="Scan to open on smartphone"
                  className="size-full object-contain"
                  height={180}
                  src={qrImageUrl}
                  width={180}
                />
              </div>

              <div className="space-y-1 text-xs text-wf-ink-3">
                <p className="font-medium text-wf-ink">
                  Scan code with your phone camera
                </p>
                <p>
                  Open this page on your actual mobile phone to experience real-time dispatch synchronization across devices.
                </p>
              </div>

              <div className="pt-1">
                <a
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-wf-accent hover:underline"
                  href={mobileUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>Direct Browser Link</span>
                </a>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
