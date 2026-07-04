import { createContext } from 'react'
import type { User } from 'firebase/auth'
import type { UserProfile } from '@/types'

export type SignInResult =
  | {
      status: 'signed-in'
      profile: UserProfile | null
    }
  | {
      status: 'employee-web-portal-blocked'
      profile: UserProfile
    }

export type AuthContextValue = {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<SignInResult>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)
