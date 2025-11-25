/**
 * 性能配置参数
 * 集中管理所有性能相关的配置
 */

export const PerformanceConfig = {
  // 缓存配置
  cache: {
    conversationTTL: 5 * 60 * 1000, // 对话列表缓存5分钟
    messageTTL: 2 * 60 * 1000,      // 消息缓存2分钟
  },

  // 分页配置
  pagination: {
    conversationsLimit: 100,  // 对话列表每次加载数量
    messagesPerRound: 5,      // 消息每轮加载轮数
    messagesPerPage: 10,      // 每轮2条消息
  },

  // 节流/防抖配置
  throttle: {
    scroll: 150,              // 滚动事件节流（毫秒）
    search: 300,              // 搜索输入防抖（毫秒）
    resize: 200,              // 窗口调整节流（毫秒）
  },

  // UI配置
  ui: {
    skeletonCount: 5,         // 骨架屏显示数量
    loadMoreThreshold: 100,   // 滚动到顶部多少px触发加载更多提示
    autoLoadThreshold: 40,    // 滚动到顶部多少px自动加载
  },

  // 动画配置
  animation: {
    transitionDuration: 300,  // 过渡动画时长（毫秒）
    debounceDelay: 16,        // 批量更新延迟（约1帧）
  },

  // 性能监控
  monitoring: {
    enabled: process.env.NODE_ENV === 'development',
    logSlowQueries: true,
    slowQueryThreshold: 500,  // 慢查询阈值（毫秒）
  },
} as const

/**
 * 性能监控辅助函数（异步版本）
 */
export async function measurePerformance<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!PerformanceConfig.monitoring.enabled) {
    return fn()
  }

  const start = performance.now()
  try {
    const result = await fn()
    const duration = performance.now() - start
    
    if (PerformanceConfig.monitoring.logSlowQueries && 
        duration > PerformanceConfig.monitoring.slowQueryThreshold) {
      console.warn(`[性能警告] ${label} 耗时 ${duration.toFixed(2)}ms`)
    } else {
      console.log(`[性能] ${label} 耗时 ${duration.toFixed(2)}ms`)
    }
    
    return result
  } catch (error) {
    const duration = performance.now() - start
    console.error(`[性能错误] ${label} 失败，耗时 ${duration.toFixed(2)}ms`, error)
    throw error
  }
}

