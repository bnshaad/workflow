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
          <div className="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-12 lg:pt-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
