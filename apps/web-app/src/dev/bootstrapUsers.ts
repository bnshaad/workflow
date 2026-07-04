import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type WithFieldValue,
} from 'firebase/firestore'
import { firestore } from '@/config/firebase'
import type { UserProfile } from '@/types'

type DemoUserProfile = WithFieldValue<UserProfile> & {
  uid: string
}

const DEMO_ORGANIZATION_ID = 'demo-org-001'

const demoProfiles: DemoUserProfile[] = [
  {
    // Replace ADMIN_UID_HERE with the Firebase Authentication UID for admin@workflow.local before running.
    uid: 'LWPlJkdHfcMnaLXzYwvKFdBB6ky1',
    id: 'LWPlJkdHfcMnaLXzYwvKFdBB6ky1',
    organizationId: DEMO_ORGANIZATION_ID,
    email: 'admin@workflow.local',
    displayName: 'Admin User',
    role: 'admin',
    skills: [],
    availability: 'available',
    activeTaskCount: 0,
    performanceScore: 100,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  },
  {
    // Replace MANAGER_UID_HERE with the Firebase Authentication UID for manager@workflow.local before running.
    uid: 'QwqyXsRidjONYocpCPMw7BBtDsp2',
    id: 'QwqyXsRidjONYocpCPMw7BBtDsp2',
    organizationId: DEMO_ORGANIZATION_ID,
    email: 'manager@workflow.local',
    displayName: 'Manager User',
    role: 'manager',
    skills: [],
    availability: 'available',
    activeTaskCount: 0,
    performanceScore: 100,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  },
  {
    // Replace EMPLOYEE_UID_HERE with the Firebase Authentication UID for employee@workflow.local before running.
    uid: 'PfiwacyF9TW3MgROr4YMA494DF83',
    id: 'PfiwacyF9TW3MgROr4YMA494DF83',
    organizationId: DEMO_ORGANIZATION_ID,
    email: 'employee@workflow.local',
    displayName: 'Employee User',
    role: 'employee',
    skills: ['AC Repair', 'Installation'],
    availability: 'available',
    activeTaskCount: 0,
    performanceScore: 100,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  },
]

export async function bootstrapDemoUsers() {
  for (const profile of demoProfiles) {
    const userReference = doc(firestore, 'users', profile.uid)
    const existingProfile = await getDoc(userReference)

    if (existingProfile.exists()) {
      continue
    }

    await setDoc(userReference, toUserProfileDocument(profile))
  }
}

function toUserProfileDocument(profile: DemoUserProfile) {
  return {
    id: profile.id,
    organizationId: profile.organizationId,
    email: profile.email,
    displayName: profile.displayName,
    role: profile.role,
    skills: profile.skills,
    availability: profile.availability,
    activeTaskCount: profile.activeTaskCount,
    performanceScore: profile.performanceScore,
    isActive: profile.isActive,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  } satisfies WithFieldValue<UserProfile>
}
