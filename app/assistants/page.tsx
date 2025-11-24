'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Assistant } from '@/lib/types'
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
  LogOut,
  Sparkles,
  ArrowRight
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

export default function AssistantsPage() {
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/')
      return
    }
    setUser(JSON.parse(userData))
    fetchAssistants()
  }, [router])

  const fetchAssistants = async () => {
    try {
      const response = await fetch('/api/assistants')
      const data = await response.json()
      if (response.ok) {
        setAssistants(data.assistants)
      }
    } catch (error) {
      console.error('获取助手列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAssistant = (assistant: Assistant) => {
    router.push(`/chat?assistantId=${assistant.id}`)
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/')
  }

  const getIcon = (iconName?: string) => {
    if (!iconName) return Brain
    return iconMap[iconName] || Brain
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-gray-500 font-medium">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary fill-current" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-700">
              星耀AI
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
             {user && (
               <span className="text-sm text-gray-500 hidden md:block">
                 欢迎回来，{user.name || '用户'}
               </span>
             )}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>退出</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
            选择您的 AI 创作伙伴
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            从下方的专业助手库中选择一个，开始您的内容创作之旅。无论是短视频脚本还是账号定位，我们都能帮到您。
          </p>
        </div>

        {/* Assistants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {assistants.map((assistant) => {
            const Icon = getIcon(assistant.icon_name)
            
            return (
              <div
                key={assistant.id}
                onClick={() => handleSelectAssistant(assistant)}
                className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-gray-100 overflow-hidden"
              >
                {/* Decorative background gradient */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 opacity-50" />
                
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center mb-5 group-hover:border-primary/20 group-hover:bg-primary/5 transition-colors">
                    <Icon className="w-7 h-7 text-gray-700 group-hover:text-primary transition-colors" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                    {assistant.name}
                  </h3>
                  
                  <p className="text-sm text-gray-500 line-clamp-2 mb-6 h-10">
                    {assistant.description || '专业的 AI 内容创作助手，帮助您提升效率。'}
                  </p>

                  <div className="flex items-center text-primary text-sm font-medium opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    <span>开始对话</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {assistants.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">暂无可用助手</p>
            <p className="text-sm text-gray-400 mt-2">请联系管理员添加助手配置</p>
          </div>
        )}
      </main>
    </div>
  )
}
