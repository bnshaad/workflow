export function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <section className="w-full max-w-md border-t-2 border-destructive bg-card p-6">
        <p className="text-sm font-medium text-muted-foreground">Access</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Unauthorized
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          You do not have access to this area.
        </p>
      </section>
    </main>
  )
}
