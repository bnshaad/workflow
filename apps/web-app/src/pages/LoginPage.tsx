import { useState, type FormEvent } from 'react'
import { FirebaseError } from 'firebase/app'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LockKeyhole } from 'lucide-react'
import { useAuth } from '@/hooks'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loading: authLoading, signIn, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? '/dashboard'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await signIn(email, password)
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
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
          Loading...
        </div>
      </main>
    )
  }

  if (user) {
    return <Navigate replace to={redirectTo} />
  }

  const isDisabled = isSubmitting || email.length === 0 || password.length === 0

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <section className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
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

          <button
            className="flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDisabled}
            type="submit"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </section>
    </main>
  )
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
    default:
      return 'Unable to sign in. Please try again.'
  }
}
