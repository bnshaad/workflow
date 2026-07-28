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
    'AIzaSyDQAp1SEwqNjCyQ330vdFDTHNPdxM364PM',
  authDomain:
    (expoExtra as any).EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    'workflow-p.firebaseapp.com',
  projectId:
    (expoExtra as any).EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
    'workflow-p',
  storageBucket:
    (expoExtra as any).EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'workflow-p.firebasestorage.app',
  messagingSenderId:
    (expoExtra as any).EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    '237326635633',
  appId:
    (expoExtra as any).EXPO_PUBLIC_FIREBASE_APP_ID ||
    '1:237326635633:web:28d51e7a6df23dd39001d0',
}

const isInitialApp = getApps().length === 0

export const firebaseApp = isInitialApp ? initializeApp(firebaseConfig) : getApp()

export const firebaseAuth = isInitialApp
  ? initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    })
  : getAuth(firebaseApp)

export const firestore = getFirestore(firebaseApp)

// Emulator support (off by default — only set EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true in .env.development)
const useFirebaseEmulators =
  (expoExtra as any).EXPO_PUBLIC_USE_FIREBASE_EMULATORS === 'true'

if (useFirebaseEmulators) {
  const debuggerHost =
    typeof (Constants.manifest as any)?.debuggerHost === 'string'
      ? (Constants.manifest as any).debuggerHost.split(':')[0]
      : undefined
  const emulatorHost =
    (expoExtra as any).EXPO_PUBLIC_FIREBASE_EMULATOR_HOST ||
    debuggerHost ||
    '127.0.0.1'
  const firebaseEmulatorHost =
    Platform.OS === 'android' ? '10.0.2.2' : emulatorHost

  connectAuthEmulator(firebaseAuth, `http://${firebaseEmulatorHost}:9099`, {
    disableWarnings: true,
  })
  connectFirestoreEmulator(firestore, firebaseEmulatorHost, 8080)
}
