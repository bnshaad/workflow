import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '@/utils'

export type ToastType = 'success' | 'error' | 'info'

export type ToastItem = {
  id: string
  title: string
  description?: string
  type: ToastType
}

type ToastContextType = {
  showToast: (toast: Omit<ToastItem, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    ({ description, title, type }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9)
      setToasts((prev) => [...prev, { description, id, title, type }])
      setTimeout(() => {
        removeToast(id)
      }, 4000)
    },
    [removeToast],
  )

  return (
    <ToastContext.Provider value={{ removeToast, showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex max-w-md flex-col gap-2 pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg transition-all animate-in fade-in slide-in-from-bottom-5',
              toast.type === 'success' && 'border-emerald-500/30 bg-emerald-950/90 text-emerald-100',
              toast.type === 'error' && 'border-rose-500/30 bg-rose-950/90 text-rose-100',
              toast.type === 'info' && 'border-border bg-card text-foreground',
            )}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="size-5 shrink-0 text-rose-400" />
            ) : (
              <Info className="size-5 shrink-0 text-primary" />
            )}
            <div className="flex-1">
              <p className="text-xs font-semibold">{toast.title}</p>
              {toast.description ? (
                <p className="mt-0.5 text-[11px] opacity-80">{toast.description}</p>
              ) : null}
            </div>
            <button
              className="inline-flex size-5 items-center justify-center rounded-md opacity-70 hover:opacity-100 focus:outline-none"
              onClick={() => removeToast(toast.id)}
              type="button"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
