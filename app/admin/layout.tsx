'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Brain, ArrowLeft, LogOut } from 'lucide-react'
import { AuthContext, AuthContextType } from './auth-context'

// ==================== 管理后台布局 ====================
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const router = useRouter()

  // 检查本地存储的认证状态
  useEffect(() => {
    const storedToken = localStorage.getItem('admin_token')
    if (storedToken) {
      setToken(storedToken)
      setIsAuthenticated(true)
    }
    setCheckingAuth(false)
  }, [])

  // 登录
  const login = async (pwd: string): Promise<boolean> => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        localStorage.setItem('admin_token', data.token)
        setToken(data.token)
        setIsAuthenticated(true)
        return true
      } else {
        setError(data.error || '登录失败')
        return false
      }
    } catch (err) {
      setError('网络错误，请重试')
      return false
    } finally {
      setLoading(false)
    }
  }

  // 登出
  const logout = () => {
    localStorage.removeItem('admin_token')
    setToken(null)
    setIsAuthenticated(false)
    setPassword('')
  }

  // 处理登录表单提交
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    await login(password)
  }

  // 检查认证状态中
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // 未登录状态 - 显示登录页面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">管理后台</h1>
          <p className="text-gray-500 text-center mb-8">请输入管理员密码</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="管理员密码"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                autoFocus
                disabled={loading}
              />
              {error && (
                <p className="text-red-500 text-sm mt-2 flex items-center">
                  <span className="w-1 h-1 bg-red-500 rounded-full mr-2" />
                  {error}
                </p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                '登录'
              )}
            </button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-gray-100">
            <button
              onClick={() => router.push('/chat')}
              className="w-full text-gray-500 hover:text-gray-700 text-sm flex items-center justify-center space-x-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>返回聊天页面</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 已登录状态 - 显示管理后台
  return (
    <AuthContext.Provider value={{ isAuthenticated, token, login, logout }}>
      <div className="min-h-screen bg-gray-50">
        {/* 顶部导航栏 */}
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">星耀AI</h1>
                    <p className="text-xs text-gray-500 -mt-0.5">管理后台</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.push('/chat')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium flex items-center space-x-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>返回聊天</span>
                </button>
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium transition-colors flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>退出</span>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* 主内容区 */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </AuthContext.Provider>
  )
}

