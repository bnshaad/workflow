import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User } from 'firebase/auth'
import { AuthContext } from './authContextValue'
import {
  observeAuthState,
  signIn as signInWithEmail,
  signOut as signOutUser,
} from '@/services/auth'

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = observeAuthState((currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmail(email, password)
  }, [])

  const signOut = useCallback(async () => {
    await signOutUser()
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signOut,
    }),
    [loading, signIn, signOut, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
