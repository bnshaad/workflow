import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const functionsRegion = 'asia-south1'
const useFirebaseEmulators =
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'
const firebaseEmulatorHost =
  typeof window !== 'undefined' && window.location.hostname
    ? window.location.hostname
    : import.meta.env.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1'

export const firebaseApp = initializeApp(firebaseConfig)
export const firebaseAuth = getAuth(firebaseApp)
export const firestore = getFirestore(firebaseApp)
export const firebaseFunctions = getFunctions(firebaseApp, functionsRegion)
export const firebaseStorage = getStorage(firebaseApp)
export const firebaseRuntime = {
  functionsMode: useFirebaseEmulators ? 'emulator' : 'production',
  functionsRegion,
  functionsUrl: useFirebaseEmulators
    ? `http://${firebaseEmulatorHost}:5001/${firebaseApp.options.projectId}/${functionsRegion}`
    : `https://${functionsRegion}-${firebaseApp.options.projectId}.cloudfunctions.net`,
} as const

if (useFirebaseEmulators) {
  connectAuthEmulator(firebaseAuth, `http://${firebaseEmulatorHost}:9099`, {
    disableWarnings: true,
  })
  connectFirestoreEmulator(firestore, firebaseEmulatorHost, 8080)
  connectFunctionsEmulator(firebaseFunctions, firebaseEmulatorHost, 5001)
}
