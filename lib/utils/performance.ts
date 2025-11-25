/**
 * 性能优化工具函数
 */

/**
 * 请求去重器 - 防止相同请求同时发起多次
 */
export class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>()

  async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // 如果已有相同的请求在进行中，直接返回
    if (this.pending.has(key)) {
      return this.pending.get(key) as Promise<T>
    }

    // 创建新请求
    const promise = fn().finally(() => {
      // 请求完成后移除
      this.pending.delete(key)
    })

    this.pending.set(key, promise)
    return promise
  }

  clear() {
    this.pending.clear()
  }
}

/**
 * 批量状态更新器 - 合并多个状态更新
 */
export class BatchUpdater {
  private updates: Map<string, any> = new Map()
  private timeout: NodeJS.Timeout | null = null

  schedule(key: string, value: any, callback: (updates: Map<string, any>) => void) {
    this.updates.set(key, value)

    if (this.timeout) {
      clearTimeout(this.timeout)
    }

    this.timeout = setTimeout(() => {
      callback(new Map(this.updates))
      this.updates.clear()
      this.timeout = null
    }, 16) // 约1帧的时间
  }

  clear() {
    if (this.timeout) {
      clearTimeout(this.timeout)
    }
    this.updates.clear()
  }
}

/**
 * 简单的内存缓存
 */
export class MemoryCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>()
  private ttl: number

  constructor(ttl: number = 5 * 60 * 1000) {
    this.ttl = ttl
  }

  get(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    const now = Date.now()
    if (now - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  set(key: string, data: T) {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  delete(key: string) {
    this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }
}

