// ============================================================
// 星耀AI - AI 服务层
// 支持 Dify 和 中转站 两种调用模式
// ============================================================

import { supabase } from './supabase'
import { AssistantConfig, AIMessage, AIStreamChunk, DifyRequest, RelayRequest } from './ai-types'

export class AIService {
  constructor(private assistant: AssistantConfig) {}

  /**
   * 发送消息并返回流式响应
   */
  async *sendMessage(
    userMessage: string,
    conversationId?: string,
    userId?: string,
    inputs?: Record<string, any>
  ): AsyncGenerator<AIStreamChunk> {
    if (this.assistant.api_mode === 'dify') {
      yield* this.sendToDify(userMessage, conversationId, userId, inputs)
    } else {
      yield* this.sendToRelay(userMessage, conversationId, userId)
    }
  }

  /**
   * Dify 模式
   */
  private async *sendToDify(
    userMessage: string,
    conversationId?: string,
    userId?: string,
    inputs?: Record<string, any>
  ): AsyncGenerator<AIStreamChunk> {
    const url = `${this.assistant.dify_url}/chat-messages`
    const userIdentifier = userId ? `user-${userId}` : 'user-anon'
    
    const body: DifyRequest = {
      query: userMessage,
      user: userIdentifier,
      response_mode: 'streaming',
      conversation_id: conversationId,
      inputs: inputs || {},
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.assistant.dify_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error('Dify API error:', response.status, errorText)
      throw new Error(`Dify API error: ${response.status}`)
    }

    if (!response.body) {
      throw new Error('Dify response body is null')
    }

    yield* this.parseDifyStream(response.body)
  }

  /**
   * 中转站模式（OpenAI 格式）
   */
  private async *sendToRelay(
    userMessage: string,
    conversationId?: string,
    userId?: string
  ): AsyncGenerator<AIStreamChunk> {
    // 1. 查询历史消息
    const historyMessages = await this.getHistoryMessages(conversationId, userId)

    // 2. 构造消息数组
    const messages: AIMessage[] = [
      ...(this.assistant.system_prompt 
        ? [{ role: 'system' as const, content: this.assistant.system_prompt }] 
        : []),
      ...historyMessages,
      { role: 'user' as const, content: userMessage },
    ]

    // 3. 构造请求体
    const body: RelayRequest = {
      model: this.assistant.relay_model!,
      messages,
      temperature: this.assistant.temperature ?? 0.8,
      max_tokens: this.assistant.max_tokens ?? 2500,
      top_p: this.assistant.top_p ?? 1.0,
      frequency_penalty: this.assistant.frequency_penalty ?? 0,
      presence_penalty: this.assistant.presence_penalty ?? 0,
      stream: true,
      ...(this.assistant.advanced_config || {}),  // 合并高级配置
    }

    const response = await fetch(this.assistant.relay_url!, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.assistant.relay_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error('Relay API error:', response.status, errorText)
      throw new Error(`Relay API error: ${response.status}`)
    }

    if (!response.body) {
      throw new Error('Relay response body is null')
    }

    yield* this.parseRelayStream(response.body)
  }

  /**
   * 查询历史消息（仅中转站模式使用）
   */
  private async getHistoryMessages(conversationId?: string, userId?: string): Promise<AIMessage[]> {
    if (!conversationId) return []

    const userIdentifier = userId ? `user-${userId}` : 'user-anon'
    const limit = this.assistant.context_window || 20

    const { data, error } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .eq('user_id', userIdentifier)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to fetch history messages:', error)
      return []
    }

    // 反转顺序（因为查询是倒序的）
    return (data || []).reverse() as AIMessage[]
  }

  /**
   * 解析 Dify 流式响应
   */
  private async *parseDifyStream(body: ReadableStream<Uint8Array>): AsyncGenerator<AIStreamChunk> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue

          try {
            const json = JSON.parse(data)
            
            if (json.event === 'message') {
              yield {
                content: json.answer || '',
                isComplete: false,
              }
            }
            
            if (json.event === 'message_end') {
              yield {
                content: '',
                isComplete: true,
                metadata: {
                  conversationId: json.conversation_id,
                  conversationName: json.conversation_name,
                },
              }
            }

            // 处理错误事件
            if (json.event === 'error') {
              console.error('Dify error event:', json)
              throw new Error(json.message || 'Dify error')
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              console.warn('Dify parse warning:', e.message, 'data:', data)
            } else {
              throw e
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * 解析中转站流式响应（OpenAI 格式）
   */
  private async *parseRelayStream(body: ReadableStream<Uint8Array>): AsyncGenerator<AIStreamChunk> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          
          if (data === '[DONE]') {
            yield { content: '', isComplete: true }
            continue
          }

          try {
            const json = JSON.parse(data)
            
            // 处理错误响应
            if (json.error) {
              console.error('Relay error:', json.error)
              throw new Error(json.error.message || 'Relay API error')
            }

            const content = json.choices?.[0]?.delta?.content || ''
            const finishReason = json.choices?.[0]?.finish_reason
            
            if (content) {
              yield { content, isComplete: false }
            }

            // 检查是否完成
            if (finishReason === 'stop') {
              yield { content: '', isComplete: true }
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              console.warn('Relay parse warning:', e.message, 'data:', data)
            } else {
              throw e
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}

// ==================== 辅助函数 ====================

/**
 * 生成对话名称（取用户消息前 20 字）
 */
export function generateConversationName(userMessage: string): string {
  const cleaned = userMessage.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= 20) return cleaned
  return cleaned.slice(0, 20) + '...'
}

/**
 * 生成新的对话 ID
 */
export function generateConversationId(): string {
  return crypto.randomUUID()
}

