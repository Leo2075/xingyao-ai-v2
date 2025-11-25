/**
 * 节流 Hook
 * 用于优化滚动等高频事件
 */

import { useCallback, useRef } from 'react'

export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const lastRun = useRef(Date.now())
  const timeoutRef = useRef<NodeJS.Timeout>()

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now()
    
    if (now - lastRun.current >= delay) {
      callback(...args)
      lastRun.current = now
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args)
        lastRun.current = Date.now()
      }, delay - (now - lastRun.current))
    }
  }, [callback, delay])
}

