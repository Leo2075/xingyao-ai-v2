// ============================================================
// 星耀AI - AI 服务类型定义
// ============================================================

// ==================== 通用消息类型 ====================
export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// ==================== 流式响应块 ====================
export interface AIStreamChunk {
  content: string
  isComplete: boolean
  metadata?: {
    conversationId?: string
    conversationName?: string
  }
}

// ==================== Dify 请求格式 ====================
export interface DifyRequest {
  query: string
  user: string
  response_mode: 'streaming' | 'blocking'
  conversation_id?: string
  inputs?: Record<string, any>
}

// ==================== 中转站请求格式（OpenAI 兼容） ====================
export interface RelayRequest {
  model: string
  messages: AIMessage[]
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  stream?: boolean
  stop?: string | string[]
  n?: number
  logit_bias?: Record<string, number>
  user?: string
}

// ==================== 助手配置类型 ====================
export interface AssistantConfig {
  id: string
  name: string
  description?: string
  icon_name?: string
  status?: string
  
  // 调用模式
  api_mode: 'dify' | 'relay'
  
  // Dify 配置
  dify_url?: string
  dify_key?: string
  
  // 中转站配置
  relay_url?: string
  relay_key?: string
  relay_model?: string
  
  // 通用参数
  system_prompt?: string
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  context_window?: number
  advanced_config?: Record<string, any>
  
  // 时间戳
  created_at?: string
  updated_at?: string
}

// ==================== 管理 API 请求类型 ====================
export interface CreateAssistantRequest {
  name: string
  description?: string
  icon_name?: string
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
}

export interface UpdateAssistantRequest {
  name?: string
  description?: string
  icon_name?: string
  api_mode?: 'dify' | 'relay'
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
  advanced_config?: Record<string, any>
}

