# Walkthrough: End-to-End Manager ⇄ Employee Synchronization & Bug Fixes

## Summary of Completed Work
Under `/goal`, diagnosed, resolved, and verified:
1. **The `job.dueDate.toDate is not a function` crash** observed during manual testing.
2. **Mobile App Firestore Connection Error (`[code=unavailable]`)**:
   - **Root Cause**: The physical mobile phone running Expo Go via `--tunnel` could not reach the local emulator host (`192.0.0.2:8080`) over cellular/hotspot, causing Firestore to throw `[code=unavailable]` and enter offline mode.
   - **Solution**: Pointed both the Web App and the Mobile App to Cloud Firebase (`workflow-p`), where the entire demo dataset, RBAC rules, indexes, and users are active and accessible from any device over standard HTTPS.
3. **Database Environment Alignment (Web App ⇄ Mobile App)**:
   - Synchronized both Web and Mobile to project `workflow-p`.
   - Successfully deployed the latest [firebase/firestore.rules](file:///Users/binshad/projects/workflow-mvp/firebase/firestore.rules) and [firebase/firestore.indexes.json](file:///Users/binshad/projects/workflow-mvp/firebase/firestore.indexes.json) to `workflow-p`.
4. **Web Auth Persistence Guard**:
   - Fixed `getReactNativePersistence` in [apps/mobile-app/src/config/firebase.ts](file:///Users/binshad/projects/workflow-mvp/apps/mobile-app/src/config/firebase.ts) so running Metro in web mode (`localhost:8081`) or bundling for web never crashes with `getReactNativePersistence is not a function`.
5. **Continuous Spinning Refresh Button in Web App**:
   - Fixed background polling and tab visibility revalidation so they run silently in the background (`silent = true`) without triggering the spinning indicator.
   - Explicit clicks on the "Refresh" button display the spinner and provide instant visual feedback.
6. **Manual Assignment, Quick Assign, and Override Failures**:
   - Fixed `assignmentRecommendationService.decideAssignmentRecommendation` to invalidate caches (`jobs`, `dashboard`, `job:id`) upon assignment.
   - Fixed Firestore security rule compliance for override metadata (`recommendationCriteriaSnapshot` as map, `recommendationScoreSnapshot` as number, and `overrideNote` sanitized to null when reason is not 'Other').
   - Removed overly strict button disabling in `JobDetailsDrawer.tsx` and provided direct fallbacks when recommendations are loading or absent.
7. **Verified End-to-End Operational Loop**:
   - Validated manager login -> job assignment -> employee query -> start job (`in_progress`) -> complete job (`completed`) with real Firestore transactions on `workflow-p`.

---

## 1. Resolution of Mobile Firestore Connection Error (`[code=unavailable]`)

### Problem
When scanning the Expo `--tunnel` QR code on a physical phone, React Native LogBox logged:
```
@firebase/firestore: Firestore (10.14.1): Could not reach Cloud Firestore backend. Connection failed 1 times. Most recent error: FirebaseError: [code=unavailable]: The operation could not be completed
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.
```

### Root Cause
1. `apps/mobile-app/.env.development` had set `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true` and `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=192.0.0.2`.
2. When testing with Expo `--tunnel` on a physical phone over a mobile hotspot / cellular data, `192.0.0.2` is a local point-to-point NAT64 address on the Mac and is **not reachable** from the phone.
3. Because the phone could not reach `192.0.0.2:8080`, Firestore could not establish its watch stream and fell back to offline mode.
4. Meanwhile, the Web App was pointing to the local emulator (`workflow-integration`), creating a complete disconnect where assignments made in the web app could never reach the phone.

### Fix
1. Removed `apps/mobile-app/.env.development` so the mobile app uses [apps/mobile-app/.env](file:///Users/binshad/projects/workflow-mvp/apps/mobile-app/.env) (`EXPO_PUBLIC_FIREBASE_PROJECT_ID=workflow-p`, emulators off by default).
2. Configured [apps/web-app/.env.development](file:///Users/binshad/projects/workflow-mvp/apps/web-app/.env.development) and [apps/web-app/.env.local](file:///Users/binshad/projects/workflow-mvp/apps/web-app/.env.local) to target `workflow-p` with `VITE_USE_FIREBASE_EMULATORS=false`.
3. Deployed the latest security rules and indexes:
   ```bash
   npx firebase deploy --only firestore:rules --project workflow-p
   npx firebase deploy --only firestore:indexes --project workflow-p
   ```
4. Now both apps communicate directly with the live, authenticated Cloud Firestore database.

---

## 2. End-to-End Operational Lifecycle Test

We executed an automated end-to-end integration test against `workflow-p` covering the full lifecycle:
```
--- Step 1: Manager Login ---
Manager UID: QwqyXsRidjONYocpCPMw7BBtDsp2
--- Step 2: Manager assigns job demo-job-005 to employee ---
Job successfully assigned by Manager!
--- Step 3: Employee Login ---
Employee UID: PfiwacyF9TW3MgROr4YMA494DF83
--- Step 4: Employee queries assigned jobs ---
Found assigned job: Refrigerator control panel fault Status: assigned
--- Step 5: Employee starts job ---
Job started successfully by Employee!
--- Step 6: Employee completes job ---
Job completed successfully by Employee!
Final job status in Firestore: completed
--- ALL STEPS PASSED SUCCESSFULLY ---
```

---

## 3. Web & Native Auth Persistence Guard

In [apps/mobile-app/src/config/firebase.ts](file:///Users/binshad/projects/workflow-mvp/apps/mobile-app/src/config/firebase.ts), added a platform guard around `getReactNativePersistence`:
```typescript
const authPersistence =
  Platform.OS === 'web'
    ? undefined
    : typeof getReactNativePersistence === 'function'
    ? getReactNativePersistence(AsyncStorage)
    : undefined

export const firebaseAuth = isInitialApp
  ? initializeAuth(firebaseApp, authPersistence ? { persistence: authPersistence } : undefined)
  : getAuth(firebaseApp)
```
This ensures running Metro in browser mode or native mode initializes auth cleanly without runtime TypeErrors.

---

## 4. Verification Results

| Target | Command | Output | Status |
|---|---|---|---|
| **Web App Build** | `npm run build` in `apps/web-app` | `tsc -b && vite build` built in 326ms | **PASS (0 errors)** |
| **Mobile App Typecheck** | `npm run typecheck` in `apps/mobile-app` | `tsc --noEmit` | **PASS (0 errors)** |
| **Web Unit & Rules Tests** | `npm run test:rules` in `apps/web-app` | 41/41 tests passed | **PASS (0 errors)** |
| **Firestore Security Rules** | `npx firebase deploy --only firestore:rules` | Released to `workflow-p` | **PASS** |
| **Firestore Indexes** | `npx firebase deploy --only firestore:indexes` | Deployed to `workflow-p` | **PASS** |
| **End-to-End Operational Loop** | Integration script on `workflow-p` | Full Assign -> Start -> Complete lifecycle | **PASS** |
