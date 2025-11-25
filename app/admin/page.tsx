'use client'

import { useState, useEffect } from 'react'
import { useAdminAuth } from './auth-context'
import { 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Check,
  AlertCircle,
  Zap,
  Cloud,
  Settings,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save
} from 'lucide-react'

interface Assistant {
  id: string
  name: string
  description: string
  icon_name: string
  status: string
  api_mode: 'dify' | 'relay'
  dify_url?: string
  dify_key?: string
  relay_url?: string
  relay_key?: string
  relay_model?: string
  system_prompt?: string
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  context_window?: number
  created_at?: string
  updated_at?: string
}

// 图标选项
const ICON_OPTIONS = [
  { value: 'brain', label: '大脑' },
  { value: 'video', label: '视频' },
  { value: 'target', label: '目标' },
  { value: 'file-text', label: '文档' },
  { value: 'film', label: '电影' },
  { value: 'message-square', label: '消息' },
  { value: 'bar-chart', label: '图表' },
  { value: 'users', label: '用户' },
  { value: 'dollar-sign', label: '金钱' },
  { value: 'sparkles', label: '星星' },
]

export default function AdminPage() {
  const { token } = useAdminAuth()
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // 新建助手表单
  const [newAssistant, setNewAssistant] = useState({
    name: '',
    description: '',
    icon_name: 'brain',
    api_mode: 'relay' as 'dify' | 'relay',
    dify_url: '',
    dify_key: '',
    relay_url: '',
    relay_key: '',
    relay_model: '',
    system_prompt: '',
    temperature: 0.8,
    max_tokens: 2500,
    context_window: 20,
  })

  // 加载助手列表
  useEffect(() => {
    fetchAssistants()
  }, [token])

  const fetchAssistants = async () => {
    if (!token) return
    setLoading(true)
    try {
      const response = await fetch('/api/admin/assistants', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (response.ok) {
        setAssistants(data.assistants || [])
      } else {
        showNotification('error', data.error || '加载失败')
      }
    } catch (error) {
      showNotification('error', '网络错误，请刷新页面')
    } finally {
      setLoading(false)
    }
  }

  // 更新助手
  const updateAssistant = async (id: string, updates: Partial<Assistant>) => {
    if (!token) return
    setSaving(id)
    try {
      const response = await fetch(`/api/admin/assistants/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates),
      })

      const data = await response.json()
      if (response.ok) {
        setAssistants(prev => 
          prev.map(a => a.id === id ? { ...a, ...data.assistant } : a)
        )
        showNotification('success', '保存成功')
      } else {
        showNotification('error', data.error || '保存失败')
      }
    } catch (error) {
      showNotification('error', '网络错误，请重试')
    } finally {
      setSaving(null)
    }
  }

  // 创建助手
  const createAssistant = async () => {
    if (!token) return
    if (!newAssistant.name) {
      showNotification('error', '请输入助手名称')
      return
    }

    setSaving('new')
    try {
      const response = await fetch('/api/admin/assistants', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newAssistant),
      })

      const data = await response.json()
      if (response.ok) {
        setAssistants(prev => [...prev, data.assistant])
        setShowCreateModal(false)
        setNewAssistant({
          name: '',
          description: '',
          icon_name: 'brain',
          api_mode: 'relay',
          dify_url: '',
          dify_key: '',
          relay_url: '',
          relay_key: '',
          relay_model: '',
          system_prompt: '',
          temperature: 0.8,
          max_tokens: 2500,
          context_window: 20,
        })
        showNotification('success', '助手创建成功')
      } else {
        showNotification('error', data.error || '创建失败')
      }
    } catch (error) {
      showNotification('error', '网络错误，请重试')
    } finally {
      setSaving(null)
    }
  }

  // 删除助手
  const deleteAssistant = async (id: string) => {
    if (!token) return
    setSaving(id)
    try {
      const response = await fetch(`/api/admin/assistants/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (response.ok) {
        setAssistants(prev => prev.filter(a => a.id !== id))
        setDeleteConfirm(null)
        showNotification('success', data.message || '删除成功')
      } else {
        showNotification('error', data.error || '删除失败')
      }
    } catch (error) {
      showNotification('error', '网络错误，请重试')
    } finally {
      setSaving(null)
    }
  }

  const toggleKeyVisibility = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 通知栏 */}
      {notification && (
        <div className={`fixed top-20 right-4 z-50 px-6 py-3 rounded-xl shadow-lg flex items-center space-x-2 animate-fade-in ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {notification.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">助手配置管理</h2>
          <p className="text-gray-500 mt-1">管理 {assistants.length} 个 AI 助手的调用模式和参数</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchAssistants}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            <span>刷新</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>新增助手</span>
          </button>
        </div>
      </div>

      {/* 助手列表 */}
      <div className="grid gap-6">
        {assistants.map((assistant) => (
          <div 
            key={assistant.id} 
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* 助手头部 */}
            <div className="p-6 border-b border-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-xl font-bold text-gray-900">{assistant.name}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      assistant.api_mode === 'dify' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {assistant.api_mode === 'dify' ? 'Dify' : '中转站'}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm mt-1">{assistant.description}</p>
                </div>
                
                {/* 模式切换按钮 */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateAssistant(assistant.id, { api_mode: 'dify' })}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all ${
                      assistant.api_mode === 'dify'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    disabled={saving === assistant.id}
                  >
                    <Cloud className="w-4 h-4" />
                    <span>Dify</span>
                  </button>
                  
                  <button
                    onClick={() => updateAssistant(assistant.id, { api_mode: 'relay' })}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all ${
                      assistant.api_mode === 'relay'
                        ? 'bg-green-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    disabled={saving === assistant.id}
                  >
                    <Zap className="w-4 h-4" />
                    <span>中转站</span>
                  </button>

                  <button
                    onClick={() => setDeleteConfirm(assistant.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
                    title="删除助手"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 配置区域 */}
            <div className="p-6 space-y-6">
              {/* Dify 配置 */}
              {assistant.api_mode === 'dify' && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center space-x-2 mb-2">
                    <Cloud className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-900">Dify 配置</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dify API URL
                      </label>
                      <input
                        type="text"
                        value={assistant.dify_url || ''}
                        onChange={(e) => updateAssistant(assistant.id, { dify_url: e.target.value })}
                        placeholder="https://api.dify.ai/v1"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dify API Key
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type={showKeys[assistant.id] ? 'text' : 'password'}
                          value={assistant.dify_key || ''}
                          onChange={(e) => updateAssistant(assistant.id, { dify_key: e.target.value })}
                          placeholder="app-xxx"
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => toggleKeyVisibility(assistant.id)}
                          className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500"
                        >
                          {showKeys[assistant.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 中转站配置 */}
              {assistant.api_mode === 'relay' && (
                <div className="space-y-4 p-4 bg-green-50 rounded-xl">
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-green-900">中转站配置</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        中转站 API URL
                      </label>
                      <input
                        type="text"
                        value={assistant.relay_url || ''}
                        onChange={(e) => updateAssistant(assistant.id, { relay_url: e.target.value })}
                        placeholder="https://api.oneapi.com/v1/chat/completions"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        API Key
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type={showKeys[assistant.id] ? 'text' : 'password'}
                          value={assistant.relay_key || ''}
                          onChange={(e) => updateAssistant(assistant.id, { relay_key: e.target.value })}
                          placeholder="sk-xxx"
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => toggleKeyVisibility(assistant.id)}
                          className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500"
                        >
                          {showKeys[assistant.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        模型名称
                      </label>
                      <input
                        type="text"
                        value={assistant.relay_model || ''}
                        onChange={(e) => updateAssistant(assistant.id, { relay_model: e.target.value })}
                        placeholder="claude-haiku-4-5-20251001"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        历史消息数
                      </label>
                      <input
                        type="number"
                        value={assistant.context_window || 20}
                        onChange={(e) => updateAssistant(assistant.id, { context_window: parseInt(e.target.value) || 20 })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 高级参数（可折叠） */}
              <div>
                <button
                  onClick={() => setExpandedId(expandedId === assistant.id ? null : assistant.id)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 font-medium"
                >
                  <Settings className="w-4 h-4" />
                  <span>高级参数</span>
                  {expandedId === assistant.id ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                
                {expandedId === assistant.id && (
                  <div className="mt-4 grid grid-cols-5 gap-4 p-4 bg-gray-50 rounded-xl">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Temperature
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="2"
                        value={assistant.temperature ?? 0.8}
                        onChange={(e) => updateAssistant(assistant.id, { temperature: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Max Tokens
                      </label>
                      <input
                        type="number"
                        value={assistant.max_tokens ?? 2500}
                        onChange={(e) => updateAssistant(assistant.id, { max_tokens: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Top P
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={assistant.top_p ?? 1.0}
                        onChange={(e) => updateAssistant(assistant.id, { top_p: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        频率惩罚
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="-2"
                        max="2"
                        value={assistant.frequency_penalty ?? 0}
                        onChange={(e) => updateAssistant(assistant.id, { frequency_penalty: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        存在惩罚
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="-2"
                        max="2"
                        value={assistant.presence_penalty ?? 0}
                        onChange={(e) => updateAssistant(assistant.id, { presence_penalty: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 系统提示词 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  系统提示词 (System Prompt)
                </label>
                <textarea
                  value={assistant.system_prompt || ''}
                  onChange={(e) => updateAssistant(assistant.id, { system_prompt: e.target.value })}
                  rows={4}
                  placeholder="你是一个..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-none"
                />
              </div>
            </div>

            {/* 保存状态提示 */}
            {saving === assistant.id && (
              <div className="px-6 py-3 bg-blue-50 border-t border-blue-100 flex items-center space-x-2 text-blue-700">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">保存中...</span>
              </div>
            )}
          </div>
        ))}

        {assistants.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无助手</h3>
            <p className="text-gray-500 mb-4">点击上方"新增助手"按钮创建第一个助手</p>
          </div>
        )}
      </div>

      {/* 新增助手弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">新增助手</h3>
              <p className="text-gray-500 text-sm mt-1">创建一个新的 AI 助手</p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    助手名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAssistant.name}
                    onChange={(e) => setNewAssistant({ ...newAssistant, name: e.target.value })}
                    placeholder="如：脚本专家"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">图标</label>
                  <select
                    value={newAssistant.icon_name}
                    onChange={(e) => setNewAssistant({ ...newAssistant, icon_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {ICON_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <input
                  type="text"
                  value={newAssistant.description}
                  onChange={(e) => setNewAssistant({ ...newAssistant, description: e.target.value })}
                  placeholder="助手的功能描述"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 调用模式 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  调用模式 <span className="text-red-500">*</span>
                </label>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setNewAssistant({ ...newAssistant, api_mode: 'dify' })}
                    className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all ${
                      newAssistant.api_mode === 'dify'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Cloud className="w-5 h-5" />
                    <span>Dify 模式</span>
                  </button>
                  <button
                    onClick={() => setNewAssistant({ ...newAssistant, api_mode: 'relay' })}
                    className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all ${
                      newAssistant.api_mode === 'relay'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Zap className="w-5 h-5" />
                    <span>中转站模式</span>
                  </button>
                </div>
              </div>

              {/* Dify 配置 */}
              {newAssistant.api_mode === 'dify' && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-xl">
                  <h4 className="font-medium text-blue-900">Dify 配置</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dify URL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newAssistant.dify_url}
                        onChange={(e) => setNewAssistant({ ...newAssistant, dify_url: e.target.value })}
                        placeholder="https://api.dify.ai/v1"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dify Key <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={newAssistant.dify_key}
                        onChange={(e) => setNewAssistant({ ...newAssistant, dify_key: e.target.value })}
                        placeholder="app-xxx"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 中转站配置 */}
              {newAssistant.api_mode === 'relay' && (
                <div className="space-y-4 p-4 bg-green-50 rounded-xl">
                  <h4 className="font-medium text-green-900">中转站配置</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        中转站 URL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newAssistant.relay_url}
                        onChange={(e) => setNewAssistant({ ...newAssistant, relay_url: e.target.value })}
                        placeholder="https://api.oneapi.com/v1/chat/completions"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        API Key <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={newAssistant.relay_key}
                        onChange={(e) => setNewAssistant({ ...newAssistant, relay_key: e.target.value })}
                        placeholder="sk-xxx"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        模型名称 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newAssistant.relay_model}
                        onChange={(e) => setNewAssistant({ ...newAssistant, relay_model: e.target.value })}
                        placeholder="claude-haiku-4-5-20251001"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 系统提示词 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">系统提示词</label>
                <textarea
                  value={newAssistant.system_prompt}
                  onChange={(e) => setNewAssistant({ ...newAssistant, system_prompt: e.target.value })}
                  rows={3}
                  placeholder="你是一个专业的AI助手..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
                />
              </div>

              {/* 模型参数 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={newAssistant.temperature}
                    onChange={(e) => setNewAssistant({ ...newAssistant, temperature: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
                  <input
                    type="number"
                    value={newAssistant.max_tokens}
                    onChange={(e) => setNewAssistant({ ...newAssistant, max_tokens: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">历史消息数</label>
                  <input
                    type="number"
                    value={newAssistant.context_window}
                    onChange={(e) => setNewAssistant({ ...newAssistant, context_window: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 text-gray-600 hover:text-gray-900 font-medium"
              >
                取消
              </button>
              <button
                onClick={createAssistant}
                disabled={saving === 'new'}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {saving === 'new' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>创建</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">确认删除</h3>
                <p className="text-gray-500 text-sm">
                  删除后将无法恢复，确定要删除这个助手吗？
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
              >
                取消
              </button>
              <button
                onClick={() => deleteAssistant(deleteConfirm)}
                disabled={saving === deleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {saving === deleteConfirm && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>确认删除</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

