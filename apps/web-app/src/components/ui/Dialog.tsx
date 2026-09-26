import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils'

export type DialogProps = {
  children: ReactNode
  className?: string
  description?: string
  isOpen: boolean
  onClose: () => void
  title: string
}

export function Dialog({
  children,
  className,
  description,
  isOpen,
  onClose,
  title,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const previousFocus = document.activeElement as HTMLElement | null
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    )
    focusable?.[0]?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        aria-label="Close dialog"
        className="absolute inset-0 bg-background/80 backdrop-blur-xs"
        onClick={onClose}
        type="button"
      />
      <div
        aria-describedby={description ? 'dialog-description' : undefined}
        aria-labelledby="dialog-title"
        aria-modal="true"
        className={cn(
          'relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl transition-all animate-in fade-in zoom-in-95',
          className,
        )}
        ref={dialogRef}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h2 className="text-base font-bold text-foreground" id="dialog-title">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-xs text-muted-foreground" id="dialog-description">
                {description}
              </p>
            ) : null}
          </div>
          <button
            aria-label="Close dialog"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
