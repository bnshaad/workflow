import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors select-none',
          'rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wf-accent focus-visible:ring-offset-2',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          // Sizes (minimum 36px hit target on web)
          size === 'sm' && 'h-9 min-h-[36px] px-3 text-[13px] leading-[18px]',
          size === 'md' && 'h-10 min-h-[36px] px-4 text-[13px] leading-[18px]',
          size === 'lg' && 'h-11 min-h-[40px] px-5 text-[15px] leading-[20px]',
          // Variants
          variant === 'primary' &&
            'bg-wf-accent text-white hover:bg-wf-accent-press active:bg-wf-accent-press shadow-xs',
          variant === 'secondary' &&
            'border border-wf-border bg-wf-surface text-wf-ink hover:bg-wf-surface-sunken shadow-xs',
          variant === 'outline' &&
            'border border-wf-border bg-transparent text-wf-ink hover:bg-wf-surface-sunken',
          variant === 'ghost' &&
            'bg-transparent text-wf-ink-2 hover:bg-wf-surface-sunken hover:text-wf-ink',
          variant === 'danger' &&
            'bg-wf-danger text-white hover:opacity-90 active:opacity-95 shadow-xs',
          className,
        )}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'
