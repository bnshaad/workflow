import { useEffect, useRef, useState } from 'react'
import {
  BriefcaseBusiness,
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  UserCircle,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks'
import { canAccessSettings } from '@/permissions'

type HeaderProps = {
  onOpenNavigation: () => void
}

export function Header({ onOpenNavigation }: HeaderProps) {
  const navigate = useNavigate()
  const { loading, profile, signOut } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const displayName = profile?.displayName ?? 'Workflow user'
  const roleLabel = profile ? formatRole(profile.role) : ''
  const showSettingsLink = profile ? canAccessSettings(profile) : false

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [])

  useEffect(() => {
    if (signOutError.length === 0) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setSignOutError('')
    }, 4000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [signOutError])

  async function handleSignOut() {
    setSignOutError('')
    setIsSigningOut(true)

    try {
      await signOut()
      setIsMenuOpen(false)
      navigate('/login', { replace: true })
    } catch {
      setSignOutError('Unable to sign out. Please try again.')
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <header className="z-40 flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-label="Open navigation menu"
          className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 md:hidden"
          onClick={onOpenNavigation}
          type="button"
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>
        <div className="hidden min-w-0 items-center gap-2 text-sm font-medium text-foreground sm:flex">
          <BriefcaseBusiness
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
          <span className="truncate">Business Name</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="relative" ref={menuRef}>
          <button
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            className="flex max-w-[240px] items-center gap-2 rounded-full border border-border bg-card p-1 pr-3 text-sm font-medium text-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
              <UserCircle aria-hidden="true" className="size-5" />
            </span>
            {loading ? (
              <span className="hidden h-4 w-28 rounded-full bg-muted sm:inline" />
            ) : (
              <span className="hidden truncate sm:inline">{displayName}</span>
            )}
            <ChevronDown
              aria-hidden="true"
              className={`hidden size-4 text-muted-foreground transition sm:block ${
                isMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isMenuOpen ? (
            <div
              className="absolute right-0 mt-2 w-64 overflow-hidden rounded-lg border border-border bg-card py-2 shadow-lg"
              role="menu"
            >
              <div className="flex items-center gap-2 px-3 pb-2 pt-1">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                  <UserCircle aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0">
                  {loading ? (
                    <div className="space-y-1.5">
                      <div className="h-4 w-36 rounded-full bg-muted" />
                      <div className="h-3 w-20 rounded-full bg-muted" />
                    </div>
                  ) : (
                    <>
                      <p className="truncate text-sm font-medium text-foreground">
                        {displayName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {roleLabel}
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="my-1 border-t border-border" />
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground"
                disabled
                role="menuitem"
                type="button"
              >
                <UserCircle aria-hidden="true" className="size-4" />
                Profile
              </button>
              {showSettingsLink ? (
                <Link
                  className="flex items-center gap-2 px-3 py-2 text-sm text-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                  onClick={() => setIsMenuOpen(false)}
                  role="menuitem"
                  to="/settings"
                >
                  <Settings aria-hidden="true" className="size-4" />
                  Settings
                </Link>
              ) : null}
              <div className="my-1 border-t border-border" />
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-destructive transition hover:bg-destructive/5 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSigningOut}
                onClick={handleSignOut}
                role="menuitem"
                type="button"
              >
                <LogOut aria-hidden="true" className="size-4" />
                {isSigningOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {signOutError.length > 0 ? (
        <div className="fixed right-6 top-20 rounded-lg border border-destructive/30 bg-card px-4 py-3 text-sm text-destructive shadow-lg">
          {signOutError}
        </div>
      ) : null}
    </header>
  )
}

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1)
}
