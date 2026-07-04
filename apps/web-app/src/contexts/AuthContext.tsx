import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { User } from 'firebase/auth'
import { AuthContext } from './authContextValue'
import type { SignInResult } from './authContextValue'
import {
  EMPLOYEE_WEB_PORTAL_NOTICE,
  EMPLOYEE_WEB_PORTAL_NOTICE_STORAGE_KEY,
} from '@/constants/authConstants'
import { Roles } from '@/permissions'
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

const SESSION_CACHE_KEY_MATCHERS = [
  'auth',
  'profile',
  'role',
  'organizationid',
  'organization-id',
  'permissions',
  'redirect',
  'returnto',
  'return-to',
]

function clearAuthSessionCache() {
  if (typeof window === 'undefined') {
    return
  }

  clearMatchingStorageKeys(window.localStorage)
  clearMatchingStorageKeys(window.sessionStorage)
}

function storeEmployeeWebPortalNotice() {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(
    EMPLOYEE_WEB_PORTAL_NOTICE_STORAGE_KEY,
    EMPLOYEE_WEB_PORTAL_NOTICE,
  )
}

function clearMatchingStorageKeys(storage: Storage) {
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index)

    if (!key) {
      continue
    }

    const normalizedKey = key.toLowerCase()

    if (normalizedKey.startsWith('firebase')) {
      continue
    }

    if (
      SESSION_CACHE_KEY_MATCHERS.some((matcher) =>
        normalizedKey.includes(matcher),
      )
    ) {
      storage.removeItem(key)
    }
  }
}

function isEmployeeWebPortalAccount(
  profile: UserProfile | null,
): profile is UserProfile {
  return profile !== null && profile.isActive && profile.role === Roles.Employee
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const activeUidRef = useRef<string | null>(null)
  const profileRequestRef = useRef(0)

  useEffect(() => {
    let isMounted = true

    const unsubscribe = observeAuthState((currentUser) => {
      const requestId = profileRequestRef.current + 1
      const currentUid = currentUser?.uid ?? null

      profileRequestRef.current = requestId
      activeUidRef.current = currentUid
      setLoading(true)
      setUser(currentUser)
      setProfile(null)

      if (!currentUser) {
        clearAuthSessionCache()
        setLoading(false)
        return
      }

      getCurrentUserProfile(currentUser.uid)
        .then(async (currentProfile) => {
          if (
            !isMounted ||
            activeUidRef.current !== currentUser.uid ||
            profileRequestRef.current !== requestId
          ) {
            return
          }

          if (isEmployeeWebPortalAccount(currentProfile)) {
            storeEmployeeWebPortalNotice()
            await signOutUser()

            if (!isMounted) {
              return
            }

            activeUidRef.current = null
            profileRequestRef.current += 1
            clearAuthSessionCache()
            setUser(null)
            setProfile(null)
            setLoading(false)
            return
          }

          setProfile(currentProfile)
        })
        .catch(() => {
          if (
            !isMounted ||
            activeUidRef.current !== currentUser.uid ||
            profileRequestRef.current !== requestId
          ) {
            return
          }

          setProfile(null)
        })
        .finally(() => {
          if (
            !isMounted ||
            activeUidRef.current !== currentUser.uid ||
            profileRequestRef.current !== requestId
          ) {
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
    clearAuthSessionCache()
    setLoading(true)
    setProfile(null)

    try {
      const signedInUser = await signInWithEmail(email, password)
      const currentProfile = await getCurrentUserProfile(signedInUser.uid)

      if (isEmployeeWebPortalAccount(currentProfile)) {
        storeEmployeeWebPortalNotice()
        await signOutUser()
        activeUidRef.current = null
        profileRequestRef.current += 1
        clearAuthSessionCache()
        setUser(null)
        setProfile(null)
        setLoading(false)

        return {
          status: 'employee-web-portal-blocked',
          profile: currentProfile,
        } satisfies SignInResult
      }

      activeUidRef.current = signedInUser.uid
      setUser(signedInUser)
      setProfile(currentProfile)
      setLoading(false)

      return {
        status: 'signed-in',
        profile: currentProfile,
      } satisfies SignInResult
    } catch (error) {
      setLoading(false)
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    setLoading(true)

    try {
      await signOutUser()
      activeUidRef.current = null
      profileRequestRef.current += 1
      clearAuthSessionCache()
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
