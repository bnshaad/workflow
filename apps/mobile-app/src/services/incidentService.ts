import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore'
import { firestore } from '../config/firebase'
import type { Incident, IncidentCategory } from '../domain'

export interface ReportIncidentParams {
  jobId: string
  organizationId: string
  reportedByUserId: string
  reportedByUserName: string
  category: IncidentCategory
  description: string
}

export async function reportJobIncident(params: {
  jobId: string
  organizationId: string
  reportedByUserId: string
  reportedByUserName: string
  category: IncidentCategory
  description: string
}): Promise<Incident> {
  const incidentsRef = collection(firestore, 'incidents')
  const newDocRef = doc(incidentsRef)
  const now = Timestamp.now()

  const incidentData: Incident = {
    id: newDocRef.id,
    jobId: params.jobId,
    organizationId: params.organizationId,
    reportedByUserId: params.reportedByUserId,
    reportedByUserName: params.reportedByUserName,
    category: params.category,
    description: params.description.trim(),
    status: 'open',
    createdAt: now,
    updatedAt: now,
    isActive: true,
  }

  await setDoc(newDocRef, incidentData)
  return incidentData
}

export async function getJobIncidents(
  organizationId: string,
  jobId: string
): Promise<Incident[]> {
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
