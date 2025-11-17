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
  LogOut
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
    // 检查登录状态
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/')
      return
    }
    setUser(JSON.parse(userData))

    // 获取助手列表
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold">星耀AI</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>退出</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* 按你的要求，此页不展示标题与说明文案 */}

        {/* Assistants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assistants.map((assistant) => {
            const Icon = getIcon(assistant.icon_name)
            
            return (
              <div
                key={assistant.id}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 cursor-pointer border-2 border-transparent hover:border-primary group"
                onClick={() => handleSelectAssistant(assistant)}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                    <Icon className="w-8 h-8 text-primary group-hover:text-white" />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {assistant.name}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {assistant.description}
                    </p>
                  </div>

                  <button className="w-full py-2 bg-primary text-white rounded-lg font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    选择助手
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {assistants.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">暂无可用助手</p>
          </div>
        )}
      </main>
    </div>
  )
}
