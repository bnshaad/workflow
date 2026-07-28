type CacheEntry<T> = {
  data: T
  timestamp: number
}

class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>()
  private defaultTTL = 45000 // 45 seconds default TTL

  get<T>(key: string, ttl: number = this.defaultTTL): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      return
    }
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}

export const cacheService = new CacheService()
