import { Timestamp } from 'firebase/firestore'

type CacheEntry<T> = {
  data: T
  timestamp: number
}

const STORAGE_PREFIX = 'workflow_cache:'

class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>()
  private defaultTTL = 45000 // 45 seconds default TTL

  private getStorage(): Storage | null {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return window.sessionStorage
      }
    } catch {
      // Storage access blocked or unavailable
    }
    return null
  }

  get<T>(key: string, ttl: number = this.defaultTTL): T | null {
    const now = Date.now()

    // 1. Check in-memory Map
    const inMemoryEntry = this.cache.get(key)
    if (inMemoryEntry) {
      if (now - inMemoryEntry.timestamp > ttl) {
        this.cache.delete(key)
        this.removeFromStorage(key)
        return null
      }
      return inMemoryEntry.data as T
    }

    // 2. Check sessionStorage fallback for page refresh persistence
    const storage = this.getStorage()
    if (storage) {
      try {
        const raw = storage.getItem(`${STORAGE_PREFIX}${key}`)
        if (raw) {
          const parsed = JSON.parse(raw, (_k, value) => {
            if (
              value &&
              typeof value === 'object' &&
              typeof (value as { seconds?: unknown }).seconds === 'number' &&
              typeof (value as { nanoseconds?: unknown }).nanoseconds === 'number'
            ) {
              const ts = value as { seconds: number; nanoseconds: number }
              return new Timestamp(ts.seconds, ts.nanoseconds)
            }
            return value
          }) as CacheEntry<T>
          if (parsed && typeof parsed.timestamp === 'number') {
            if (now - parsed.timestamp > ttl) {
              storage.removeItem(`${STORAGE_PREFIX}${key}`)
              return null
            }
            // Re-hydrate into memory
            this.cache.set(key, parsed)
            return parsed.data
          }
        }
      } catch {
        // Ignore JSON parse or storage read errors
      }
    }

    return null
  }

  set<T>(key: string, data: T): void {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() }
    this.cache.set(key, entry)

    const storage = this.getStorage()
    if (storage) {
      try {
        storage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry))
      } catch {
        // Storage quota exceeded or disabled
      }
    }
  }

  invalidate(pattern?: string): void {
    const storage = this.getStorage()

    if (!pattern) {
      this.cache.clear()
      if (storage) {
        try {
          const keysToRemove: string[] = []
          for (let i = 0; i < storage.length; i++) {
            const k = storage.key(i)
            if (k && k.startsWith(STORAGE_PREFIX)) {
              keysToRemove.push(k)
            }
          }
          for (const k of keysToRemove) {
            storage.removeItem(k)
          }
        } catch {
          // Ignore storage errors
        }
      }
      return
    }

    for (const key of Array.from(this.cache.keys())) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
        this.removeFromStorage(key)
      }
    }

    if (storage) {
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i)
          if (k && k.startsWith(STORAGE_PREFIX) && k.includes(pattern)) {
            keysToRemove.push(k)
          }
        }
        for (const k of keysToRemove) {
          storage.removeItem(k)
        }
      } catch {
        // Ignore storage errors
      }
    }
  }

  private removeFromStorage(key: string): void {
    const storage = this.getStorage()
    if (storage) {
      try {
        storage.removeItem(`${STORAGE_PREFIX}${key}`)
      } catch {
        // Ignore storage errors
      }
    }
  }
}

export const cacheService = new CacheService()

