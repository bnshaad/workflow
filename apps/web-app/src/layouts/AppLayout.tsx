import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { CreateJobDrawer, Header, Sidebar } from '@/components'

export function AppLayout() {
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false)
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false)

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      <Sidebar
        isMobileOpen={isMobileNavigationOpen}
        onMobileClose={() => setIsMobileNavigationOpen(false)}
        onOpenCreateJob={() => setIsCreateJobOpen(true)}
      />
      <div className="flex h-full min-w-0 flex-col md:pl-[240px]">
        <Header
          onOpenNavigation={() => setIsMobileNavigationOpen(true)}
          onOpenCreateJob={() => setIsCreateJobOpen(true)}
        />

        <main className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-3 sm:px-5 sm:py-4 lg:px-6">
            <Outlet />
          </div>
        </main>
      </div>

      <CreateJobDrawer
        isOpen={isCreateJobOpen}
        onClose={() => setIsCreateJobOpen(false)}
      />
    </div>
  )
}

