/**
 * 消息项组件 - 已优化性能
 * 使用 React.memo 避免不必要的重渲染
 * 懒加载 ReactMarkdown
 */

import React, { memo } from 'react'
import dynamic from 'next/dynamic'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { Message } from '@/lib/types'

// 动态导入 ReactMarkdown，减少初始包大小
const ReactMarkdown = dynamic(() => import('react-markdown'), {
  loading: () => <div className="animate-pulse bg-gray-100 h-20 rounded" />,
  ssr: false,
})

// Markdown 组件配置 - 移到组件外部避免每次重新创建
const markdownComponents: Components = {
  code({ inline, className, children, ...props }: any) {
    if (!inline) {
      return (
        <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto text-sm my-4 border border-slate-700/50 shadow-sm">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      )
    }
    return (
      <code className="bg-slate-100 text-slate-800 rounded px-1.5 py-0.5 font-mono text-sm" {...props}>
        {children}
      </code>
    )
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto my-4 rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          {children}
        </table>
      </div>
    )
  },
  th({ children }) {
    return (
      <th className="bg-gray-50 px-4 py-3 text-left font-semibold text-gray-900 border-b border-gray-200">
        {children}
      </th>
    )
  },
  td({ children }) {
    return (
      <td className="px-4 py-3 border-b border-gray-100 text-gray-700 last:border-0">
        {children}
      </td>
    )
  },
}

interface MessageItemProps {
  message: Message
  index: number
}

const MessageItem = memo(function MessageItem({ message, index }: MessageItemProps) {
  return (
    <div 
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group animate-fade-in`}
    >
      <div className={`
        relative max-w-[90%] md:max-w-[85%] rounded-2xl px-5 py-3.5 shadow-sm text-base leading-relaxed
        ${message.role === 'user' 
          ? 'bg-blue-600 text-white rounded-br-sm shadow-blue-500/20' 
          : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'}
      `}>
        {message.role === 'assistant' ? (
          <div className="markdown-body">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {message.content}
            </ReactMarkdown>
            {/* Actions Toolbar */}
            <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Actions can be added here like Copy, Retry */}
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{message.content}</div>
        )}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // 自定义比较函数 - 只在内容改变时重新渲染
  return prevProps.message.id === nextProps.message.id &&
         prevProps.message.content === nextProps.message.content
})

export default MessageItem

