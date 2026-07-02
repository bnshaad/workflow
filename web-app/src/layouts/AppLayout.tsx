import { Bell, BriefcaseBusiness, Search, UserCircle } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="min-h-screen min-w-0 md:pl-[240px]">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <div className="relative hidden w-full max-w-md sm:block">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Search jobs, team..."
              type="search"
            />
          </div>

          <div className="ml-auto flex items-center gap-4">
            <button
              className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              type="button"
              aria-label="Notifications"
            >
              <Bell aria-hidden="true" className="size-5" />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive ring-2 ring-card" />
            </button>

            <div className="hidden items-center gap-2 border-l border-border pl-4 text-sm font-medium text-foreground sm:flex">
              <BriefcaseBusiness
                aria-hidden="true"
                className="size-4 text-muted-foreground"
              />
              <span>Business Name</span>
            </div>

            <button
              className="flex items-center gap-2 rounded-full border border-border bg-card p-1 pr-3 text-sm font-medium text-foreground transition hover:bg-muted"
              type="button"
              aria-label="User profile"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-muted text-primary">
                <UserCircle aria-hidden="true" className="size-5" />
              </span>
              <span className="hidden sm:inline">User</span>
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-screen-2xl p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
