export function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-screen-2xl items-center px-8 py-12">
      <section className="space-y-3" aria-label="Workflow MVP foundation">
        <p className="text-sm font-medium text-muted-foreground">Workflow MVP</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Foundation setup is ready.
        </h1>
        <p className="max-w-xl text-sm leading-6 text-muted-foreground">
          Tailwind and shadcn/ui are configured for the approved design system.
        </p>
      </section>
    </main>
  )
}
