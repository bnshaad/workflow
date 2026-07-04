import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { firebaseAuth } from '@/config/firebase'

export type AuthStateHandler = (user: User | null) => void

export function observeAuthState(handler: AuthStateHandler) {
  return onAuthStateChanged(firebaseAuth, handler)
}

export async function signIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(
    firebaseAuth,
    email,
    password,
  )

  return credential.user
}

export async function signOut() {
  await firebaseSignOut(firebaseAuth)
}
