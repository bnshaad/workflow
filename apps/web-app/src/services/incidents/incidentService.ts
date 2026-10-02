import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { firestore } from '@/services/firestore'
import { requireActiveProfile, requireTenantAccess } from '@/services/common'
import type { UserProfile } from '@/types/user'
import type { Incident, IncidentCategory, IncidentStatus } from '../../../../../shared/domain/models/incident.ts'
import { INCIDENT_CATEGORY_LABELS } from '../../../../../shared/domain/models/incident.ts'

export type { Incident, IncidentCategory, IncidentStatus }
export { INCIDENT_CATEGORY_LABELS }

export class IncidentService {
  async getIncidentsByJob(
    profile: UserProfile,
    jobId: string,
    organizationId: string
  ): Promise<Incident[]> {
    requireActiveProfile(profile)
    requireTenantAccess(profile, organizationId)

    const incidentsRef = collection(firestore, 'incidents')
    const q = query(
      incidentsRef,
      where('organizationId', '==', organizationId),
      where('jobId', '==', jobId),
      where('isActive', '==', true)
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((d) => d.data() as Incident)
  }

  subscribeToJobIncidents(
    profile: UserProfile,
    jobId: string,
    organizationId: string,
    onIncidents: (incidents: Incident[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    requireActiveProfile(profile)
    requireTenantAccess(profile, organizationId)

    const incidentsRef = collection(firestore, 'incidents')
    const q = query(
      incidentsRef,
      where('organizationId', '==', organizationId),
      where('jobId', '==', jobId),
      where('isActive', '==', true)
    )

    return onSnapshot(
      q,
      (snapshot) => {
        const incidents = snapshot.docs.map((d) => d.data() as Incident)
        onIncidents(incidents)
      },
      (error) => {
        if (onError) onError(error)
      }
    )
  }

  async getOpenIncidents(
    profile: UserProfile,
    organizationId: string
  ): Promise<Incident[]> {
    requireActiveProfile(profile)
    requireTenantAccess(profile, organizationId)

    const incidentsRef = collection(firestore, 'incidents')
    const q = query(
      incidentsRef,
      where('organizationId', '==', organizationId),
      where('status', '==', 'open'),
      where('isActive', '==', true)
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((d) => d.data() as Incident)
  }

  subscribeToOpenIncidents(
    profile: UserProfile,
    organizationId: string,
    onIncidents: (incidents: Incident[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    requireActiveProfile(profile)
    requireTenantAccess(profile, organizationId)

    const incidentsRef = collection(firestore, 'incidents')
    const q = query(
      incidentsRef,
      where('organizationId', '==', organizationId),
      where('status', '==', 'open'),
      where('isActive', '==', true)
    )

    return onSnapshot(
      q,
      (snapshot) => {
        const incidents = snapshot.docs.map((d) => d.data() as Incident)
        onIncidents(incidents)
      },
      (error) => {
        if (onError) onError(error)
      }
    )
  }

  async resolveIncident(
    profile: UserProfile,
    params: {
      incidentId: string
      organizationId: string
      resolutionNotes?: string
    }
  ): Promise<void> {
    requireActiveProfile(profile)
    requireTenantAccess(profile, params.organizationId)

    const incidentRef = doc(firestore, 'incidents', params.incidentId)
    const now = Timestamp.now()

    await updateDoc(incidentRef, {
      status: 'resolved',
      resolvedAt: now,
      resolvedByUserId: profile.id,
      resolutionNotes: params.resolutionNotes?.trim() || 'Resolved by dispatcher',
      updatedAt: now,
    })
  }
}

export const incidentService = new IncidentService()

