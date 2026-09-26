import type { ReactNode } from 'react'
import { cn } from '@/utils'

export type DataTableColumn<Row> = {
  header: string
  key: keyof Row | string
  className?: string
  render?: (row: Row) => ReactNode
}

export interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[]
  rows: Row[]
  onRowClick?: (row: Row) => void
  className?: string
}

export function DataTable<Row extends { id: string }>({
  columns,
  rows,
  onRowClick,
  className,
}: DataTableProps<Row>) {
  return (
    <div
      className={cn(
        'overflow-x-auto rounded-card border border-wf-border bg-wf-surface shadow-card',
        className,
      )}
    >
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-wf-surface-raised border-b border-wf-separator">
          <tr>
            {columns.map((column) => (
              <th
                className={cn(
                  'px-4 py-3 text-[13px] font-medium leading-[18px] text-wf-ink-3',
                  column.className,
                )}
                key={String(column.key)}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-wf-separator text-[15px] leading-[22px] text-wf-ink-2">
          {rows.map((row) => (
            <tr
              className={cn(
                'h-14 transition-colors hover:bg-wf-surface-sunken',
                onRowClick && 'cursor-pointer',
              )}
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => (
                <td
                  className={cn('px-4 py-3 align-middle', column.className)}
                  key={String(column.key)}
                >
                  {column.render ? column.render(row) : String(row[column.key as keyof Row])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
