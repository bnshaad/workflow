import { Outlet } from 'react-router-dom'
import { Header, Sidebar } from '@/components'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="min-h-screen min-w-0 md:pl-[240px]">
        <Header />

        <main className="mx-auto w-full max-w-screen-2xl p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
