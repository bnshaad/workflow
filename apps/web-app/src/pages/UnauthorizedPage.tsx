export function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">Access</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Unauthorized
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Route protection is currently using placeholder auth state.
        </p>
      </section>
    </main>
  )
}
