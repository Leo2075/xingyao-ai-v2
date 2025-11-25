// ============================================================
// 星耀AI - 聊天 API
// 支持 Dify 和 中转站 两种调用模式
// ============================================================

import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { AIService, generateConversationName, generateConversationId } from '@/lib/ai-service'
import { AssistantConfig } from '@/lib/ai-types'

export async function POST(request: NextRequest) {
  try {
    const { assistantId, message, conversationId, userId, inputs } = await request.json()

    if (!assistantId || !message) {
      return new Response(
        JSON.stringify({ error: '缺少必要参数' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 1. 获取助手配置
    const { data: assistant, error } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .maybeSingle()

    if (error || !assistant) {
      return new Response(
        JSON.stringify({ error: '助手不存在' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 2. 创建 AI 服务实例
    const aiService = new AIService(assistant as AssistantConfig)
    const userIdentifier = userId ? `user-${userId}` : 'user-anon'
    const userMessageTimestamp = new Date()

    // 3. 确定对话 ID（中转站模式需要预先生成）
    let resolvedConversationId = conversationId || ''
    const isNewConversation = !conversationId || conversationId.startsWith('temp-')
    
    // 中转站模式下，如果是新对话，预先生成 UUID
    if (assistant.api_mode === 'relay' && isNewConversation) {
      resolvedConversationId = generateConversationId()
    }

    // 4. 流式返回
    const encoder = new TextEncoder()
    let aggregatedAnswer = ''
    let conversationName = ''
    let isAborted = false

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of aiService.sendMessage(
            message,
            assistant.api_mode === 'dify' ? conversationId : resolvedConversationId,
            userId,
            inputs
          )) {
            if (isAborted) {
              controller.close()
              return
            }

            if (chunk.content) {
              aggregatedAnswer += chunk.content
              
              // 转换为前端期望的格式（保持兼容）
              const data = JSON.stringify({
                event: 'message',
                answer: chunk.content,
              })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }

            if (chunk.isComplete) {
              // Dify 模式：从返回值获取 conversation_id
              if (chunk.metadata?.conversationId) {
                resolvedConversationId = chunk.metadata.conversationId
              }
              if (chunk.metadata?.conversationName) {
                conversationName = chunk.metadata.conversationName
              }

              // 中转站模式：生成对话名称
              if (assistant.api_mode === 'relay' && !conversationName) {
                conversationName = generateConversationName(message)
              }

              // 保存到数据库
              await persistMessages({
                conversationId: resolvedConversationId,
                userIdentifier,
                assistantId,
                userMessage: message,
                assistantAnswer: aggregatedAnswer,
                userMessageTimestamp,
                conversationName: conversationName || undefined,
              })

              // 发送结束事件
              const endData = JSON.stringify({
                event: 'message_end',
                conversation_id: resolvedConversationId,
                conversation_name: conversationName || '新的对话',
              })
              controller.enqueue(encoder.encode(`data: ${endData}\n\n`))
              controller.close()
            }
          }
        } catch (error: any) {
          console.error('Stream error:', error)
          
          // 发送错误事件
          const errorData = JSON.stringify({
            event: 'error',
            message: error.message || 'AI服务暂时不可用',
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.close()
        }
      },
    })

    // 监听请求中断
    request.signal?.addEventListener('abort', () => {
      isAborted = true
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('聊天错误:', error)
    return new Response(
      JSON.stringify({ error: '服务器错误' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// ==================== 保存消息到数据库 ====================
async function persistMessages({
  conversationId,
  userIdentifier,
  assistantId,
  userMessage,
  assistantAnswer,
  userMessageTimestamp,
  conversationName,
}: {
  conversationId: string
  userIdentifier: string
  assistantId: string
  userMessage: string
  assistantAnswer: string
  userMessageTimestamp: Date
  conversationName?: string
}) {
  try {
    const now = new Date()
    // 用户消息时间稍早（确保顺序）
    const userMessageTime = new Date(userMessageTimestamp.getTime() - 100)

    // 1. 确保会话存在
    const { error: convError } = await supabase
      .from('chat_conversations')
      .upsert(
        {
          id: conversationId,
          user_id: userIdentifier,
          assistant_id: assistantId,
          title: conversationName || null,
          updated_at: now.toISOString(),
        },
        { onConflict: 'id' }
      )

    if (convError) {
      console.error('保存会话失败:', convError)
      throw convError
    }

    // 2. 检查消息是否已存在（去重）
    const userMessageTimeStr = userMessageTime.toISOString()
    const assistantMessageTimeStr = now.toISOString()
    
    const { data: existingUserMsg } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('role', 'user')
      .eq('content', userMessage)
      .gte('created_at', new Date(userMessageTime.getTime() - 5000).toISOString())
      .lte('created_at', new Date(userMessageTime.getTime() + 5000).toISOString())
      .limit(1)
      .maybeSingle()

    if (existingUserMsg) {
      console.log('用户消息已存在，跳过插入:', existingUserMsg.id)
      return
    }

    // 3. 插入消息
    const { error: msgError } = await supabase.from('chat_messages').insert([
      {
        conversation_id: conversationId,
        role: 'user',
        content: userMessage,
        user_id: userIdentifier,
        created_at: userMessageTimeStr,
      },
      {
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantAnswer,
        user_id: userIdentifier,
        created_at: assistantMessageTimeStr,
      },
    ])

    if (msgError) {
      if (msgError.code === '23505') {
        console.warn('消息可能已存在（并发插入）:', msgError.message)
        return
      }
      console.error('保存消息失败:', msgError)
      throw msgError
    }
  } catch (err) {
    console.error('保存对话历史异常:', err)
  }
}
