import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import type { UserProfile } from '../domain'
import { firebaseAuth, firestore } from '../config/firebase'

export async function loginEmployee(email: string, pass: string): Promise<UserProfile> {
  const cred = await signInWithEmailAndPassword(firebaseAuth, email, pass)
  const uid = cred.user.uid

  const userDocRef = doc(firestore, 'users', uid)
  const userSnap = await getDoc(userDocRef)

  if (!userSnap.exists()) {
    throw new Error('User profile not found in system')
  }

  const profile = userSnap.data() as UserProfile

  if (!profile.isActive) {
    throw new Error('Account is inactive. Contact your administrator.')
  }

  if (profile.role !== 'employee') {
    throw new Error('Access denied: Mobile app is for employee role users only.')
  }

  return {
    ...profile,
    id: uid,
    name: profile.name || profile.displayName || 'Technician',
    displayName: profile.displayName || profile.name || 'Technician',
  }
}

export async function logoutEmployee(): Promise<void> {
  await signOut(firebaseAuth)
}

export async function getEmployeeProfile(uid: string): Promise<UserProfile | null> {
  const userDocRef = doc(firestore, 'users', uid)
  const userSnap = await getDoc(userDocRef)
  if (!userSnap.exists()) return null
  const profile = userSnap.data() as UserProfile
  return {
    ...profile,
    id: uid,
    name: profile.name || profile.displayName || 'Technician',
    displayName: profile.displayName || profile.name || 'Technician',
  }
}
