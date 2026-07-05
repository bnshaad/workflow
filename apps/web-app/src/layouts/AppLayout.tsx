import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header, Sidebar } from '@/components'

export function AppLayout() {
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false)

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      <Sidebar
        isMobileOpen={isMobileNavigationOpen}
        onMobileClose={() => setIsMobileNavigationOpen(false)}
      />
      <div className="flex h-full min-w-0 flex-col md:pl-[240px]">
        <Header onOpenNavigation={() => setIsMobileNavigationOpen(true)} />

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
