import { useEffect, useRef, useState } from 'react'
import {
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Lock,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  QrCode,
  Send,
  Sparkles,
  Video,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { useAuth } from '@/hooks'
import type { UserProfile } from '@/types'
import {
  whatsappDemoService,
  type SimulateMessageResponse,
} from '@/services/whatsapp/whatsappDemoService'
import { cn } from '@/utils'
import {
  playWhatsAppReceiveSound,
  playWhatsAppSendSound,
} from '@/utils/audioFeedback'
import { QRCodeModal } from './QRCodeModal'
import {
  WHATSAPP_SCENARIOS,
  type WhatsAppScenario,
} from './whatsappScenarios'

type ChatMessage = {
  id: string
  direction: 'inbound' | 'outbound'
  text: string
  time: string
  status?: 'sending' | 'sent' | 'delivered' | 'read'
  proposalRef?: string
}

type WhatsAppPhoneSimulatorProps = {
  isOpen?: boolean
  onClose?: () => void
  onProposalCreated?: (proposalId: string) => void
  isStandalone?: boolean
  organizationId?: string
}

export function WhatsAppPhoneSimulator({
  isOpen = true,
  onClose,
  onProposalCreated,
  isStandalone = false,
  organizationId: propOrgId,
}: WhatsAppPhoneSimulatorProps) {
  const { profile } = useAuth()
  const activeOrgId = propOrgId || profile?.organizationId || 'demo_org_default'

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    WHATSAPP_SCENARIOS[0].id,
  )
  const [inputText, setInputText] = useState<string>(
    WHATSAPP_SCENARIOS[0].message,
  )
  const [senderName, setSenderName] = useState<string>(
    WHATSAPP_SCENARIOS[0].name,
  )
  const [senderPhone, setSenderPhone] = useState<string>(
    WHATSAPP_SCENARIOS[0].phone,
  )

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isBotTyping, setIsBotTyping] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSoundMuted, setIsSoundMuted] = useState(false)
  const [isQRModalOpen, setIsQRModalOpen] = useState(false)
  const [lastResponse, setLastResponse] =
    useState<SimulateMessageResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const chatScrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages, isBotTyping])

  if (!isOpen) return null

  const handleSelectScenario = (scenario: WhatsAppScenario) => {
    setSelectedScenarioId(scenario.id)
    setSenderName(scenario.name)
    setSenderPhone(scenario.phone)
    setInputText(scenario.message)
    setErrorMessage(null)
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const textToSend = inputText.trim()
    if (!textToSend || isSubmitting) return

    const now = new Date()
    const timeString = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })

    const customerMsgId = `cust_${Date.now()}`
    const newCustomerMessage: ChatMessage = {
      id: customerMsgId,
      direction: 'outbound',
      text: textToSend,
      time: timeString,
      status: 'sending',
    }

    setChatMessages((prev) => [...prev, newCustomerMessage])
    setInputText('')
    setIsSubmitting(true)
    setErrorMessage(null)

    if (!isSoundMuted) {
      playWhatsAppSendSound()
    }

    // Step 1: Simulate single tick -> double tick
    setTimeout(() => {
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === customerMsgId ? { ...m, status: 'delivered' } : m,
        ),
      )
    }, 350)

    // Step 2: Double tick -> Read blue ticks & Bot typing indicator
    setTimeout(() => {
      setChatMessages((prev) =>
        prev.map((m) => (m.id === customerMsgId ? { ...m, status: 'read' } : m)),
      )
      setIsBotTyping(true)
    }, 700)

    try {
      // Create user profile proxy if unauthenticated on standalone view
      const activeProfile: UserProfile = profile || {
        id: 'demo_customer_user',
        organizationId: activeOrgId,
        role: 'manager',
        displayName: senderName || 'Demo Customer',
        email: 'customer@demo.local',
        skills: [],
        availability: 'available',
        activeTaskCount: 0,
        performanceScore: 100,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }

      const response = await whatsappDemoService.simulateCustomerMessage(
        activeProfile,
        {
          messageText: textToSend,
          senderName: senderName.trim(),
          senderPhone: senderPhone.trim(),
        },
      )

      setLastResponse(response)

      // Step 3: Deliver bot acknowledgment message
      setTimeout(() => {
        setIsBotTyping(false)
        if (!isSoundMuted) {
          playWhatsAppReceiveSound()
        }

        const botMsgTime = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })

        const botReplyMessage: ChatMessage = {
          id: `bot_${Date.now()}`,
          direction: 'inbound',
          text: response.ackMessage,
          time: botMsgTime,
          proposalRef: response.proposalId.slice(-6).toUpperCase(),
        }

        setChatMessages((prev) => [...prev, botReplyMessage])

        if (onProposalCreated) {
          onProposalCreated(response.proposalId)
        }
      }, 1100)
    } catch (err: unknown) {
      setIsBotTyping(false)
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to deliver message. Check connection status.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Content of the phone simulator itself
  const phoneFrame = (
    <div className="relative flex flex-col w-full max-w-[380px] h-[660px] max-h-[90vh] rounded-[44px] border-[10px] border-slate-900 bg-slate-900 shadow-2xl overflow-hidden select-none">
      {/* Top Dynamic Island Notch */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 flex h-5 w-28 items-center justify-between rounded-full bg-black px-2.5">
        <span className="size-2 rounded-full bg-slate-800" />
        <span className="size-2.5 rounded-full bg-slate-900 border border-slate-700/50" />
      </div>

      {/* Screen Area */}
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-[34px] bg-[#EFEAE2]">
        {/* Status Bar */}
        <div className="flex h-10 items-end justify-between px-6 pb-1 text-[11px] font-semibold text-slate-800 bg-[#008069] text-white/90">
          <span>09:41</span>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="inline-block size-1.5 rounded-full bg-white/90" />
            <span className="inline-block size-1.5 rounded-full bg-white/90" />
            <span className="text-[10px] font-bold">5G</span>
          </div>
        </div>

        {/* WhatsApp App Header */}
        <div className="flex items-center justify-between bg-[#008069] px-3 py-2 text-white shadow-md">
          <div className="flex items-center gap-2">
            <button
              aria-label="Back"
              className="rounded p-1 text-white/90 hover:bg-black/10 transition-colors"
              onClick={onClose}
              type="button"
            >
              <ChevronLeft className="size-5" />
            </button>

            {/* Avatar */}
            <div className="relative flex size-9 items-center justify-center rounded-full bg-white text-[#008069] font-bold text-xs shadow-sm">
              <span>QF</span>
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-emerald-500" />
            </div>

            {/* Title & Status */}
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="truncate text-xs font-semibold tracking-tight">
                  QuickFix Services
                </span>
                <CheckCircle2 className="size-3 text-white fill-white shrink-0" />
              </div>
              <p className="text-[10px] text-white/80 leading-none">
                {isBotTyping ? (
                  <span className="font-semibold text-emerald-100">
                    typing...
                  </span>
                ) : (
                  'online'
                )}
              </p>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1 text-white/90">
            <button
              aria-label="Video call"
              className="rounded p-1.5 hover:bg-black/10"
              type="button"
            >
              <Video className="size-4" />
            </button>
            <button
              aria-label="Phone call"
              className="rounded p-1.5 hover:bg-black/10"
              type="button"
            >
              <Phone className="size-4" />
            </button>
            <button
              aria-label="Menu"
              className="rounded p-1.5 hover:bg-black/10"
              type="button"
            >
              <MoreVertical className="size-4" />
            </button>
          </div>
        </div>

        {/* Chat Feed */}
        <div
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-[#EFEAE2] text-[12px] leading-relaxed"
          style={{
            backgroundImage:
              'radial-gradient(#000000 0.5px, transparent 0.5px)',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0',
            opacity: 0.98,
          }}
        >
          {/* Encryption Notice */}
          <div className="flex justify-center my-1">
            <div className="flex items-center gap-1.5 rounded-lg bg-[#FFEEC9]/90 px-3 py-1.5 text-[10px] text-amber-900 shadow-sm text-center max-w-[90%]">
              <Lock className="size-3 shrink-0 text-amber-800" />
              <span>
                Messages and calls are end-to-end encrypted. No one outside of this chat can read them.
              </span>
            </div>
          </div>

          {/* Date Badge */}
          <div className="flex justify-center my-1">
            <span className="rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 shadow-xs">
              Today
            </span>
          </div>

          {/* Render Messages */}
          {chatMessages.map((msg) => {
            const isOutbound = msg.direction === 'outbound'
            return (
              <div
                key={msg.id}
                className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'relative max-w-[84%] rounded-xl p-2.5 shadow-xs',
                    isOutbound
                      ? 'bg-[#D9FDD3] text-[#111B21] rounded-tr-none'
                      : 'bg-white text-[#111B21] rounded-tl-none',
                  )}
                >
                  <p className="whitespace-pre-wrap text-[12px]">{msg.text}</p>

                  {/* Ref Code Badge for Inbound */}
                  {msg.proposalRef ? (
                    <div className="mt-1.5 flex items-center justify-between border-t border-slate-200/60 pt-1 text-[10px]">
                      <span className="font-semibold text-emerald-800">
                        Reference Code
                      </span>
                      <span className="rounded bg-emerald-100 px-1.5 py-0.2 font-mono font-bold text-emerald-900">
                        #{msg.proposalRef}
                      </span>
                    </div>
                  ) : null}

                  {/* Timestamp & Status */}
                  <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-500">
                    <span>{msg.time}</span>
                    {isOutbound ? (
                      msg.status === 'read' ? (
                        <CheckCheck className="size-3.5 text-[#53BDEB]" />
                      ) : msg.status === 'delivered' ? (
                        <CheckCheck className="size-3.5 text-slate-400" />
                      ) : (
                        <Check className="size-3.5 text-slate-400" />
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Typing indicator bubble */}
          {isBotTyping ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-xl rounded-tl-none bg-white px-3 py-2 text-[11px] text-slate-500 shadow-xs">
                <span className="size-1.5 rounded-full bg-slate-400 animate-bounce" />
                <span className="size-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                <span className="size-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1 text-[10px] text-slate-400">QuickFix</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Error Notification */}
        {errorMessage ? (
          <div className="bg-red-50 border-t border-red-200 px-3 py-1.5 text-[11px] text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {/* Bottom Input Controls */}
        <div className="border-t border-slate-200 bg-[#F0F2F5] p-2">
          <form className="flex items-center gap-1.5" onSubmit={handleSendMessage}>
            <button
              aria-label="Attach file"
              className="rounded-full p-2 text-slate-600 hover:bg-slate-200/80 transition-colors"
              type="button"
            >
              <Paperclip className="size-4" />
            </button>

            <div className="relative flex-1">
              <input
                className="w-full rounded-full border border-slate-300 bg-white py-2 pl-3.5 pr-8 text-xs text-[#111B21] placeholder:text-slate-400 focus:border-[#008069] focus:outline-none"
                disabled={isSubmitting}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message..."
                type="text"
                value={inputText}
              />
              <button
                aria-label="Voice note"
                className="absolute right-2 top-2 text-slate-500 hover:text-slate-800"
                type="button"
              >
                <Mic className="size-3.5" />
              </button>
            </div>

            <button
              aria-label="Send message"
              className={cn(
                'flex size-9 items-center justify-center rounded-full bg-[#008069] text-white shadow-sm transition-transform active:scale-95',
                isSubmitting && 'opacity-60 cursor-not-allowed',
              )}
              disabled={isSubmitting || !inputText.trim()}
              type="submit"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )

  // Top Scenario Quick Bar & Simulator Controls
  const controlPanel = (
    <div className="flex flex-col gap-3.5 w-full max-w-[420px] bg-wf-surface rounded-2xl border border-wf-border p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-wf-separator pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-wf-ink">
              Scenario Presets
            </h4>
            <p className="text-[11px] text-wf-ink-3">
              One-click customer message injection
            </p>
          </div>
        </div>

        {/* Toolbar: Sound & QR Code */}
        <div className="flex items-center gap-1.5">
          <button
            aria-label={isSoundMuted ? 'Unmute sounds' : 'Mute sounds'}
            className={cn(
              'rounded-lg p-1.5 text-xs transition-colors border border-wf-border',
              isSoundMuted
                ? 'bg-wf-surface-sunken text-wf-ink-3'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200',
            )}
            onClick={() => setIsSoundMuted(!isSoundMuted)}
            title={isSoundMuted ? 'Unmute sounds' : 'Mute sounds'}
            type="button"
          >
            {isSoundMuted ? (
              <VolumeX className="size-3.5" />
            ) : (
              <Volume2 className="size-3.5" />
            )}
          </button>

          <button
            aria-label="Test on real mobile device via QR"
            className="inline-flex items-center gap-1 rounded-lg border border-wf-border bg-wf-surface px-2 py-1 text-xs font-medium text-wf-ink shadow-xs hover:bg-wf-surface-sunken transition-colors"
            onClick={() => setIsQRModalOpen(true)}
            title="Scan QR Code to open on mobile"
            type="button"
          >
            <QrCode className="size-3.5" />
            <span className="hidden sm:inline">Phone QR</span>
          </button>

          {!isStandalone ? (
            <a
              className="rounded-lg border border-wf-border bg-wf-surface p-1.5 text-wf-ink hover:bg-wf-surface-sunken transition-colors"
              href={`/demo/whatsapp?org=${encodeURIComponent(activeOrgId)}`}
              rel="noreferrer"
              target="_blank"
              title="Open standalone view"
            >
              <ExternalLink className="size-3.5" />
            </a>
          ) : null}
        </div>
      </div>

      {/* Preset Scenario Buttons */}
      <div className="grid gap-2">
        {WHATSAPP_SCENARIOS.map((sc) => {
          const IconComponent = sc.icon
          const isSelected = selectedScenarioId === sc.id
          return (
            <button
              key={sc.id}
              className={cn(
                'flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all',
                isSelected
                  ? 'border-emerald-600 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-600/30'
                  : 'border-wf-border bg-wf-surface hover:bg-wf-surface-sunken',
              )}
              onClick={() => handleSelectScenario(sc)}
              type="button"
            >
              <div
                className={cn(
                  'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg',
                  isSelected
                    ? 'bg-emerald-600 text-white'
                    : 'bg-wf-surface-sunken text-wf-ink-3',
                )}
              >
                <IconComponent className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    {sc.category}
                  </span>
                  <span className="text-[10px] text-wf-ink-3">{sc.location}</span>
                </div>
                <h5 className="text-xs font-semibold text-wf-ink line-clamp-1">
                  {sc.title}
                </h5>
                <p className="text-[11px] text-wf-ink-3 line-clamp-1 mt-0.5">
                  {sc.name} ({sc.phone})
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Proposal Output Notification Banner */}
      {lastResponse ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
              <Check className="size-4 text-emerald-700" />
              <span>Job Proposal Extracted by AI</span>
            </div>
            <span className="rounded bg-emerald-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-900">
              #{lastResponse.proposalId.slice(-6).toUpperCase()}
            </span>
          </div>
          <div className="text-[11px] text-emerald-900">
            <span className="font-semibold">{lastResponse.payload.title}</span> •{' '}
            <span>{lastResponse.payload.priority.toUpperCase()} priority</span>
          </div>
          {onProposalCreated && onClose ? (
            <button
              className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-wf-ink py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-black transition-colors"
              onClick={() => {
                onClose()
                onProposalCreated(lastResponse.proposalId)
              }}
              type="button"
            >
              <span>Inspect in Review Drawer</span>
              <ChevronRight className="size-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )

  // If used in standalone page
  if (isStandalone) {
    return (
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
        {phoneFrame}
        {controlPanel}
        <QRCodeModal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          organizationId={activeOrgId}
        />
      </div>
    )
  }

  // If used as a modal / popup in manager portal
  return (
    <div
      aria-labelledby="phone-simulator-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
    >
      <div className="relative flex flex-col items-center gap-4 lg:flex-row lg:items-start">
        {/* Floating Close button top-right on mobile */}
        <button
          aria-label="Close simulator"
          className="absolute -top-10 right-0 rounded-full bg-white/20 p-1.5 text-white hover:bg-white/40 transition-colors lg:hidden"
          onClick={onClose}
          type="button"
        >
          <X className="size-5" />
        </button>

        {phoneFrame}
        <div className="flex flex-col gap-2">
          {controlPanel}
          <button
            className="w-full rounded-xl border border-wf-border bg-wf-surface py-2 text-xs font-semibold text-wf-ink shadow-sm hover:bg-wf-surface-sunken transition-colors"
            onClick={onClose}
            type="button"
          >
            Close Simulator
          </button>
        </div>
      </div>

      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        organizationId={activeOrgId}
      />
    </div>
  )
}
