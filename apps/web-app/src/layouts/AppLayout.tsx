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

        <main className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
          <div className="mx-auto w-full max-w-[1440px] px-4 pb-8 pt-4 sm:px-5 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
