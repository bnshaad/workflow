import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import type { UserProfile } from '../domain'
import { firebaseAuth } from '../config/firebase'
import { getEmployeeProfile, loginEmployee, logoutEmployee } from '../services/authService'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        try {
          const userProfile = await getEmployeeProfile(currentUser.uid)
          if (userProfile && userProfile.role === 'employee' && userProfile.isActive) {
            setProfile(userProfile)
            setError(null)
          } else {
            setProfile(null)
            setError('Access restricted to active employee profiles.')
          }
        } catch (err: any) {
          setError(err.message || 'Failed to load profile')
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, pass: string) => {
    setLoading(true)
    setError(null)
    try {
      const userProfile = await loginEmployee(email, pass)
      setProfile(userProfile)
    } catch (err: any) {
      setError(err.message || 'Login failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await logoutEmployee()
    setUser(null)
    setProfile(null)
  }

  return {
    user,
    profile,
    loading,
    error,
    login,
    logout,
  }
}
