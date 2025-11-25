// ============================================================
// 星耀AI - 聊天 API
// 通过中转站调用大模型，支持 OpenAI/Claude 格式
// ============================================================

import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { AIService, generateConversationName, generateConversationId } from '@/lib/ai-service'
import { AssistantConfig } from '@/lib/ai-types'

export async function POST(request: NextRequest) {
  try {
    const { assistantId, message, conversationId, userId } = await request.json()

    // 参数校验
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

    // 3. 确定对话 ID（新对话需要预先生成 UUID）
    let resolvedConversationId = conversationId || ''
    const isNewConversation = !conversationId || conversationId.startsWith('temp-')
    
    if (isNewConversation) {
      resolvedConversationId = generateConversationId()
    }

    // 4. 创建流式响应
    const encoder = new TextEncoder()
    let aggregatedAnswer = ''
    let conversationName = ''
    let isAborted = false
    let isClosed = false  // 跟踪控制器状态，防止重复关闭

    const stream = new ReadableStream({
      async start(controller) {
        // 安全的写入方法（防止写入已关闭的控制器）
        const safeEnqueue = (data: Uint8Array) => {
          if (!isClosed && !isAborted) {
            try {
              controller.enqueue(data)
            } catch (e) {
              console.warn('[Chat] 写入失败（控制器可能已关闭）:', e)
            }
          }
        }

        // 安全的关闭方法（防止重复关闭）
        const safeClose = () => {
          if (!isClosed) {
            isClosed = true
            try {
              controller.close()
            } catch (e) {
              console.warn('[Chat] 关闭失败（控制器可能已关闭）:', e)
            }
          }
        }

        try {
          // 调用 AI 服务获取流式响应
          for await (const chunk of aiService.sendMessage(
            message,
            resolvedConversationId,
            userId
          )) {
            // 检查是否已中断
            if (isAborted || isClosed) {
              safeClose()
              return
            }

            // 处理内容块
            if (chunk.content) {
              aggregatedAnswer += chunk.content
              
              // 转换为 SSE 格式发送给前端
              const data = JSON.stringify({
                event: 'message',
                answer: chunk.content,
              })
              safeEnqueue(encoder.encode(`data: ${data}\n\n`))
            }

            // 处理完成信号
            if (chunk.isComplete) {
              // 生成对话名称（取用户消息前20字）
              if (!conversationName) {
                conversationName = generateConversationName(message)
              }

              // 保存到数据库（异步，不阻塞响应）
              persistMessages({
                conversationId: resolvedConversationId,
                userIdentifier,
                assistantId,
                userMessage: message,
                assistantAnswer: aggregatedAnswer,
                userMessageTimestamp,
                conversationName,
              }).catch(err => console.error('[Chat] 保存消息失败:', err))

              // 发送结束事件
              const endData = JSON.stringify({
                event: 'message_end',
                conversation_id: resolvedConversationId,
                conversation_name: conversationName,
              })
              safeEnqueue(encoder.encode(`data: ${endData}\n\n`))
              safeClose()
              return
            }
          }
          
          // 循环正常结束，关闭流
          safeClose()
        } catch (error: any) {
          console.error('[Chat] 流处理错误:', error)
          
          // 发送错误事件给前端
          const errorData = JSON.stringify({
            event: 'error',
            message: error.message || 'AI服务暂时不可用',
          })
          safeEnqueue(encoder.encode(`data: ${errorData}\n\n`))
          safeClose()
        }
      },
    })

    // 监听请求中断（用户关闭页面等）
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
    console.error('[Chat] 聊天错误:', error)
    return new Response(
      JSON.stringify({ error: '服务器错误' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// ==================== 保存消息到数据库 ====================
/**
 * 将对话消息持久化到 Supabase
 * 包括会话记录和消息记录
 */
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
    // 用户消息时间稍早，确保消息顺序正确
    const userMessageTime = new Date(userMessageTimestamp.getTime() - 100)

    // 1. 创建或更新会话记录
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
      console.error('[Chat] 保存会话失败:', convError)
      throw convError
    }

    // 2. 检查消息是否已存在（防止重复插入）
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
      console.log('[Chat] 用户消息已存在，跳过插入:', existingUserMsg.id)
      return
    }

    // 3. 插入用户消息和助手回复
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
      // 唯一约束冲突（并发插入）
      if (msgError.code === '23505') {
        console.warn('[Chat] 消息可能已存在（并发插入）:', msgError.message)
        return
      }
      console.error('[Chat] 保存消息失败:', msgError)
      throw msgError
    }
  } catch (err) {
    console.error('[Chat] 保存对话历史异常:', err)
  }
}
