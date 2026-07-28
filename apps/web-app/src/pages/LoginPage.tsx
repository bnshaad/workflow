import { useState, type FormEvent } from 'react'
import { FirebaseError } from 'firebase/app'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LockKeyhole } from 'lucide-react'
import {
  EMPLOYEE_WEB_PORTAL_NOTICE,
  EMPLOYEE_WEB_PORTAL_NOTICE_STORAGE_KEY,
} from '@/constants/authConstants'
import { useAuth } from '@/hooks'
import { canAccessWebPortal } from '@/permissions'

const DEFAULT_PORTAL_ROUTE = '/dashboard'
const BLOCKED_REDIRECT_PATHS = new Set([
  '/login',
  '/profile-setup-required',
  '/unauthorized',
])

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loading: authLoading, profile, signIn, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(getStoredEmployeeWebPortalNotice)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirectTo = getSafeRedirectPath(location.state)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    setIsSubmitting(true)

    try {
      const result = await signIn(email, password)

      if (result.status === 'employee-web-portal-blocked') {
        setNotice(EMPLOYEE_WEB_PORTAL_NOTICE)
        setPassword('')
        navigate('/login', { replace: true })
        return
      }

      navigate(redirectTo, { replace: true })
    } catch (caughtError) {
      if (caughtError instanceof FirebaseError) {
        setError(getAuthErrorMessage(caughtError.code))
      } else {
        setError('Unable to sign in. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Loading...
        </div>
      </main>
    )
  }

  if (user && profile && canAccessWebPortal(profile)) {
    return <Navigate replace to={redirectTo} />
  }

  if (user && profile) {
    return <Navigate replace to="/unauthorized" />
  }

  if (user && !profile) {
    return <Navigate replace to="/profile-setup-required" />
  }

  const isDisabled = isSubmitting || email.length === 0 || password.length === 0

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <section className="w-full max-w-sm border-t-2 border-primary bg-card p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LockKeyhole size={18} strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Workflow
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to continue
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="email"
            >
              Email
            </label>
            <input
              autoComplete="email"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
              id="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="password"
            >
              Password
            </label>
            <input
              autoComplete="current-password"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
              id="password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </div>

          {error.length > 0 ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {notice.length > 0 ? (
            <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
              {notice}
            </div>
          ) : null}

          <button
            className="flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDisabled}
            type="submit"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 border-t pt-4">
          <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Demo Accounts (Password: 123456)</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded bg-muted px-2.5 py-1 text-xs font-medium hover:bg-muted/80"
              onClick={() => { setEmail('manager@workflow.local'); setPassword('123456') }}
            >
              Manager
            </button>
            <button
              type="button"
              className="rounded bg-muted px-2.5 py-1 text-xs font-medium hover:bg-muted/80"
              onClick={() => { setEmail('admin@workflow.local'); setPassword('123456') }}
            >
              Admin
            </button>
            <button
              type="button"
              className="rounded bg-muted px-2.5 py-1 text-xs font-medium hover:bg-muted/80"
              onClick={() => { setEmail('employee@workflow.local'); setPassword('123456') }}
            >
              Employee
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

function getSafeRedirectPath(state: unknown) {
  const pathname = (state as { from?: { pathname?: unknown } } | null)?.from
    ?.pathname

  if (
    typeof pathname !== 'string' ||
    !pathname.startsWith('/') ||
    BLOCKED_REDIRECT_PATHS.has(pathname)
  ) {
    return DEFAULT_PORTAL_ROUTE
  }

  return pathname
}

function getStoredEmployeeWebPortalNotice() {
  if (typeof window === 'undefined') {
    return ''
  }

  const storedNotice = window.sessionStorage.getItem(
    EMPLOYEE_WEB_PORTAL_NOTICE_STORAGE_KEY,
  )

  if (!storedNotice) {
    return ''
  }

  window.sessionStorage.removeItem(EMPLOYEE_WEB_PORTAL_NOTICE_STORAGE_KEY)

  return storedNotice
}

function getAuthErrorMessage(code: string) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'The email or password is incorrect.'
    case 'auth/invalid-email':
      return 'Enter a valid email address.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.'
    case 'auth/network-request-failed':
      return import.meta.env.DEV
        ? 'Local authentication is unavailable. Start the Firebase emulators and try again.'
        : 'Unable to sign in. Please try again.'
    default:
      return 'Unable to sign in. Please try again.'
  }
}
