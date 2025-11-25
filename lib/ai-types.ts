// ============================================================
// 星耀AI - AI 服务类型定义
// 仅支持中转站模式（OpenAI/Claude 兼容格式）
// ============================================================

// ==================== 通用消息类型 ====================
// 用于构建发送给大模型的消息数组
export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// ==================== 流式响应块 ====================
// 大模型返回的流式数据块
export interface AIStreamChunk {
  content: string       // 本次返回的文本内容
  isComplete: boolean   // 是否已完成响应
  metadata?: {
    conversationId?: string    // 对话ID
    conversationName?: string  // 对话名称
  }
}

// ==================== 中转站请求格式（OpenAI 兼容） ====================
// 发送给中转站API的请求体格式
export interface RelayRequest {
  model: string                          // 模型名称，如 gpt-4、claude-3-opus
  messages: AIMessage[]                  // 消息数组
  temperature?: number                   // 温度，控制随机性 (0-2)
  max_tokens?: number                    // 最大输出token数
  top_p?: number                         // 核采样参数 (0-1)
  frequency_penalty?: number             // 频率惩罚 (-2 到 2)
  presence_penalty?: number              // 存在惩罚 (-2 到 2)
  stream?: boolean                       // 是否流式输出
  stop?: string | string[]               // 停止词
  n?: number                             // 生成数量
  logit_bias?: Record<string, number>    // logit偏置
  user?: string                          // 用户标识
}

// ==================== 助手配置类型 ====================
// 数据库中助手的配置信息
export interface AssistantConfig {
  id: string
  name: string
  description?: string
  icon_name?: string
  status?: string
  
  // 中转站配置（必填）
  relay_url: string      // 中转站API地址
  relay_key: string      // API密钥
  relay_model: string    // 模型名称
  
  // 模型参数配置
  system_prompt?: string       // 系统提示词
  temperature?: number         // 温度 (默认 0.8)
  max_tokens?: number          // 最大token (默认 2500)
  top_p?: number               // 核采样 (默认 1.0)
  frequency_penalty?: number   // 频率惩罚 (默认 0)
  presence_penalty?: number    // 存在惩罚 (默认 0)
  context_window?: number      // 上下文消息数量 (默认 20)
  advanced_config?: Record<string, any>  // 高级配置（预留）
  
  // 时间戳
  created_at?: string
  updated_at?: string
}

// ==================== 管理 API 请求类型 ====================
// 创建助手的请求参数
export interface CreateAssistantRequest {
  name: string
  description?: string
  icon_name?: string
  relay_url: string
  relay_key: string
  relay_model: string
  system_prompt?: string
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  context_window?: number
}

// 更新助手的请求参数
export interface UpdateAssistantRequest {
  name?: string
  description?: string
  icon_name?: string
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
