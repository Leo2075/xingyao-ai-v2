/**
 * 对话列表骨架屏组件
 * 提升加载时的用户体验
 */

import React, { memo } from 'react'

interface ConversationSkeletonProps {
  count?: number
}

const ConversationSkeleton = memo(function ConversationSkeleton({ count = 5 }: ConversationSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3 rounded-xl bg-white/50 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      ))}
    </>
  )
})

export default ConversationSkeleton

