import { useState } from 'react'
import {
  Check,
  Copy,
  ExternalLink,
  QrCode,
  Smartphone,
  X,
} from 'lucide-react'

type QRCodeModalProps = {
  isOpen: boolean
  onClose: () => void
  organizationId?: string
}

export function QRCodeModal({
  isOpen,
  onClose,
  organizationId,
}: QRCodeModalProps) {
  const [hasCopied, setHasCopied] = useState(false)

  if (!isOpen) return null

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const targetUrl = `${origin}/demo/whatsapp${
    organizationId ? `?org=${encodeURIComponent(organizationId)}` : ''
  }`

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(
    targetUrl,
  )}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl)
      setHasCopied(true)
      setTimeout(() => setHasCopied(false), 2500)
    } catch {
      // Clipboard write failed
    }
  }

  return (
    <div
      aria-labelledby="qr-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
    >
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-wf-border bg-wf-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-wf-separator px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-wf-surface-sunken text-wf-ink">
              <QrCode className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-wf-ink" id="qr-modal-title">
                Mobile WhatsApp Simulator
              </h3>
              <p className="text-xs text-wf-ink-3">
                Scan with your phone camera
              </p>
            </div>
          </div>
          <button
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-wf-ink-3 hover:bg-wf-surface-sunken hover:text-wf-ink transition-colors"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 text-center space-y-4">
          {/* QR Code Container */}
          <div className="mx-auto flex size-56 items-center justify-center rounded-2xl border-2 border-wf-border bg-white p-3 shadow-inner">
            <img
              alt="Scan to open mobile WhatsApp simulation"
              className="size-full object-contain"
              height={200}
              src={qrImageUrl}
              width={200}
            />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-wf-surface-sunken px-3 py-1 text-xs font-medium text-wf-ink-2">
              <Smartphone className="size-3.5 text-wf-accent" />
              <span>Open on phone</span>
            </div>
            <p className="text-xs text-wf-ink-3 max-w-xs mx-auto pt-1">
              Scan with your mobile camera to test customer intake live from your phone.
            </p>
          </div>

          {/* Direct Link & Copy */}
          <div className="flex items-center gap-2 rounded-xl border border-wf-border bg-wf-surface-sunken p-2 text-left">
            <input
              className="flex-1 bg-transparent px-2 text-xs text-wf-ink font-mono outline-none truncate"
              readOnly
              value={targetUrl}
            />
            <button
              className="inline-flex items-center gap-1.5 rounded-lg bg-wf-surface border border-wf-border px-3 py-1.5 text-xs font-semibold text-wf-ink shadow-sm hover:bg-white transition-colors"
              onClick={handleCopy}
              type="button"
            >
              {hasCopied ? (
                <>
                  <Check className="size-3.5 text-emerald-600" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <a
              className="inline-flex items-center gap-1.5 text-xs font-medium text-wf-accent hover:underline"
              href={targetUrl}
              rel="noreferrer"
              target="_blank"
            >
              <span>Open in new window</span>
              <ExternalLink className="size-3" />
            </a>
            <button
              className="rounded-lg bg-wf-ink px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-black transition-colors"
              onClick={onClose}
              type="button"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
