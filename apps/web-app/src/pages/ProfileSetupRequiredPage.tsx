export function ProfileSetupRequiredPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <section className="w-full max-w-md border-t-2 border-primary bg-card p-6">
        <p className="text-sm font-medium text-muted-foreground">Account</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Profile setup required
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Your sign-in is active, but your Workflow user profile has not been
          set up yet. Please contact your organization administrator.
        </p>
      </section>
    </main>
  )
}
