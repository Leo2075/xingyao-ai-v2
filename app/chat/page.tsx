'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Assistant, Message, Conversation } from '@/lib/types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import {
  Brain,
  Video,
  Target,
  FileText,
  Film,
  MessageSquare,
  BarChart3,
  Users,
  DollarSign,
  Send,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  LogOut,
  MoreHorizontal
} from 'lucide-react'

const iconMap: { [key: string]: any } = {
  'brain': Brain,
  'video': Video,
  'target': Target,
  'file-text': FileText,
  'film': Film,
  'message-square': MessageSquare,
  'bar-chart': BarChart3,
  'users': Users,
  'dollar-sign': DollarSign,
}

type ConversationCacheEntry = {
  messages: Message[]
  cursor: number | null
}

const toSeconds = (value: any) => {
  if (typeof value === 'number') {
    return value > 1e12 ? Math.floor(value / 1000) : value
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? Math.floor(Date.now() / 1000) : Math.floor(parsed / 1000)
  }
  return Math.floor(Date.now() / 1000)
}

const toMillis = (value: any) => {
  if (typeof value === 'number') {
    return value > 1e12 ? value : value * 1000
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? Date.now() : parsed
  }
  return Date.now()
}

const normalizeConversation = (item: any): Conversation => ({
  id: item.id,
  name: item.name || '新的对话',
  created_at: toSeconds(item.created_at),
  updated_at: toSeconds(item.updated_at ?? item.created_at),
})

const normalizeMessage = (item: Message | any): Message => ({
  id: item.id || `${item.message_id || Date.now()}`,
  role: item.role || 'assistant',
  content: item.content || item.answer || item.query || '',
  created_at: toMillis(item.created_at ?? Date.now()),
})

const sortMessages = (items: Message[]) =>
  [...items].sort((a, b) => a.created_at - b.created_at)

const sortConversationsWithTemp = (
  items: Conversation[],
  isTemp: (id?: string) => boolean
) => {
  const temps = items.filter((item) => isTemp(item.id))
  const normals = items
    .filter((item) => !isTemp(item.id))
    .sort((a, b) => b.updated_at - a.updated_at)
  return [...temps, ...normals]
}

const markdownComponents: Components = {
  code({ inline, className, children, ...props }: any) {
    if (!inline) {
      return (
        <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto text-sm my-4">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      )
    }
    return (
      <code className="bg-gray-100 text-gray-900 rounded px-1 py-0.5" {...props}>
        {children}
      </code>
    )
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto my-4">
        <table className="w-full border border-gray-200 text-sm">
          {children}
        </table>
      </div>
    )
  },
  th({ children }) {
    return (
      <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-800">
        {children}
      </th>
    )
  },
  td({ children }) {
    return (
      <td className="border border-gray-200 px-3 py-2 align-top text-gray-700">
        {children}
      </td>
    )
  },
}

function ChatPageContent() {
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationCache, setConversationCache] = useState<Map<string, ConversationCacheEntry>>(new Map())
  const [currentCursorRounds, setCurrentCursorRounds] = useState<number | null>(null)
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [advancedInputs, setAdvancedInputs] = useState<Record<string, any>>({})
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)
  const [middleSidebarCollapsed, setMiddleSidebarCollapsed] = useState(false)
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(260)
  const [middleSidebarWidth, setMiddleSidebarWidth] = useState(320)
  const [isResizingLeft, setIsResizingLeft] = useState(false)
  const [isResizingMiddle, setIsResizingMiddle] = useState(false)
  const [assistantTyping, setAssistantTyping] = useState(false)
  const [editingConversationId, setEditingConversationId] = useState<string>('')
  const [editingName, setEditingName] = useState<string>('')
  const [actionMenuId, setActionMenuId] = useState<string>('')
  const leftResizeState = useRef({ startX: 0, startWidth: 260 })
  const middleResizeState = useRef({ startX: 0, startWidth: 320 })
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const loadingMoreRef = useRef(false)
  const scrollIntentRef = useRef<ScrollBehavior | null>(null)
  const currentConversationIdRef = useRef<string>('')
  const activeStreamRef = useRef<{ id: string; assistantId: string } | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const isTemporaryConversation = (id?: string) => Boolean(id && id.startsWith('temp-'))

  const requestScrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    scrollIntentRef.current = behavior
  }

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    requestAnimationFrame(() => {
      const container = messagesContainerRef.current
      if (!container) return
      if (behavior === 'auto') {
        container.scrollTop = container.scrollHeight
      } else {
        container.scrollTo({ top: container.scrollHeight, behavior })
      }
    })
  }

  useEffect(() => {
    // 检查登录状态
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/')
      return
    }
    setUser(JSON.parse(userData))
    const storedLeftCollapsed = localStorage.getItem('chat_left_collapsed')
    const storedLeftWidth = localStorage.getItem('chat_left_width')
    const storedMiddleCollapsed = localStorage.getItem('chat_middle_collapsed')
    const storedMiddleWidth = localStorage.getItem('chat_middle_width')
    if (storedLeftCollapsed !== null) setLeftSidebarCollapsed(storedLeftCollapsed === '1')
    if (storedLeftWidth) setLeftSidebarWidth(Number(storedLeftWidth))
    if (storedMiddleCollapsed !== null) setMiddleSidebarCollapsed(storedMiddleCollapsed === '1')
    if (storedMiddleWidth) setMiddleSidebarWidth(Number(storedMiddleWidth))
    
    // 获取助手列表
    fetchAssistants()
  }, [router])

  useEffect(() => {
    localStorage.setItem('chat_left_collapsed', leftSidebarCollapsed ? '1' : '0')
  }, [leftSidebarCollapsed])

  useEffect(() => {
    localStorage.setItem('chat_left_width', String(leftSidebarWidth))
  }, [leftSidebarWidth])

  useEffect(() => {
    localStorage.setItem('chat_middle_collapsed', middleSidebarCollapsed ? '1' : '0')
  }, [middleSidebarCollapsed])

  useEffect(() => {
    localStorage.setItem('chat_middle_width', String(middleSidebarWidth))
  }, [middleSidebarWidth])

  useEffect(() => {
    const assistantId = searchParams.get('assistantId')
    if (assistantId && assistants.length > 0) {
      const assistant = assistants.find(a => a.id === assistantId)
      if (assistant) {
        selectAssistant(assistant)
      }
    }
  }, [searchParams, assistants])

  useEffect(() => {
    if (!scrollIntentRef.current) return
    scrollToBottom(scrollIntentRef.current)
    scrollIntentRef.current = null
  }, [messages])

  useEffect(() => {
    currentConversationIdRef.current = currentConversationId
  }, [currentConversationId])

  useEffect(() => {
    const handleDocumentClick = () => setActionMenuId('')
    document.addEventListener('click', handleDocumentClick)
    return () => document.removeEventListener('click', handleDocumentClick)
  }, [])

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isResizingLeft) {
        const delta = event.clientX - leftResizeState.current.startX
        const newWidth = Math.min(Math.max(leftResizeState.current.startWidth + delta, 180), 400)
        setLeftSidebarWidth(newWidth)
      }
      if (isResizingMiddle) {
        const delta = event.clientX - middleResizeState.current.startX
        const newWidth = Math.min(Math.max(middleResizeState.current.startWidth + delta, 240), 480)
        setMiddleSidebarWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      if (isResizingLeft) setIsResizingLeft(false)
      if (isResizingMiddle) setIsResizingMiddle(false)
    }

    if (isResizingLeft || isResizingMiddle) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizingLeft, isResizingMiddle])

  // 点击外部关闭菜单
  useEffect(() => {
    if (!actionMenuId) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const menuElement = target.closest('[data-action-menu]')
      if (!menuElement) {
        setActionMenuId('')
      }
    }
    // 使用 setTimeout 确保在按钮点击事件之后执行
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClickOutside, true)
    }
  }, [actionMenuId])

  const fetchAssistants = async () => {
    try {
      const response = await fetch('/api/assistants')
      const data = await response.json()
      if (response.ok) {
        setAssistants(data.assistants)
      }
    } catch (error) {
      console.error('获取助手列表失败:', error)
    }
  }

  const handleLeftResizeMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    leftResizeState.current = { startX: event.clientX, startWidth: leftSidebarWidth }
    setIsResizingLeft(true)
  }

  const handleMiddleResizeMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    middleResizeState.current = { startX: event.clientX, startWidth: middleSidebarWidth }
    setIsResizingMiddle(true)
  }

  const getPresetInputs = (assistant: Assistant) => {
    const name = assistant.name
    if (name.includes('IP') || name.includes('定位')) {
      return { persona: '', audience: '' }
    }
    if (name.includes('脚本')) {
      return { tone: '专业', duration: '60s' }
    }
    if (name.includes('选题') || name.includes('雷达')) {
      return { platform: '抖音', industry: '' }
    }
    if (name.includes('话术')) {
      return { tone: '接地气', cta: '私信' }
    }
    if (name.includes('剪辑')) {
      return { bgm_style: '轻快', format: '分镜' }
    }
    if (name.includes('发布') || name.includes('策略')) {
      return { best_slot: '晚间', hashtags_count: 5 }
    }
    return {}
  }

  const selectAssistant = async (assistant: Assistant) => {
    activeStreamRef.current = null
    setCurrentAssistant(assistant)
    setMessages([])
    setCurrentConversationId('')
    const preset = getPresetInputs(assistant)
    setAdvancedInputs(preset)
    
    // 获取该助手的对话历史列表
    await fetchConversations(assistant)
  }

  const fetchConversations = async (assistant: Assistant) => {
    try {
      const response = await fetch('/api/dify/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistantId: assistant.id,
          userId: user?.id,
        }),
      })

      const data = await response.json()
      if (response.ok && data.conversations) {
        const normalized: Conversation[] = data.conversations
          .map(normalizeConversation)
          .filter((item: Conversation) => Boolean(item.id))
        setConversations((prev) => {
          const temps = prev.filter((item) => isTemporaryConversation(item.id))
          const combined = [...temps, ...normalized]
          const dedupedMap = new Map<string, Conversation>()
          combined.forEach((conv) => {
            if (!conv.id) return
            dedupedMap.set(conv.id, conv)
          })
          return sortConversationsWithTemp(Array.from(dedupedMap.values()), isTemporaryConversation)
        })
      }
    } catch (error) {
      console.error('获取对话列表失败:', error)
    }
  }

  const fetchConversationMessages = async (
    conversationId: string,
    cursorRounds = 0,
    mode: 'replace' | 'prepend' = 'replace',
    scrollSnapshot?: { height: number; top: number },
  ) => {
    if (!currentAssistant) return
    try {
      const response = await fetch('/api/dify/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistantId: currentAssistant.id,
          conversationId,
          userId: user?.id,
          cursorRounds,
          rounds: 3,
        }),
      })

      const data = await response.json()
      if (response.ok && data.messages) {
        const normalized = sortMessages(data.messages.map(normalizeMessage))

        setConversationCache(prev => {
          const next = new Map(prev)
          const existing = next.get(conversationId)
          let combined: Message[]
          if (mode === 'prepend' && existing) {
            // 合并时去重，避免重复消息
            const existingIds = new Set(existing.messages.map(m => m.id))
            const newMessages = normalized.filter(m => !existingIds.has(m.id))
            combined = sortMessages([...newMessages, ...existing.messages])
          } else if (mode === 'replace' && existing) {
            // replace 模式：合并新旧消息，保留缓存中可能更新的消息
            const existingIds = new Set(existing.messages.map(m => m.id))
            const newIds = new Set(normalized.map(m => m.id))
            // 保留缓存中不在新消息中的消息（可能是流式更新中的消息）
            const preservedFromCache = existing.messages.filter(m => !newIds.has(m.id))
            // 合并：新消息 + 缓存中保留的消息
            combined = sortMessages([...normalized, ...preservedFromCache])
          } else {
            combined = normalized
          }
          next.set(conversationId, { messages: combined, cursor: data.nextCursorRounds ?? null })
          return next
        })

        if (currentConversationIdRef.current === conversationId) {
          if (mode === 'prepend') {
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id))
              const newMessages = normalized.filter(m => !existingIds.has(m.id))
              return sortMessages([...newMessages, ...prev])
            })
          } else if (mode === 'replace') {
            // replace 模式也需要合并，避免丢失缓存中的消息
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id))
              const newIds = new Set(normalized.map(m => m.id))
              const preservedFromPrev = prev.filter(m => !newIds.has(m.id))
              return sortMessages([...normalized, ...preservedFromPrev])
            })
          } else {
            setMessages(normalized)
          }
          setCurrentCursorRounds(data.nextCursorRounds ?? null)

          if (mode === 'replace') {
            requestScrollToBottom('auto')
          } else if (scrollSnapshot) {
            requestAnimationFrame(() => {
              const container = messagesContainerRef.current
              if (!container) return
              const diff = container.scrollHeight - scrollSnapshot.height
              container.scrollTop = scrollSnapshot.top + diff
            })
          }
        }
      }
    } catch (error) {
      console.error('获取对话历史失败:', error)
    }
  }

  const loadConversation = async (conversationId: string) => {
    activeStreamRef.current = null
    if (!currentAssistant) return

    setCurrentConversationId(conversationId)
    currentConversationIdRef.current = conversationId
    
    // 先显示缓存，提供即时反馈
    const cached = conversationCache.get(conversationId)
    if (cached && cached.messages.length > 0) {
      setMessages(cached.messages)
      setCurrentCursorRounds(cached.cursor)
      setAssistantTyping(false)
      requestScrollToBottom('auto')
    } else {
      setMessages([])
      setCurrentCursorRounds(null)
    }

    if (isTemporaryConversation(conversationId)) return

    // 后台刷新最新消息，确保不丢失
    setLoading(true)
    try {
      await fetchConversationMessages(conversationId, 0, 'replace')
    } finally {
      setLoading(false)
    }
  }

  const startNewConversation = () => {
    activeStreamRef.current = null
    const timestamp = Math.floor(Date.now() / 1000)
    const tempConversation: Conversation = {
      id: `temp-${Date.now()}`,
      name: '新的对话',
      created_at: timestamp,
      updated_at: timestamp,
    }
    setConversations(prev => [tempConversation, ...prev.filter(conv => !isTemporaryConversation(conv.id))])
    setCurrentConversationId(tempConversation.id)
    setMessages([])
    setCurrentCursorRounds(null)
    setConversationCache(prev => {
      const next = new Map(prev)
      next.set(tempConversation.id, { messages: [], cursor: null })
      return next
    })
    requestScrollToBottom('auto')
  }

  const renameConversation = async (conversationId: string, name: string) => {
    if (!currentAssistant || !name.trim() || isTemporaryConversation(conversationId)) return
    const oldConversations = conversations.map((c) => ({ ...c }))
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, name: name.trim() } as Conversation : c))
    try {
      const response = await fetch(`/api/dify/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assistantId: currentAssistant.id, userId: user?.id, name: name.trim() }),
      })
      if (!response.ok) throw new Error('更新失败')
      await fetchConversations(currentAssistant)
    } catch (e) {
      setConversations(oldConversations)
    } finally {
      setEditingConversationId('')
      setEditingName('')
      setActionMenuId('')
    }
  }

  const deleteConversation = async (conversationId: string) => {
    const previousConversations = conversations
    const previousCache = conversationCache.get(conversationId)
    setConversations(prev => prev.filter(c => c.id !== conversationId))
    setConversationCache(prev => {
      const next = new Map(prev)
      next.delete(conversationId)
      return next
    })

    if (currentConversationId === conversationId) {
      setCurrentConversationId('')
      setMessages([])
      setCurrentCursorRounds(null)
      requestScrollToBottom('auto')
    }

    if (!currentAssistant || isTemporaryConversation(conversationId)) {
      return
    }

    try {
      const response = await fetch(`/api/dify/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assistantId: currentAssistant.id, userId: user?.id }),
      })
      if (!response.ok) throw new Error('删除失败')
      await fetchConversations(currentAssistant)
    } catch (error) {
      console.error('删除对话失败:', error)
      setConversations(previousConversations)
      if (previousCache) {
        setConversationCache(prev => {
          const next = new Map(prev)
          next.set(conversationId, previousCache)
          return next
        })
      }
    } finally {
      setActionMenuId('')
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentAssistant || loading) return

    let conversationKey = currentConversationId
    if (!conversationKey) {
      const timestamp = Math.floor(Date.now() / 1000)
      conversationKey = `temp-${Date.now()}`
      const tempConversation: Conversation = {
        id: conversationKey,
        name: '新的对话',
        created_at: timestamp,
        updated_at: timestamp,
      }
      setConversations(prev => [tempConversation, ...prev.filter(conv => conv.id !== conversationKey)])
      setCurrentConversationId(conversationKey)
      setConversationCache(prev => {
        const next = new Map(prev)
        next.set(conversationKey, { messages: [], cursor: null })
        return next
      })
    }

    const sessionConversationKey = conversationKey
    const assistantSnapshot = currentAssistant
    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const currentSession = { id: sessionId, assistantId: assistantSnapshot.id }
    activeStreamRef.current = currentSession
    const isActiveSession = () =>
      activeStreamRef.current?.id === currentSession.id &&
      activeStreamRef.current?.assistantId === currentSession.assistantId
    const conversationIdForRequest = conversationKey && !isTemporaryConversation(conversationKey)
      ? conversationKey
      : undefined

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      created_at: Date.now(),
    }

    setMessages(prev => sortMessages([...prev, userMessage]))
        setConversationCache(prev => {
      const next = new Map(prev)
          const existing = next.get(sessionConversationKey) || { messages: [], cursor: null }
          next.set(sessionConversationKey, { ...existing, messages: sortMessages([...existing.messages, userMessage]) })
      return next
    })
    requestScrollToBottom('auto')
    setInputMessage('')
    setLoading(true)
    setAssistantTyping(true)

    try {
      const response = await fetch('/api/dify/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistantId: currentAssistant.id,
          message: inputMessage,
          conversationId: conversationIdForRequest || undefined,
          userId: user?.id,
          inputs: advancedInputs,
        }),
      })

      if (!response.ok) {
        throw new Error('发送消息失败')
      }

      const decoder = new TextDecoder()
      let aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        created_at: Date.now(),
      }

      const updateAssistantMessage = () => {
        // 始终更新缓存，即使不是活跃会话也要保存
        setConversationCache(prev => {
          const next = new Map(prev)
          const existing = next.get(sessionConversationKey) || { messages: [], cursor: null }
          const idx = existing.messages.findIndex(msg => msg.id === aiMessage.id)
          if (idx === -1) {
            next.set(sessionConversationKey, {
              ...existing,
              messages: sortMessages([...existing.messages, aiMessage]),
            })
          } else {
            const copy = [...existing.messages]
            copy[idx] = { ...aiMessage }
            next.set(sessionConversationKey, { ...existing, messages: sortMessages(copy) })
          }
          return next
        })
        
        // 只有活跃会话才更新UI
        if (isActiveSession()) {
          setMessages(prev => {
            const updated = [...prev]
            const index = updated.findIndex((msg) => msg.id === aiMessage.id)
            if (index === -1) {
              updated.push(aiMessage)
            } else {
              updated[index] = { ...aiMessage }
            }
            return sortMessages(updated)
          })
          requestScrollToBottom('smooth')
        }
      }

      updateAssistantMessage()

      const handleMessageEnd = async (payload: any) => {
        if (!payload?.conversation_id || !assistantSnapshot) return
        const resolvedName = payload.conversation_name || payload.conversation?.name || '新的对话'
        
        // 始终更新缓存，确保消息不丢失
        setConversationCache(prev => {
          const next = new Map(prev)
          const cacheKey = isTemporaryConversation(sessionConversationKey) ? sessionConversationKey : payload.conversation_id
          const existing = next.get(cacheKey)
          
          if (existing) {
            // 如果是从临时会话转换，需要迁移缓存
            if (isTemporaryConversation(sessionConversationKey) && cacheKey === sessionConversationKey) {
              next.set(payload.conversation_id, existing)
              next.delete(sessionConversationKey)
            } else if (!isTemporaryConversation(sessionConversationKey)) {
              // 如果不是临时会话，确保缓存键正确
              next.set(payload.conversation_id, existing)
              if (cacheKey !== payload.conversation_id) {
                next.delete(cacheKey)
              }
            }
          }
          return next
        })

        // 始终更新会话列表，即使不是活跃会话
        const shouldUpdateConversation = isTemporaryConversation(sessionConversationKey)
        setCurrentConversationId((prevId) => {
          const isCurrentSession = prevId === sessionConversationKey || prevId === payload.conversation_id
          if (shouldUpdateConversation || isCurrentSession) {
            setConversations((prev) => {
              let updatedList = prev.map((conv) => {
                if (shouldUpdateConversation && conv.id === sessionConversationKey) {
                  return {
                    ...conv,
                    id: payload.conversation_id,
                    name: resolvedName,
                    updated_at: toSeconds(Date.now()),
                  }
                }
                return conv
              })
              // 如果临时会话不在列表中，添加新会话
              if (shouldUpdateConversation && !prev.find(c => c.id === sessionConversationKey) && !prev.find(c => c.id === payload.conversation_id)) {
                updatedList = [
                  ...updatedList,
                  {
                    id: payload.conversation_id,
                    name: resolvedName,
                    created_at: toSeconds(Date.now()),
                    updated_at: toSeconds(Date.now()),
                  },
                ]
              }
              return sortConversationsWithTemp(updatedList, isTemporaryConversation)
            })
            if (shouldUpdateConversation || isCurrentSession) {
              return payload.conversation_id
            }
          }
          return prevId
        })
        
        // 刷新会话列表
        await fetchConversations(assistantSnapshot)
      }

      const processChunk = async (chunk: string) => {
        if (!isActiveSession()) return
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (!payload || payload === '[DONE]') continue
            try {
            const jsonData = JSON.parse(payload)
              if (jsonData.event === 'message') {
                aiMessage.content += jsonData.answer || ''
              setAssistantTyping(false)
              updateAssistantMessage()
            }
              if (jsonData.event === 'message_end') {
              await handleMessageEnd(jsonData)
              }
            } catch (e) {
            // ignore malformed chunk
          }
        }
      }

      const reader = response.body?.getReader()
      if (!reader) {
        const fallbackText = await response.text()
        if (fallbackText) {
          await processChunk(fallbackText)
        } else {
          throw new Error('无法读取响应流')
        }
        return
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        await processChunk(chunk)
      }
    } catch (error) {
      console.error('发送消息失败:', error)
      const fallbackMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '抱歉，发送消息时出现错误，请重试。',
        created_at: Date.now(),
      }
      setMessages(prev => sortMessages([...prev, fallbackMessage]))
      setConversationCache(prev => {
        const next = new Map(prev)
        const existing = next.get(conversationKey) || { messages: [], cursor: null }
        next.set(conversationKey, { ...existing, messages: sortMessages([...existing.messages, fallbackMessage]) })
        return next
      })
    } finally {
      setLoading(false)
      setAssistantTyping(false)
    }
  }

  const loadMoreMessages = async () => {
    if (!currentConversationId) return
    const cacheEntry = conversationCache.get(currentConversationId)
    if (!cacheEntry || cacheEntry.cursor == null || loadingMoreRef.current) return
    const container = messagesContainerRef.current
    const snapshot = {
      height: container?.scrollHeight ?? 0,
      top: container?.scrollTop ?? 0,
    }
    loadingMoreRef.current = true
    await fetchConversationMessages(currentConversationId, cacheEntry.cursor, 'prepend', snapshot)
    loadingMoreRef.current = false
  }

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current
    if (!container || loadingMoreRef.current) return
    if (container.scrollTop <= 40) {
      loadMoreMessages()
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/')
  }

  const getIcon = (iconName?: string) => {
    if (!iconName) return Brain
    return iconMap[iconName] || Brain
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Left Sidebar */}
      <div className="flex h-full flex-shrink-0">
        <div
          className="bg-blue-700 text-white flex flex-col transition-all duration-200 overflow-hidden"
          style={{ width: leftSidebarCollapsed ? 56 : leftSidebarWidth }}
        >
          <div className={`p-4 border-b border-blue-600 flex items-center ${leftSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!leftSidebarCollapsed && <span className="font-semibold">助手列表</span>}
            <button
              onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
              className="p-2 hover:bg-blue-600 rounded-lg transition-colors"
            >
              {leftSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
        </div>

          {!leftSidebarCollapsed && (
        <div className="flex-1 overflow-y-auto">
          {assistants.map((assistant) => {
            const Icon = getIcon(assistant.icon_name)
            const isActive = currentAssistant?.id === assistant.id

            return (
              <button
                key={assistant.id}
                onClick={() => selectAssistant(assistant)}
                    className={`w-full p-4 flex flex-col items-center text-center space-y-2 hover:bg-blue-600 transition-colors ${
                  isActive ? 'bg-blue-600' : ''
                }`}
                title={assistant.name}
              >
                <Icon className="w-8 h-8" />
                    <span className="text-xs">{assistant.name}</span>
              </button>
            )
          })}
        </div>
          )}

        <div className="p-4 border-t border-blue-600">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
              {!leftSidebarCollapsed && <span className="text-sm">退出登录</span>}
          </button>
        </div>
        </div>
        {!leftSidebarCollapsed && (
          <div
            className={`w-1 cursor-col-resize bg-transparent hover:bg-blue-200 transition-colors ${isResizingLeft ? 'bg-blue-300' : ''}`}
            onMouseDown={handleLeftResizeMouseDown}
          />
        )}
      </div>

      {/* Middle Sidebar */}
      <div className="flex h-full flex-shrink-0 border-r border-gray-200">
        <div
          className="bg-white flex flex-col transition-all duration-200 overflow-hidden"
          style={{ width: middleSidebarCollapsed ? 56 : middleSidebarWidth }}
        >
          <div className={`p-4 border-b border-gray-200 flex items-center ${middleSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!middleSidebarCollapsed && <h2 className="font-semibold text-gray-900">对话记录</h2>}
            <div className="flex items-center space-x-2">
              {!middleSidebarCollapsed && (
            <button
              onClick={startNewConversation}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="开始新对话"
            >
              <Plus className="w-5 h-5 text-gray-600" />
                </button>
              )}
              <button
                onClick={() => setMiddleSidebarCollapsed(!middleSidebarCollapsed)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {middleSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
            </div>
          </div>

          {!middleSidebarCollapsed && currentAssistant && (
            <div className="px-4 py-2 text-sm text-gray-600 border-b border-gray-100">
              <span className="font-medium text-primary">{currentAssistant.name}</span>
            </div>
          )}

          {!middleSidebarCollapsed ? (
        <div className="flex-1 overflow-y-auto">
              {conversations.map((conv) => {
                const isTemp = isTemporaryConversation(conv.id)
                return (
            <div
              key={conv.id}
              className={`w-full p-4 hover:bg-gray-50 border-b border-gray-100 transition-colors ${
                currentConversationId === conv.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <button onClick={() => loadConversation(conv.id)} className="text-left flex-1">
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {editingConversationId === conv.id ? (
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => renameConversation(conv.id, editingName)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') renameConversation(conv.id, editingName)
                          if (e.key === 'Escape') { setEditingConversationId(''); setEditingName('') }
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    ) : (
                          <span>{isTemp ? '新的对话' : (conv.name || '新的对话')}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(conv.updated_at * 1000).toLocaleString('zh-CN')}
                  </div>
                </button>
                    <div className="relative ml-2" data-action-menu>
                <button
                        type="button"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setActionMenuId(prev => (prev === conv.id ? '' : conv.id))
                        }}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                      >
                        <MoreHorizontal className="w-4 h-4 text-gray-600" />
                      </button>
                      {actionMenuId === conv.id && (
                        <div className="absolute right-0 mt-1 w-32 rounded-lg border border-gray-200 bg-white shadow-xl z-[100]" onClick={(e) => e.stopPropagation()}>
                          <button
                            className={`w-full px-4 py-2 text-left text-sm ${isTemp ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-50 text-gray-700'}`}
                            disabled={isTemp}
                            onClick={() => {
                              if (isTemp) return
                              setEditingConversationId(conv.id)
                              setEditingName(conv.name || '')
                              setActionMenuId('')
                            }}
                          >
                            重命名
                          </button>
                          <button
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                            onClick={() => deleteConversation(conv.id)}
                          >
                            删除会话
                </button>
              </div>
                      )}
            </div>
                  </div>
                </div>
              )})}

          {conversations.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-sm">
              暂无对话记录
            </div>
          )}
        </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-xs px-2 text-center">
              展开查看对话记录
            </div>
          )}
        </div>
        {!middleSidebarCollapsed && (
          <div
            className={`w-1 cursor-col-resize bg-transparent hover:bg-gray-200 transition-colors ${isResizingMiddle ? 'bg-gray-300' : ''}`}
            onMouseDown={handleMiddleResizeMouseDown}
          />
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
              {currentAssistant ? currentAssistant.name : '请选择助手'}
              </h1>
            {currentAssistant && (
              <p className="text-sm text-gray-500">
                {currentConversationId ? '对话进行中' : '开始输入以创建新的对话'}
              </p>
              )}
            </div>
          <button
            onClick={() => router.push('/assistants')}
            className="flex items-center px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            返回助手列表
          </button>
        </div>

        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          {!currentAssistant ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <Brain className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>请从左侧选择一个助手开始对话</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>你好，有什么可以帮助你的？</p>
                <p className="text-sm mt-2">开始输入消息开始对话</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl rounded-2xl px-6 py-4 ${
                    message.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="markdown-body text-gray-900">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {message.content || ''}
                      </ReactMarkdown>
                    </div>
                  ) : (
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                  )}
                </div>
              </div>
            ))}
              {assistantTyping && (
                <div className="flex justify-start">
                  <div className="max-w-3xl rounded-2xl px-6 py-4 bg-white border border-gray-200 text-gray-500 flex items-center space-x-3">
                    <span className="text-sm">助手正在输入</span>
                    <div className="flex space-x-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '100ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Input Area */}
        {currentAssistant && (
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="max-w-4xl mx-auto flex items-center space-x-4">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="输入您的问题..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !inputMessage.trim()}
                className="p-3 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            {/* 高级选项折叠区（简化版，每助手1-2项） */}
            <div className="max-w-4xl mx-auto mt-3">
              <details>
                <summary className="cursor-pointer text-sm text-gray-600">高级选项</summary>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.keys(advancedInputs).map((key) => (
                    <div key={key} className="flex items-center space-x-2">
                      <label className="text-sm text-gray-700 w-28">{key}</label>
                      <input
                        className="flex-1 px-3 py-2 border border-gray-300 rounded"
                        value={String(advancedInputs[key] ?? '')}
                        onChange={(e) => setAdvancedInputs({ ...advancedInputs, [key]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  )
}
