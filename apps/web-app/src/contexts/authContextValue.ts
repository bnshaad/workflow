import { createContext } from 'react'
import type { User } from 'firebase/auth'
import type { UserProfile } from '@/types'

export type AuthContextValue = {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)
