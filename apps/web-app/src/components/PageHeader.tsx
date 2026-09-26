import type { ReactNode } from 'react'

type PageHeaderProps = {
  actions?: ReactNode
  description?: string
  title: string
}

export function PageHeader({ actions, description, title }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[24px] font-semibold leading-[30px] tracking-tight text-wf-ink">
          {title}
        </h1>
        {description ? (
          <p className="mt-0.5 max-w-2xl text-[13px] font-normal leading-[18px] text-wf-ink-3">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
