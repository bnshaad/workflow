import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import { getApp, getApps, initializeApp } from 'firebase/app'
// @ts-ignore — getReactNativePersistence is exported by the RN build of firebase/auth,
// resolved by Metro when unstable_enablePackageExports = false. Not in TS types.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck-next
import {
  connectAuthEmulator,
  getAuth,
  // @ts-ignore
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

// Read config from expo.extra (populated by app.config.js from .env)
const expoExtra =
  (Constants.expoConfig?.extra as Record<string, string | undefined> | undefined) ??
  ((Constants.manifest as any)?.extra as Record<string, string | undefined> | undefined) ??
  {}

const firebaseConfig = {
  apiKey:
    (expoExtra as any).EXPO_PUBLIC_FIREBASE_API_KEY ||
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
    '',
  authDomain:
    (expoExtra as any).EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    '',
  projectId:
    (expoExtra as any).EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
    '',
  storageBucket:
    (expoExtra as any).EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    '',
  messagingSenderId:
    (expoExtra as any).EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    '',
  appId:
    (expoExtra as any).EXPO_PUBLIC_FIREBASE_APP_ID ||
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
    '',
}


const isInitialApp = getApps().length === 0

export const firebaseApp = isInitialApp ? initializeApp(firebaseConfig) : getApp()

const authPersistence =
  Platform.OS === 'web'
    ? undefined
    : typeof getReactNativePersistence === 'function'
    ? getReactNativePersistence(AsyncStorage)
    : undefined

export const firebaseAuth = isInitialApp
  ? initializeAuth(firebaseApp, authPersistence ? { persistence: authPersistence } : undefined)
  : getAuth(firebaseApp)

export const firestore = getFirestore(firebaseApp)

// Emulator support (off by default — only set EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true in .env.development)
const useFirebaseEmulators =
  (expoExtra as any).EXPO_PUBLIC_USE_FIREBASE_EMULATORS === 'true'

if (useFirebaseEmulators) {
  const hostUri = Constants.expoConfig?.hostUri
  const debuggerHost =
    typeof hostUri === 'string'
      ? hostUri.split(':')[0]
      : typeof (Constants.manifest as any)?.debuggerHost === 'string'
      ? (Constants.manifest as any).debuggerHost.split(':')[0]
      : undefined
  const emulatorHost =
    (expoExtra as any).EXPO_PUBLIC_FIREBASE_EMULATOR_HOST ||
    process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST ||
    debuggerHost ||
    '127.0.0.1'
  const firebaseEmulatorHost =
    Platform.OS === 'android' && emulatorHost === '127.0.0.1'
      ? '10.0.2.2'
      : emulatorHost

  connectAuthEmulator(firebaseAuth, `http://${firebaseEmulatorHost}:9099`, {
    disableWarnings: true,
  })
  connectFirestoreEmulator(firestore, firebaseEmulatorHost, 8080)
}
