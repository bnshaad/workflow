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

export function readOptionalString(value: unknown): string | undefined {
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

export function readNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function readBoolean(data: DocumentData, key: string): boolean {
  const value = data[key]
  return typeof value === 'boolean' ? value : false
}

export function toJsDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value
  }
  if (value instanceof Timestamp) {
    return value.toDate()
  }
  const obj = value && typeof value === 'object' ? (value as Record<string, unknown>) : null
  if (typeof obj?.toDate === 'function') {
    try {
      const d = (obj.toDate as () => unknown)()
      if (d instanceof Date && !isNaN(d.getTime())) return d
    } catch {
      // ignore
    }
  }
  if (typeof obj?.seconds === 'number') {
    const nano = typeof obj.nanoseconds === 'number' ? obj.nanoseconds : 0
    const ms = obj.seconds * 1000 + Math.floor(nano / 1e6)
    const d = new Date(ms)
    return isNaN(d.getTime()) ? null : d
  }
  if (typeof obj?._seconds === 'number') {
    const nano = typeof obj._nanoseconds === 'number' ? obj._nanoseconds : 0
    const ms = obj._seconds * 1000 + Math.floor(nano / 1e6)
    const d = new Date(ms)
    return isNaN(d.getTime()) ? null : d
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

export function readTimestamp(value: unknown): Timestamp {
  if (value instanceof Timestamp) return value
  const d = toJsDate(value)
  return d ? Timestamp.fromDate(d) : Timestamp.fromMillis(0)
}

export function readTimestampOrNull(value: unknown): Timestamp | null {
  if (!value) return null
  if (value instanceof Timestamp) return value
  const d = toJsDate(value)
  return d ? Timestamp.fromDate(d) : null
}

export function readTimestampOrUndefined(value: unknown): Timestamp | undefined {
  if (!value) return undefined
  if (value instanceof Timestamp) return value
  const d = toJsDate(value)
  return d ? Timestamp.fromDate(d) : undefined
}

export function readOptionalTimestamp(value: unknown): Timestamp | undefined {
  return readTimestampOrUndefined(value)
}

