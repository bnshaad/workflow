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
import { getCurrentUserProfile } from '@/services/user'
import type { UserProfile } from '@/types'

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const unsubscribe = observeAuthState((currentUser) => {
      setLoading(true)
      setUser(currentUser)

      if (!currentUser) {
        setProfile(null)
        setLoading(false)
        return
      }

      getCurrentUserProfile(currentUser.uid)
        .then((currentProfile) => {
          if (!isMounted) {
            return
          }

          setProfile(currentProfile)
        })
        .catch(() => {
          if (!isMounted) {
            return
          }

          setProfile(null)
        })
        .finally(() => {
          if (!isMounted) {
            return
          }

          setLoading(false)
        })
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true)

    try {
      await signInWithEmail(email, password)
    } catch (error) {
      setLoading(false)
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    setLoading(true)

    try {
      await signOutUser()
      setUser(null)
      setProfile(null)
      setLoading(false)
    } catch (error) {
      setLoading(false)
      throw error
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      signIn,
      signOut,
    }),
    [loading, profile, signIn, signOut, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
