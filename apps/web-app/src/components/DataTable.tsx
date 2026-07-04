import type { ReactNode } from 'react'

type DataTableColumn<Row> = {
  header: string
  key: keyof Row | string
  render?: (row: Row) => ReactNode
}

type DataTableProps<Row> = {
  columns: DataTableColumn<Row>[]
  rows: Row[]
}

export function DataTable<Row extends { id: string }>({
  columns,
  rows,
}: DataTableProps<Row>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border bg-background/40">
            {columns.map((column) => (
              <th
                className="px-8 py-4 text-xs font-medium tracking-[0.08em] text-muted-foreground"
                key={String(column.key)}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-sm">
          {rows.map((row) => (
            <tr className="transition hover:bg-background/60" key={row.id}>
              {columns.map((column) => (
                <td className="px-8 py-5 align-middle" key={String(column.key)}>
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
