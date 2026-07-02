export function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <section className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-base font-semibold text-primary-foreground">
            W
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-primary">
              Workflow
            </h1>
            <p className="text-sm text-muted-foreground">Login placeholder</p>
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
          Authentication UI will be added in the authentication phase.
        </div>
      </section>
    </main>
  )
}
