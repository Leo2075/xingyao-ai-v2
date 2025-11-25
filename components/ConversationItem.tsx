/**
 * 对话列表项组件 - 已优化性能
 * 使用 React.memo 避免不必要的重渲染
 */

import React, { memo } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Conversation } from '@/lib/types'

interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  isMenuOpen: boolean
  onSelect: (id: string) => void
  onMenuToggle: (id: string, e: React.MouseEvent) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  menuRef: (el: HTMLDivElement | null) => void
}

const ConversationItem = memo(function ConversationItem({
  conversation,
  isActive,
  isMenuOpen,
  onSelect,
  onMenuToggle,
  onRename,
  onDelete,
  menuRef,
}: ConversationItemProps) {
  return (
    <div
      className={`
        group relative p-3 rounded-xl transition-all duration-200 cursor-pointer border border-transparent
        ${isActive 
          ? 'bg-white border-blue-100 shadow-sm ring-1 ring-blue-500/10' 
          : 'hover:bg-gray-100'}
        ${isMenuOpen ? 'z-50' : 'z-0'}
      `}
      onClick={() => onSelect(conversation.id)}
    >
      <div className="flex justify-between items-start">
        <h3 className={`text-sm font-medium line-clamp-1 pr-6 ${isActive ? 'text-primary' : 'text-gray-700'}`}>
          {conversation.name || '新的对话'}
        </h3>
        {/* Menu Button */}
        <div className="absolute right-2 top-3" ref={menuRef}>
          <button
            className={`
              p-1 rounded-md hover:bg-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity
              ${isMenuOpen ? 'opacity-100 bg-gray-200' : ''}
            `}
            onClick={(e) => onMenuToggle(conversation.id, e)}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {/* Context Menu */}
          {isMenuOpen && (
            <div className="absolute top-full right-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 z-50 py-1 animate-fade-in">
              <button
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                onClick={(e) => {
                  e.stopPropagation()
                  const newName = prompt('重命名', conversation.name)
                  if (newName) onRename(conversation.id, newName)
                }}
              >
                重命名
              </button>
              <button
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(conversation.id)
                }}
              >
                删除
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-1.5 line-clamp-1">
        {new Date(conversation.updated_at * 1000).toLocaleString('zh-CN', {
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </p>
    </div>
  )
})

export default ConversationItem

