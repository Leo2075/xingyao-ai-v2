'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Assistant, Message, Conversation } from '@/lib/types'
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
  Plus,
  LogOut,
  Pencil
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

function ChatPageContent() {
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [advancedInputs, setAdvancedInputs] = useState<Record<string, any>>({})
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [middleSidebarOpen, setMiddleSidebarOpen] = useState(true)
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)
  const [showPendingModal, setShowPendingModal] = useState(false)
  const [editingConversationId, setEditingConversationId] = useState<string>('')
  const [editingName, setEditingName] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // 检查登录状态
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/')
      return
    }
    setUser(JSON.parse(userData))
    const storedLeftOpen = localStorage.getItem('chat_left_open')
    const storedLeftCollapsed = localStorage.getItem('chat_left_collapsed')
    if (storedLeftOpen !== null) setLeftSidebarOpen(storedLeftOpen === '1')
    if (storedLeftCollapsed !== null) setLeftSidebarCollapsed(storedLeftCollapsed === '1')
    
    // 获取助手列表
    fetchAssistants()
  }, [router])

  useEffect(() => {
    localStorage.setItem('chat_left_open', leftSidebarOpen ? '1' : '0')
  }, [leftSidebarOpen])

  useEffect(() => {
    localStorage.setItem('chat_left_collapsed', leftSidebarCollapsed ? '1' : '0')
  }, [leftSidebarCollapsed])

  useEffect(() => {
    if (!showPendingModal) return
    const t = setTimeout(() => setShowPendingModal(false), 30000)
    return () => clearTimeout(t)
  }, [showPendingModal])

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
    scrollToBottom()
  }, [messages])

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
        setConversations(data.conversations)
      }
    } catch (error) {
      console.error('获取对话列表失败:', error)
    }
  }

  const loadConversation = async (conversationId: string) => {
    if (!currentAssistant) return

    setCurrentConversationId(conversationId)
    setLoading(true)

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
        }),
      })

      const data = await response.json()
      if (response.ok && data.messages) {
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('获取对话历史失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const startNewConversation = () => {
    setCurrentConversationId('')
    setMessages([])
  }

  const renameConversation = async (conversationId: string, name: string) => {
    if (!currentAssistant || !name.trim()) return
    const oldConversations = conversations
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
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentAssistant || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      created_at: Date.now(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setLoading(true)
    setShowPendingModal(true)

    try {
      const response = await fetch('/api/dify/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistantId: currentAssistant.id,
          message: inputMessage,
          conversationId: currentConversationId || undefined,
          userId: user?.id,
          inputs: advancedInputs,
        }),
      })

      if (!response.ok) {
        throw new Error('发送消息失败')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('无法读取响应流')

      const decoder = new TextDecoder()
      let aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        created_at: Date.now(),
      }

      setMessages(prev => [...prev, aiMessage])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonData = JSON.parse(line.slice(6))
              
              if (jsonData.event === 'message') {
                aiMessage.content += jsonData.answer || ''
                if (showPendingModal) setShowPendingModal(false)
                setMessages(prev => {
                  const newMessages = [...prev]
                  newMessages[newMessages.length - 1] = { ...aiMessage }
                  return newMessages
                })
              }

              if (jsonData.event === 'message_end') {
                if (jsonData.conversation_id && !currentConversationId) {
                  setCurrentConversationId(jsonData.conversation_id)
                  await fetchConversations(currentAssistant)
                }
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error('发送消息失败:', error)
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '抱歉，发送消息时出现错误，请重试。',
        created_at: Date.now(),
      }])
    } finally {
      setLoading(false)
      setShowPendingModal(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar - Assistants */}
      <div className={`${leftSidebarOpen ? (leftSidebarCollapsed ? 'w-16' : 'w-64') : 'w-0'} bg-blue-700 text-white transition-all duration-300 overflow-hidden flex flex-col`}>
        <div className="p-4 border-b border-blue-600">
          <div className="flex items-center justify-between">
            <span className="font-semibold">助手列表</span>
            <div className="flex items-center space-x-2">
              <button onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)} className="p-2 hover:bg-blue-600 rounded-lg transition-colors">
                {leftSidebarCollapsed ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <button onClick={() => setLeftSidebarOpen(false)} className="p-2 hover:bg-blue-600 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {assistants.map((assistant) => {
            const Icon = getIcon(assistant.icon_name)
            const isActive = currentAssistant?.id === assistant.id

            return (
              <button
                key={assistant.id}
                onClick={() => selectAssistant(assistant)}
                className={`w-full ${leftSidebarCollapsed ? 'p-3' : 'p-4'} ${leftSidebarCollapsed ? 'flex items-center justify-center' : 'flex flex-col items-center text-center space-y-2'} hover:bg-blue-600 transition-colors ${
                  isActive ? 'bg-blue-600' : ''
                }`}
                title={assistant.name}
              >
                <Icon className="w-8 h-8" />
                {!leftSidebarCollapsed && <span className="text-xs">{assistant.name}</span>}
              </button>
            )
          })}
        </div>

        <div className="p-4 border-t border-blue-600">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">退出登录</span>
          </button>
        </div>
      </div>

      {/* Middle Sidebar - Conversations */}
      <div className={`${middleSidebarOpen ? 'w-80' : 'w-0'} bg-white border-r border-gray-200 transition-all duration-300 overflow-hidden flex flex-col`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">对话记录</h2>
            <button
              onClick={startNewConversation}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="开始新对话"
            >
              <Plus className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {currentAssistant && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span className="font-medium text-primary">{currentAssistant.name}</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
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
                      <span>{conv.name || '新对话'}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(conv.updated_at * 1000).toLocaleString('zh-CN')}
                  </div>
                </button>
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg ml-2"
                  title="重命名"
                  onClick={() => { setEditingConversationId(conv.id); setEditingName(conv.name || '') }}
                >
                  <Pencil className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          ))}

          {conversations.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-sm">
              暂无对话记录
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            {leftSidebarOpen && (
              <button
                onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {leftSidebarCollapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5 rotate-180" />}
              </button>
            )}

            <button
              onClick={() => router.push('/assistants')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {currentAssistant ? `为 ${currentAssistant.name} 的对话` : '请选择助手'}
              </h1>
              {currentConversationId && (
                <p className="text-sm text-gray-500">对话进行中</p>
              )}
            </div>
          </div>

          <button
            onClick={() => setMiddleSidebarOpen(!middleSidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {showPendingModal && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
              <div className="bg-white rounded-xl shadow-lg p-6 flex items-center space-x-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <div className="text-sm text-gray-700">正在等待助手回复…</div>
              </div>
            </div>
          )}
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
            messages.map((message) => (
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
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
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
