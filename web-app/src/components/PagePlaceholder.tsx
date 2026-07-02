type PagePlaceholderProps = {
  eyebrow?: string
  title: string
}

export function PagePlaceholder({
  eyebrow = 'Placeholder',
  title,
}: PagePlaceholderProps) {
  return (
    <section className="rounded-xl border border-dashed border-border bg-card p-8 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.02em] text-muted-foreground">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        This page is reserved for a later implementation phase.
      </p>
    </section>
  )
}
