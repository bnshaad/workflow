import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https'
import {
  readTrustedManagerProfile,
  type TrustedProfile,
} from '../actionProposals/trustedProfile.js'

const USERS_COLLECTION = 'users'

export async function requireTrustedManager(
  request: CallableRequest<unknown>,
): Promise<TrustedProfile> {
  const uid = request.auth?.uid

  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentication is required.')
  }

  const authUser = await getAuth().getUser(uid)

  if (authUser.disabled) {
    throw new HttpsError('permission-denied', 'The authenticated user is disabled.')
  }

  const profileSnapshot = await getFirestore()
    .collection(USERS_COLLECTION)
    .doc(uid)
    .get()

  if (!profileSnapshot.exists) {
    throw new HttpsError('permission-denied', 'An active user profile is required.')
  }

  const trustedProfile = readTrustedManagerProfile(
    uid,
    authUser.disabled,
    profileSnapshot.data(),
  )

  if (!trustedProfile) {
    throw new HttpsError('permission-denied', 'Manager access is required.')
  }

  return trustedProfile
}
