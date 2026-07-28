import { Timestamp, type DocumentData } from 'firebase/firestore'

export function readString(data: DocumentData, key: string, fallback = ''): string {
  const value = data[key]
  return typeof value === 'string' ? value : fallback
}

export function readStringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export function readStringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

export function readNumber(data: DocumentData, key: string): number {
  const value = data[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export function readBoolean(data: DocumentData, key: string): boolean {
  const value = data[key]
  return typeof value === 'boolean' ? value : false
}

export function readTimestamp(value: unknown): Timestamp {
  return value instanceof Timestamp ? value : Timestamp.fromMillis(0)
}

export function readTimestampOrNull(value: unknown): Timestamp | null {
  return value instanceof Timestamp ? value : null
}

export function readTimestampOrUndefined(value: unknown): Timestamp | undefined {
  return value instanceof Timestamp ? value : undefined
}
