import { doc, getDoc, type DocumentData } from 'firebase/firestore'
import { firestore } from '@/config/firebase'
import type { UserAvailability, UserProfile, UserRole } from '@/types'

const USERS_COLLECTION = 'users'

export async function getCurrentUserProfile(uid: string) {
  return getUserProfile(uid)
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userSnapshot = await getDoc(doc(firestore, USERS_COLLECTION, uid))

  if (!userSnapshot.exists()) {
    return null
  }

  return mapUserProfile(userSnapshot.id, userSnapshot.data())
}

function mapUserProfile(id: string, data: DocumentData): UserProfile {
  return {
    id: readString(data, 'id', id),
    organizationId: readString(data, 'organizationId'),
    email: readString(data, 'email'),
    displayName: readString(data, 'displayName', readString(data, 'name')),
    role: readUserRole(data.role),
    skills: readStringArray(data.skills),
    availability: readAvailability(data.availability),
    activeTaskCount: readNumber(data, 'activeTaskCount'),
    performanceScore: readNumber(data, 'performanceScore'),
    isActive: readBoolean(data, 'isActive'),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

function readString(data: DocumentData, key: string, fallback = '') {
  const value = data[key]

  return typeof value === 'string' ? value : fallback
}

function readNumber(data: DocumentData, key: string) {
  const value = data[key]

  return typeof value === 'number' ? value : 0
}

function readBoolean(data: DocumentData, key: string) {
  const value = data[key]

  return typeof value === 'boolean' ? value : false
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function readUserRole(value: unknown): UserRole {
  if (value === 'admin' || value === 'manager' || value === 'employee') {
    return value
  }

  return 'employee'
}

function readAvailability(value: unknown): UserAvailability {
  if (value === 'Available' || value === 'Busy' || value === 'Leave') {
    return value
  }

  return 'Available'
}
