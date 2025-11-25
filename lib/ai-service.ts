// ============================================================
// 星耀AI - AI 服务层
// 仅支持中转站模式（OpenAI/Claude 兼容格式）
// ============================================================

import { supabase } from './supabase'
import { AssistantConfig, AIMessage, AIStreamChunk, RelayRequest } from './ai-types'

/**
 * AI 服务类
 * 负责与中转站 API 通信，支持 OpenAI 和 Claude 两种格式
 */
export class AIService {
  constructor(private assistant: AssistantConfig) {}

  /**
   * 发送消息并返回流式响应
   * @param userMessage 用户消息
   * @param conversationId 对话ID（可选）
   * @param userId 用户ID（可选）
   */
  async *sendMessage(
    userMessage: string,
    conversationId?: string,
    userId?: string
  ): AsyncGenerator<AIStreamChunk> {
    // 1. 查询历史消息（用于上下文）
    const historyMessages = await this.getHistoryMessages(conversationId, userId)

    // 2. 检测 API 格式（根据 URL 判断）
    // 包含 /messages 的是 Claude 格式，否则是 OpenAI 格式
    const isClaudeFormat = this.assistant.relay_url?.includes('/messages')
    
    // 3. 构造请求体
    let body: Record<string, any>
    let headers: Record<string, string>

    if (isClaudeFormat) {
      // Claude 格式：system 单独传递，不在 messages 数组中
      const messages = [
        ...historyMessages,
        { role: 'user' as const, content: userMessage },
      ]

      body = {
        model: this.assistant.relay_model,
        max_tokens: this.assistant.max_tokens ?? 2500,
        temperature: this.assistant.temperature ?? 0.8,
        stream: true,
        ...(this.assistant.system_prompt && { system: this.assistant.system_prompt }),
        messages,
        ...(this.assistant.advanced_config || {}),
      }

      // Claude 使用 x-api-key 认证
      headers = {
        'x-api-key': this.assistant.relay_key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      }
    } else {
      // OpenAI 格式：system 作为第一条消息
      const messages: AIMessage[] = [
        ...(this.assistant.system_prompt 
          ? [{ role: 'system' as const, content: this.assistant.system_prompt }] 
          : []),
        ...historyMessages,
        { role: 'user' as const, content: userMessage },
      ]

      body = {
        model: this.assistant.relay_model,
        messages,
        temperature: this.assistant.temperature ?? 0.8,
        max_tokens: this.assistant.max_tokens ?? 2500,
        top_p: this.assistant.top_p ?? 1.0,
        frequency_penalty: this.assistant.frequency_penalty ?? 0,
        presence_penalty: this.assistant.presence_penalty ?? 0,
        stream: true,
        ...(this.assistant.advanced_config || {}),
      }

      // OpenAI 使用 Bearer Token 认证
      headers = {
        'Authorization': `Bearer ${this.assistant.relay_key}`,
        'Content-Type': 'application/json',
      }
    }

    // 详细日志：发送给大模型的完整信息
    console.log('========== [AIService] 中转站请求详情 ==========')
    console.log(`[AIService] API 格式: ${isClaudeFormat ? 'Claude' : 'OpenAI'}`)
    console.log(`[AIService] 模型: ${body.model}`)
    console.log(`[AIService] 温度: ${body.temperature}`)
    console.log(`[AIService] 最大Token: ${body.max_tokens}`)
    console.log(`[AIService] 历史消息数: ${historyMessages.length} 条`)
    console.log(`[AIService] 总消息数: ${body.messages.length} 条`)
    console.log(`[AIService] System Prompt: ${isClaudeFormat ? (body.system ? '有' : '无') : (body.messages[0]?.role === 'system' ? '有' : '无')}`)
    console.log('[AIService] 发送的消息内容:')
    console.log(JSON.stringify(body.messages, null, 2))
    console.log('================================================')

    // 4. 发送请求
    const response = await fetch(this.assistant.relay_url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error('[AIService] API 错误:', response.status, errorText)
      throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
    }

    if (!response.body) {
      throw new Error('响应体为空')
    }

    // 5. 根据格式选择解析器
    if (isClaudeFormat) {
      yield* this.parseClaudeStream(response.body)
    } else {
      yield* this.parseOpenAIStream(response.body)
    }
  }

  /**
   * 查询历史消息（用于构建上下文）
   * @param conversationId 对话ID
   * @param userId 用户ID
   * @returns 历史消息数组
   */
  private async getHistoryMessages(conversationId?: string, userId?: string): Promise<AIMessage[]> {
    if (!conversationId) return []

    const userIdentifier = userId ? `user-${userId}` : 'user-anon'
    // 获取最近 N 条消息作为上下文
    const limit = this.assistant.context_window || 20

    const { data, error } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .eq('user_id', userIdentifier)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[AIService] 获取历史消息失败:', error)
      return []
    }

    // 反转顺序（因为查询是倒序的）
    return (data || []).reverse() as AIMessage[]
  }

  /**
   * 解析 OpenAI 格式的流式响应
   * 格式: data: {"choices":[{"delta":{"content":"xxx"}}]}
   */
  private async *parseOpenAIStream(body: ReadableStream<Uint8Array>): AsyncGenerator<AIStreamChunk> {
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
          
          // [DONE] 表示流结束
          if (data === '[DONE]') {
            yield { content: '', isComplete: true }
            continue
          }

          try {
            const json = JSON.parse(data)
            
            // 处理错误响应
            if (json.error) {
              console.error('[AIService] OpenAI 错误:', json.error)
              throw new Error(json.error.message || 'API 返回错误')
            }

            // 提取内容和完成标志
            const content = json.choices?.[0]?.delta?.content || ''
            const finishReason = json.choices?.[0]?.finish_reason
            
            if (content) {
              yield { content, isComplete: false }
            }

            // finish_reason 为 stop 表示完成
            if (finishReason === 'stop') {
              yield { content: '', isComplete: true }
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              console.warn('[AIService] 解析警告:', e.message)
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
   * 解析 Claude 格式的流式响应
   * 格式: event: content_block_delta\ndata: {"delta":{"text":"xxx"}}
   */
  private async *parseClaudeStream(body: ReadableStream<Uint8Array>): AsyncGenerator<AIStreamChunk> {
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
          
          if (!data || data === '[DONE]') continue

          try {
            const json = JSON.parse(data)
            
            // 处理错误
            if (json.type === 'error') {
              console.error('[AIService] Claude 错误:', json.error)
              throw new Error(json.error?.message || 'Claude API 错误')
            }

            // content_block_delta 事件包含实际内容
            if (json.type === 'content_block_delta') {
              const content = json.delta?.text || ''
              if (content) {
                yield { content, isComplete: false }
              }
            }

            // message_stop 表示完成
            if (json.type === 'message_stop') {
              yield { content: '', isComplete: true }
            }

            // message_delta 可能包含 stop_reason
            if (json.type === 'message_delta' && json.delta?.stop_reason) {
              yield { content: '', isComplete: true }
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              console.warn('[AIService] 解析警告:', e.message)
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
 * @param userMessage 用户消息
 * @returns 对话名称
 */
export function generateConversationName(userMessage: string): string {
  const cleaned = userMessage.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= 20) return cleaned
  return cleaned.slice(0, 20) + '...'
}

/**
 * 生成新的对话 ID
 * @returns UUID 格式的对话ID
 */
export function generateConversationId(): string {
  return crypto.randomUUID()
}
