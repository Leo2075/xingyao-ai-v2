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
  MoreHorizontal,
  Square,
  History,
  Settings2,
  Sparkles,
  LayoutGrid
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
  'sparkles': Sparkles,
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

const INPUT_LABELS: Record<string, string> = {
  user: '用户信息',
}

const CONVERSATION_CACHE_TTL = 60 * 1000 // 60秒

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

function ChatPageContent() {
  // State
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [currentCursorRounds, setCurrentCursorRounds] = useState<number | null>(null)
  
  // UI State
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showLoadMoreHint, setShowLoadMoreHint] = useState(false)
  const [assistantTyping, setAssistantTyping] = useState(false)
  const [conversationsLoading, setConversationsLoading] = useState(false)
  
  // Layout State
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)
  const [middleSidebarCollapsed, setMiddleSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false)
  
  // Input State
  const [inputMessage, setInputMessage] = useState('')
  const [advancedInputs, setAdvancedInputs] = useState<Record<string, any>>({})
  const [showAdvancedInputs, setShowAdvancedInputs] = useState(false)
  
  // Edit State
  const [editingConversationId, setEditingConversationId] = useState<string>('')
  const [editingName, setEditingName] = useState<string>('')
  const [actionMenuId, setActionMenuId] = useState<string>('')

  // Refs
  const conversationCacheRef = useRef<Map<string, { data: Conversation[]; updatedAt: number }>>(new Map())
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const loadingMoreRef = useRef(false)
  const scrollIntentRef = useRef<ScrollBehavior | null>(null)
  const currentConversationIdRef = useRef<string>('')
  const activeStreamRef = useRef<{ id: string; assistantId: string } | null>(null)
  const menuRefs = useRef<Map<string, HTMLElement>>(new Map())
  const abortControllerRef = useRef<AbortController | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  
  const isTemporaryConversation = (id?: string) => Boolean(id && id.startsWith('temp-'))

  // Scroll Helpers
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

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const maxHeight = 120
      const newHeight = Math.min(textarea.scrollHeight, maxHeight)
      textarea.style.height = `${newHeight}px`
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden'
    }
  }

  // Effects
  useEffect(() => { adjustTextareaHeight() }, [inputMessage])

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/')
      return
    }
    setUser(JSON.parse(userData))
    
    // Restore sidebar state only on desktop
    if (window.innerWidth >= 768) {
      const storedLeft = localStorage.getItem('chat_left_collapsed')
      if (storedLeft !== null) setLeftSidebarCollapsed(storedLeft === '1')
      const storedMiddle = localStorage.getItem('chat_middle_collapsed')
      if (storedMiddle !== null) setMiddleSidebarCollapsed(storedMiddle === '1')
    }
    
    fetchAssistants()
  }, [router])

  useEffect(() => {
    const assistantId = searchParams.get('assistantId')
    if (assistantId && assistants.length > 0 && user) {
      const assistant = assistants.find(a => a.id === assistantId)
      if (assistant) {
        selectAssistant(assistant)
      }
    }
  }, [searchParams, assistants, user])

  useEffect(() => {
    if (!scrollIntentRef.current) return
    scrollToBottom(scrollIntentRef.current)
    scrollIntentRef.current = null
  }, [messages])

  useEffect(() => {
    currentConversationIdRef.current = currentConversationId
  }, [currentConversationId])

  useEffect(() => {
    if (!actionMenuId) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const menuElement = menuRefs.current.get(actionMenuId)
      if (menuElement && !menuElement.contains(target)) {
        setActionMenuId('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [actionMenuId])

  // Data Fetching Logic
  const fetchAssistants = async () => {
    try {
      const response = await fetch('/api/assistants')
      const data = await response.json()
      if (response.ok) setAssistants(data.assistants)
    } catch (error) {
      console.error('获取助手列表失败:', error)
    }
  }

  const getCachedConversations = (assistantId: string) => {
    const memory = conversationCacheRef.current.get(assistantId)
    const now = Date.now()
    if (memory && now - memory.updatedAt < CONVERSATION_CACHE_TTL && memory.data.length > 0) {
      return memory.data
    }
    if (typeof window !== 'undefined') {
      const key = `conv_cache_${assistantId}`
      const raw = localStorage.getItem(key)
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          if (parsed?.data && Array.isArray(parsed.data) && parsed.data.length > 0 && parsed?.updatedAt && now - parsed.updatedAt < CONVERSATION_CACHE_TTL) {
            conversationCacheRef.current.set(assistantId, parsed)
            return parsed.data as Conversation[]
          }
        } catch (error) {
          console.warn('解析会话缓存失败', error)
        }
      }
    }
    return null
  }

  const saveConversationCache = (assistantId: string, data: Conversation[]) => {
    const payload = { data, updatedAt: Date.now() }
    conversationCacheRef.current.set(assistantId, payload)
    if (typeof window !== 'undefined') {
      const key = `conv_cache_${assistantId}`
      try {
        localStorage.setItem(key, JSON.stringify(payload))
      } catch (error) {
        console.warn('保存会话缓存失败', error)
      }
    }
  }

  const getPresetInputs = (assistant: Assistant) => {
    // ... existing logic ...
    const name = assistant.name || ''
    if (name === '原创选题文案策划') return { user: '' }
    if (name.includes('IP') || name.includes('定位')) return { persona: '', audience: '' }
    if (name.includes('脚本')) return { tone: '专业', duration: '60s' }
    if (name.includes('选题') || name.includes('雷达')) return { platform: '抖音', industry: '' }
    if (name.includes('话术')) return { tone: '接地气', cta: '私信' }
    if (name.includes('剪辑')) return { bgm_style: '轻快', format: '分镜' }
    if (name.includes('发布') || name.includes('策略')) return { best_slot: '晚间', hashtags_count: 5 }
    return {}
  }

  const selectAssistant = async (assistant: Assistant) => {
    activeStreamRef.current = null
    setCurrentAssistant(assistant)
    setMessages([])
    setCurrentConversationId('')
    const preset = getPresetInputs(assistant)
    setAdvancedInputs(preset)
    setMobileMenuOpen(false) // Close mobile menu

    const cached = getCachedConversations(assistant.id)
    if (cached && cached.length > 0) {
      setConversations(prev => {
        const temps = prev.filter(c => isTemporaryConversation(c.id))
        const merged = sortConversationsWithTemp([...temps, ...cached], isTemporaryConversation)
        return merged
      })
      setConversationsLoading(false)
    } else {
      setConversations(prev => prev.filter(c => isTemporaryConversation(c.id)))
      setConversationsLoading(true)
    }

    await fetchConversations(assistant, !cached || cached.length === 0)
  }

  const fetchConversations = async (assistant: Assistant, showLoading = false) => {
    if (!user?.id) return
    try {
      if (showLoading) setConversationsLoading(true)
      const response = await fetch('/api/dify/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantId: assistant.id, userId: user?.id }),
      })
      const data = await response.json()
      if (response.ok && data.conversations) {
        const normalized: Conversation[] = data.conversations
          .map(normalizeConversation)
          .filter((item: Conversation) => Boolean(item.id))
        let nextList: Conversation[] = []
        setConversations((prev) => {
          const temps = prev.filter((item) => isTemporaryConversation(item.id))
          const combined = [...temps, ...normalized]
          const dedupedMap = new Map<string, Conversation>()
          combined.forEach((conv) => {
            if (!conv.id) return
            dedupedMap.set(conv.id, conv)
          })
          nextList = sortConversationsWithTemp(Array.from(dedupedMap.values()), isTemporaryConversation)
          return nextList
        })
        const cacheable = nextList.filter((item) => !isTemporaryConversation(item.id))
        saveConversationCache(assistant.id, cacheable)
      }
    } catch (error) {
      console.error('获取对话列表失败:', error)
    } finally {
      if (showLoading) setConversationsLoading(false)
    }
  }

  // Conversation & Message Logic (Same as before but simplified where possible)
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
        headers: { 'Content-Type': 'application/json' },
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
        if (currentConversationIdRef.current === conversationId) {
          if (mode === 'prepend') {
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id))
              const newMessages = normalized.filter(m => !existingIds.has(m.id))
              return sortMessages([...newMessages, ...prev])
            })
            if (scrollSnapshot) {
              requestAnimationFrame(() => {
                const container = messagesContainerRef.current
                if (!container) return
                const diff = container.scrollHeight - scrollSnapshot.height
                container.scrollTop = scrollSnapshot.top + diff
              })
            }
          } else {
            setMessages(normalized)
            requestScrollToBottom('auto')
          }
          setCurrentCursorRounds(data.nextCursorRounds ?? null)
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
    setMessages([])
    setCurrentCursorRounds(null)
    setAssistantTyping(false)
    setShowLoadMoreHint(false)
    setMobileHistoryOpen(false) // Close mobile history

    if (isTemporaryConversation(conversationId)) return

    setLoading(true)
    try {
      let allMessages: Message[] = []
      let cursorRounds = 0
      let hasMore = true
      
      while (hasMore) {
        const response = await fetch('/api/dify/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assistantId: currentAssistant.id,
            conversationId,
            userId: user?.id,
            cursorRounds,
            rounds: 10,
          }),
        })

        const data = await response.json()
        if (response.ok && data.messages && data.messages.length > 0) {
          const normalized = sortMessages(data.messages.map(normalizeMessage))
          const existingIds = new Set(allMessages.map(m => m.id))
          const newMessages = normalized.filter(m => !existingIds.has(m.id))
          allMessages = sortMessages([...newMessages, ...allMessages])
          hasMore = data.nextCursorRounds != null
          cursorRounds = data.nextCursorRounds ?? 0
        } else {
          hasMore = false
        }
      }
      
      if (currentConversationIdRef.current === conversationId) {
        setMessages(allMessages)
        setCurrentCursorRounds(cursorRounds > 0 ? cursorRounds : null)
        // 使用 setTimeout 确保渲染完成后再滚动，且不使用 smooth
        setTimeout(() => {
          const container = messagesContainerRef.current
          if (container) {
            container.scrollTop = container.scrollHeight
          }
        }, 0)
      }
    } catch (error) {
      console.error('加载对话历史失败:', error)
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
    requestScrollToBottom('auto')
    setMobileHistoryOpen(false)
  }

  const renameConversation = async (conversationId: string, name: string) => {
    if (!currentAssistant || !name.trim() || isTemporaryConversation(conversationId)) return
    const trimmedName = name.trim()
    const oldConversations = [...conversations]
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, name: trimmedName } as Conversation : c))
    setEditingConversationId('')
    setEditingName('')
    setActionMenuId('')

    try {
      await fetch(`/api/dify/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantId: currentAssistant.id, userId: user?.id, name: trimmedName }),
      })
      const cached = conversationCacheRef.current.get(currentAssistant.id)
      if (cached) {
        const updatedCache = cached.data.map(c => c.id === conversationId ? { ...c, name: trimmedName } : c)
        saveConversationCache(currentAssistant.id, updatedCache)
      }
    } catch (e) {
      console.error('重命名失败:', e)
      setConversations(oldConversations)
    }
  }

  const deleteConversation = async (conversationId: string) => {
    if (!currentAssistant || isTemporaryConversation(conversationId)) {
      setActionMenuId('')
      return
    }
    const previousConversations = conversations
    setConversations(prev => prev.filter(c => c.id !== conversationId))

    if (currentConversationId === conversationId) {
      setCurrentConversationId('')
      setMessages([])
      setCurrentCursorRounds(null)
      requestScrollToBottom('auto')
    }

    try {
      const response = await fetch(`/api/dify/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantId: currentAssistant.id, userId: user?.id }),
      })
      if (!response.ok) throw new Error('删除失败')
      await fetchConversations(currentAssistant)
    } catch (error) {
      console.error('删除对话失败:', error)
      setConversations(previousConversations)
      if (currentConversationId === conversationId) {
        setCurrentConversationId(conversationId)
      }
    } finally {
      setActionMenuId('')
    }
  }

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setLoading(false)
      setAssistantTyping(false)
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1]
        if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.content) {
          return prev.slice(0, -1)
        }
        return prev
      })
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
    requestScrollToBottom('auto')
    setInputMessage('')
    setLoading(true)
    setAssistantTyping(true)

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/dify/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistantId: currentAssistant.id,
          message: inputMessage,
          conversationId: conversationIdForRequest || undefined,
          userId: user?.id,
          inputs: advancedInputs,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) throw new Error('发送消息失败')

      const decoder = new TextDecoder()
      let aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        created_at: Date.now(),
      }

      const updateAssistantMessage = () => {
        if (isActiveSession()) {
          setMessages(prev => {
            const updated = [...prev]
            const index = updated.findIndex((msg) => msg.id === aiMessage.id)
            if (index === -1) updated.push(aiMessage)
            else updated[index] = { ...aiMessage }
            return sortMessages(updated)
          })
          requestScrollToBottom('smooth')
        }
      }

      updateAssistantMessage()

      const handleMessageEnd = async (payload: any) => {
        if (!payload?.conversation_id || !assistantSnapshot) return
        const resolvedName = payload.conversation_name || payload.conversation?.name || '新的对话'
        const shouldUpdateConversation = isTemporaryConversation(sessionConversationKey)
        setCurrentConversationId((prevId) => {
          const isCurrentSession = prevId === sessionConversationKey || prevId === payload.conversation_id
          if (shouldUpdateConversation || isCurrentSession) {
            setConversations((prev) => {
              let updatedList = prev.map((conv) => {
                if (shouldUpdateConversation && conv.id === sessionConversationKey) {
                  return { ...conv, id: payload.conversation_id, name: resolvedName, updated_at: toSeconds(Date.now()) }
                }
                return conv
              })
              if (shouldUpdateConversation && !prev.find(c => c.id === sessionConversationKey) && !prev.find(c => c.id === payload.conversation_id)) {
                updatedList = [...updatedList, { id: payload.conversation_id, name: resolvedName, created_at: toSeconds(Date.now()), updated_at: toSeconds(Date.now()) }]
              }
              return sortConversationsWithTemp(updatedList, isTemporaryConversation)
            })
            if (shouldUpdateConversation || isCurrentSession) return payload.conversation_id
          }
          return prevId
        })
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
            if (jsonData.event === 'message_end') await handleMessageEnd(jsonData)
          } catch (e) {}
        }
      }

      const reader = response.body?.getReader()
      if (!reader) {
        const fallbackText = await response.text()
        if (fallbackText) await processChunk(fallbackText)
        return
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        await processChunk(chunk)
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return
      console.error('发送消息失败:', error)
      const fallbackMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '抱歉，发送消息时出现错误，请重试。',
        created_at: Date.now(),
      }
      setMessages(prev => sortMessages([...prev, fallbackMessage]))
    } finally {
      setLoading(false)
      setAssistantTyping(false)
      abortControllerRef.current = null
    }
  }

  const loadMoreMessages = async () => {
    if (!currentConversationId || currentCursorRounds == null || loadingMoreRef.current || isTemporaryConversation(currentConversationId)) return
    const container = messagesContainerRef.current
    if (!container) return
    const snapshot = { height: container.scrollHeight, top: container.scrollTop }
    loadingMoreRef.current = true
    setLoadingMore(true)
    try {
      await fetchConversationMessages(currentConversationId, currentCursorRounds, 'prepend', snapshot)
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current
    if (!container || !currentConversationId || isTemporaryConversation(currentConversationId)) {
      setShowLoadMoreHint(false)
      return
    }
    if (currentCursorRounds != null && container.scrollTop <= 100) {
      setShowLoadMoreHint(true)
      if (container.scrollTop <= 40 && !loadingMoreRef.current) {
        loadMoreMessages()
      }
    } else {
      setShowLoadMoreHint(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/')
  }

  const getIcon = (iconName?: string) => iconMap[iconName || 'sparkles'] || Sparkles

  // --- Render Helpers ---

  return (
    <div className="flex h-[100dvh] bg-gray-50 overflow-hidden font-sans text-gray-900">
      <head>
        {assistants.map(a => (
           <link key={a.id} rel="preload" as="image" href={`/icons/${a.icon_name}.svg`} />
        ))}
      </head>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50 flex items-center justify-between px-4">
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 -ml-2 text-gray-700 active:scale-95 transition-transform"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="font-semibold text-gray-900 truncate max-w-[200px]">
          {currentAssistant ? currentAssistant.name : '星耀AI'}
        </span>
        <button 
          onClick={() => setMobileHistoryOpen(true)}
          className="p-2 -mr-2 text-gray-700 active:scale-95 transition-transform"
        >
          <History className="w-6 h-6" />
        </button>
      </div>

      {/* Left Sidebar (Assistants) */}
      <div className={`
        fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:z-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:flex md:flex-col md:h-full md:flex-shrink-0
      `}>
        <div className="absolute inset-0 bg-black/50 md:hidden" onClick={() => setMobileMenuOpen(false)} />
        <div className={`
          relative w-72 md:w-auto h-full bg-slate-50/80 backdrop-blur-xl border-r border-white/20 flex flex-col shadow-2xl md:shadow-none z-10
          md:transition-all md:duration-300
        `} style={{ width: window.innerWidth >= 768 ? (leftSidebarCollapsed ? 72 : 260) : 280 }}>
          
          {/* Sidebar Header */}
          <div className="p-4 flex items-center justify-between h-16">
             {!leftSidebarCollapsed && (
               <div className="flex items-center space-x-3 font-bold text-lg tracking-tight text-slate-800 animate-fade-in">
                 <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                   <Sparkles className="w-5 h-5 text-white fill-white/20" />
                 </div>
                 <span>星耀AI</span>
               </div>
             )}
             <button
                onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
                className={`hidden md:flex p-2 hover:bg-white/50 rounded-xl transition-all text-slate-400 hover:text-slate-600 ${leftSidebarCollapsed ? 'mx-auto' : ''}`}
              >
                {leftSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
             </button>
          </div>

          {/* Assistant List */}
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
            {assistants.map((assistant) => {
              const Icon = getIcon(assistant.icon_name)
              const isActive = currentAssistant?.id === assistant.id
              
              return (
                <button
                  key={assistant.id}
                  onClick={() => selectAssistant(assistant)}
                  className={`
                    w-full p-3 flex items-center space-x-3 transition-all duration-300 group rounded-xl relative overflow-hidden
                    ${isActive 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                      : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'}
                  `}
                  title={assistant.name}
                >
                  <div className={`
                    relative w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300
                    ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 group-hover:bg-white text-slate-400 group-hover:text-blue-500'}
                  `}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {!leftSidebarCollapsed && (
                    <span className="relative text-sm font-medium truncate flex-1 text-left animate-fade-in">
                      {assistant.name}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* User Profile / Logout */}
          <div className="p-4 mt-auto">
            <button
              onClick={handleLogout}
              className={`
                w-full flex items-center space-x-3 p-3 rounded-xl transition-all group
                hover:bg-red-50 hover:text-red-600 text-slate-400
                ${leftSidebarCollapsed ? 'justify-center' : ''}
              `}
            >
              <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {!leftSidebarCollapsed && <span className="text-sm font-medium">退出登录</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Middle Sidebar (History) */}
      <div className={`
        fixed inset-y-0 right-0 z-50 w-80 transform transition-transform duration-300 ease-in-out bg-white shadow-2xl
        md:relative md:translate-x-0 md:z-0 md:shadow-none md:border-r md:border-gray-200
        ${mobileHistoryOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        flex flex-col
      `} style={{ width: window.innerWidth >= 768 ? (middleSidebarCollapsed ? 0 : 280) : 300, display: (window.innerWidth >= 768 && middleSidebarCollapsed) ? 'none' : 'flex' }}>
         <div className="h-16 px-4 border-b border-gray-100 flex items-center justify-between bg-white/50 backdrop-blur-sm">
           <h2 className="font-semibold text-gray-800 flex items-center">
             <History className="w-4 h-4 mr-2 text-gray-500" />
             对话历史
           </h2>
           <div className="flex items-center space-x-1">
             <button
               onClick={startNewConversation}
               className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-primary"
               title="新对话"
             >
               <Plus className="w-5 h-5" />
             </button>
             <button
               onClick={() => setMobileHistoryOpen(false)}
               className="md:hidden p-1.5 hover:bg-gray-100 rounded-md transition-colors"
             >
               <X className="w-5 h-5" />
             </button>
             <button
               onClick={() => setMiddleSidebarCollapsed(!middleSidebarCollapsed)}
               className="hidden md:flex p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-500"
             >
               <ChevronLeft className="w-4 h-4" />
             </button>
           </div>
         </div>

         <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {conversationsLoading ? (
               [1,2,3].map(i => (
                 <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
               ))
            ) : conversations.length > 0 ? (
               conversations.map(conv => (
                 <div
                   key={conv.id}
                   className={`
                     group relative p-3 rounded-xl transition-all duration-200 cursor-pointer border border-transparent
                     ${currentConversationId === conv.id 
                       ? 'bg-white border-blue-100 shadow-sm ring-1 ring-blue-500/10' 
                       : 'hover:bg-gray-100'}
                     ${actionMenuId === conv.id ? 'z-50' : 'z-0'}
                   `}
                   onClick={() => loadConversation(conv.id)}
                 >
                   <div className="flex justify-between items-start">
                    <h3 className={`text-sm font-medium line-clamp-1 pr-6 ${currentConversationId === conv.id ? 'text-primary' : 'text-gray-700'}`}>
                       {conv.name || '新的对话'}
                     </h3>
                    {/* Menu Button */}
                    <div
                      className="absolute right-2 top-3"
                      ref={(el) => { if (el) menuRefs.current.set(conv.id, el) }}
                    >
                      <button
                        className={`
                          p-1 rounded-md hover:bg-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity
                          ${actionMenuId === conv.id ? 'opacity-100 bg-gray-200' : ''}
                        `}
                        onClick={(e) => {
                          e.stopPropagation()
                          setActionMenuId(prev => prev === conv.id ? '' : conv.id)
                        }}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {/* Context Menu */}
                      {actionMenuId === conv.id && (
                        <div className="absolute top-full right-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 z-50 py-1 animate-fade-in">
                          <button
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                            onClick={(e) => { e.stopPropagation(); renameConversation(conv.id, prompt('重命名', conv.name) || conv.name) }}
                          >
                            重命名
                          </button>
                          <button
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                            onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}
                          >
                            删除
                          </button>
                        </div>
                      )}
                    </div>
                   </div>
                   <span className="text-xs text-gray-400 mt-1 block">
                     {new Date(conv.updated_at * 1000).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                   </span>
                 </div>
               ))
            ) : (
              <div className="text-center text-gray-400 text-sm py-8">
                暂无历史记录
              </div>
            )}
         </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative w-full bg-white md:bg-gray-50/50">
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
              {/* Desktop Header for collapsed middle sidebar */}
              {middleSidebarCollapsed && (
                <div className="hidden md:block animate-fade-in">
                  <button
                    onClick={() => setMiddleSidebarCollapsed(false)}
                    className="p-2 bg-white shadow-sm rounded-lg text-gray-600 hover:text-primary transition-colors border border-gray-200 hover:border-blue-200"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
              <h1 className="text-lg font-semibold text-gray-900 flex items-center">
              {currentAssistant ? currentAssistant.name : '请选择助手'}
              </h1>
            </div>
          <button
            onClick={() => router.push('/assistants')}
            className="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-primary hover:bg-blue-50 rounded-lg transition-all border border-gray-200 hover:border-blue-100"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            返回首页
          </button>
        </div>

        {/* Messages */}
        <div 
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
          className="flex-1 overflow-y-auto scroll-smooth p-4 md:p-8"
        >
          {!currentAssistant ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 animate-fade-in">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
                <Brain className="w-10 h-10 text-gray-300" />
              </div>
              <h2 className="text-xl font-semibold text-gray-600 mb-2">欢迎使用星耀AI</h2>
              <p>请从左侧选择一个AI助手开始创作</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center animate-fade-in">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-500/20">
                <Sparkles className="w-8 h-8 text-white fill-white/20" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {currentAssistant.name}
              </h2>
              <p className="text-gray-500 mb-8 max-w-md text-center leading-relaxed">
                {currentAssistant.description || '我是您的智能助手，随时为您提供专业的建议和内容创作支持。'}
              </p>
            </div>
          ) : (
            <div className="space-y-6 md:space-y-8 max-w-3xl mx-auto pb-32">
               {showLoadMoreHint && (
                 <div className="flex justify-center py-4">
                   <div className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full flex items-center">
                     {loadingMore && <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />}
                     {loadingMore ? '加载中...' : '查看更多历史消息'}
                   </div>
                 </div>
               )}
               
               {messages.map((msg, index) => (
                 <div 
                   key={msg.id} 
                   className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group animate-fade-in`}
                 >
                   <div className={`
                     relative max-w-[90%] md:max-w-[85%] rounded-2xl px-5 py-3.5 shadow-sm text-base leading-relaxed
                     ${msg.role === 'user' 
                       ? 'bg-blue-600 text-white rounded-br-sm shadow-blue-500/20' 
                       : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'}
                   `}>
                     {msg.role === 'assistant' ? (
                       <div className="markdown-body">
                         <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={markdownComponents}
                         >
                           {msg.content}
                         </ReactMarkdown>
                         {/* Actions Toolbar */}
                         <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Actions can be added here like Copy, Retry */}
                         </div>
                       </div>
                     ) : (
                       <div className="whitespace-pre-wrap">{msg.content}</div>
                     )}
                   </div>
                 </div>
               ))}
               
               {assistantTyping && (
                 <div className="flex justify-start animate-fade-in">
                   <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm flex items-center space-x-2">
                     <span className="w-2 h-2 bg-blue-600/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                     <span className="w-2 h-2 bg-blue-600/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                     <span className="w-2 h-2 bg-blue-600/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                   </div>
                 </div>
               )}
            </div>
          )}
        </div>

        {/* Floating Input Area */}
        {currentAssistant && (
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-gray-50 via-gray-50/95 to-transparent z-20 pb-safe">
            <div className="max-w-3xl mx-auto">
               <div className="relative bg-white rounded-2xl shadow-xl shadow-black/5 border border-gray-200/80 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all duration-300">
                 
                 {/* Advanced Toggle */}
                 {Object.keys(advancedInputs).length > 0 && (
                   <div className="px-4 pt-2">
                     <button 
                       onClick={() => setShowAdvancedInputs(!showAdvancedInputs)}
                       className="text-xs text-gray-500 hover:text-blue-600 flex items-center space-x-1 transition-colors"
                     >
                       <Settings2 className="w-3 h-3" />
                       <span>{showAdvancedInputs ? '隐藏高级选项' : '高级选项'}</span>
                     </button>
                     
                     {showAdvancedInputs && (
                       <div className="grid grid-cols-2 gap-3 mt-2 mb-2 p-3 bg-gray-50 rounded-xl animate-fade-in border border-gray-100">
                         {Object.keys(advancedInputs).map((key) => (
                           <div key={key}>
                             <label className="text-xs text-gray-500 block mb-1.5 ml-1">{INPUT_LABELS[key] || key}</label>
                             <input
                               className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                               value={String(advancedInputs[key] ?? '')}
                               onChange={(e) => setAdvancedInputs({ ...advancedInputs, [key]: e.target.value })}
                             />
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                 )}

                 <div className="flex items-end p-2">
                   <textarea
                     ref={textareaRef}
                     rows={1}
                     value={inputMessage}
                     onChange={(e) => setInputMessage(e.target.value)}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' && !e.shiftKey) {
                         e.preventDefault()
                         sendMessage()
                       }
                     }}
                     placeholder="输入您的问题..."
                     className="flex-1 max-h-[150px] py-3 px-4 text-base bg-transparent border-0 focus:ring-0 resize-none outline-none placeholder:text-gray-400"
                   />
                   
                   <div className="flex items-center pb-1.5 pr-1.5 space-x-2">
                     {loading && abortControllerRef.current ? (
                       <button
                         onClick={stopGeneration}
                         className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all duration-200 active:scale-95"
                         title="停止生成"
                       >
                         <Square className="w-5 h-5 fill-current" />
                       </button>
                     ) : (
                       <button
                         onClick={sendMessage}
                         disabled={!inputMessage.trim()}
                         className={`
                           p-2.5 rounded-xl transition-all duration-200 active:scale-95
                           ${inputMessage.trim() 
                             ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:shadow-blue-600/30' 
                             : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                         `}
                       >
                         <Send className="w-5 h-5" />
                       </button>
                     )}
                   </div>
                 </div>
               </div>
               <p className="text-center text-xs text-gray-400 mt-3">
                 AI 内容由大模型生成，请仔细甄别
               </p>
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
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">星耀AI 启动中...</p>
        </div>
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  )
}
