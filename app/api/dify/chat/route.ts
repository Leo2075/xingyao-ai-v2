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

    // 4. 生成对话名称
    const conversationName = generateConversationName(message)

    // 5. **立即保存用户消息到数据库**（不等待 AI 响应）
    await saveUserMessage({
      conversationId: resolvedConversationId,
      userIdentifier,
      assistantId,
      userMessage: message,
      userMessageTimestamp,
      conversationName,
      isNewConversation,
    })

    // 6. 创建流式响应
    const encoder = new TextEncoder()
    let aggregatedAnswer = ''
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
            // 检查是否已中断 - 即使中断也继续处理，确保数据被保存
            if (isClosed) {
              // 流已关闭，但继续累积内容用于保存
              if (chunk.content) {
                aggregatedAnswer += chunk.content
              }
              if (chunk.isComplete) {
                // 保存助手回复到数据库
                await saveAssistantReply({
                  conversationId: resolvedConversationId,
                  userIdentifier,
                  assistantAnswer: aggregatedAnswer,
                })
              }
              continue
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
              // 保存助手回复到数据库
              saveAssistantReply({
                conversationId: resolvedConversationId,
                userIdentifier,
                assistantAnswer: aggregatedAnswer,
              }).catch(err => console.error('[Chat] 保存助手回复失败:', err))

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
          
          // 即使出错，也保存已有的助手回复
          if (aggregatedAnswer) {
            saveAssistantReply({
              conversationId: resolvedConversationId,
              userIdentifier,
              assistantAnswer: aggregatedAnswer,
            }).catch(err => console.error('[Chat] 保存部分回复失败:', err))
          }
          
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
      // 注意：即使中断，流处理会继续完成以保存数据
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

// ==================== 保存用户消息到数据库 ====================
/**
 * 立即保存用户消息（在 AI 响应前）
 * 确保用户消息不会因为中断而丢失
 */
async function saveUserMessage({
  conversationId,
  userIdentifier,
  assistantId,
  userMessage,
  userMessageTimestamp,
  conversationName,
  isNewConversation,
}: {
  conversationId: string
  userIdentifier: string
  assistantId: string
  userMessage: string
  userMessageTimestamp: Date
  conversationName: string
  isNewConversation: boolean
}) {
  try {
    const now = new Date()

    if (isNewConversation) {
      // 新对话，创建会话记录
      const { error: insertError } = await supabase
        .from('chat_conversations')
        .insert({
          id: conversationId,
          user_id: userIdentifier,
          assistant_id: assistantId,
          title: conversationName,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        })

      if (insertError) {
        console.error('[Chat] 创建会话失败:', insertError)
        throw insertError
      }
    } else {
      // 已有对话，更新时间
      const { error: updateError } = await supabase
        .from('chat_conversations')
        .update({ updated_at: now.toISOString() })
        .eq('id', conversationId)

      if (updateError) {
        console.error('[Chat] 更新会话时间失败:', updateError)
        throw updateError
      }
    }

    // 插入用户消息
    const { error: msgError } = await supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: userMessage,
      user_id: userIdentifier,
      created_at: userMessageTimestamp.toISOString(),
    })

    if (msgError) {
      // 唯一约束冲突（并发插入）可忽略
      if (msgError.code === '23505') {
        console.warn('[Chat] 用户消息可能已存在:', msgError.message)
        return
      }
      console.error('[Chat] 保存用户消息失败:', msgError)
      throw msgError
    }

    console.log('[Chat] 用户消息已保存:', conversationId)
  } catch (err) {
    console.error('[Chat] 保存用户消息异常:', err)
    throw err
  }
}

// ==================== 保存助手回复到数据库 ====================
/**
 * 保存助手回复（在 AI 响应完成后）
 */
async function saveAssistantReply({
  conversationId,
  userIdentifier,
  assistantAnswer,
}: {
  conversationId: string
  userIdentifier: string
  assistantAnswer: string
}) {
  try {
    if (!assistantAnswer) {
      console.warn('[Chat] 助手回复为空，跳过保存')
      return
    }

    const now = new Date()

    // 更新会话时间
    await supabase
      .from('chat_conversations')
      .update({ updated_at: now.toISOString() })
      .eq('id', conversationId)

    // 插入助手回复
    const { error: msgError } = await supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: assistantAnswer,
      user_id: userIdentifier,
      created_at: now.toISOString(),
    })

    if (msgError) {
      // 唯一约束冲突可忽略
      if (msgError.code === '23505') {
        console.warn('[Chat] 助手回复可能已存在:', msgError.message)
        return
      }
      console.error('[Chat] 保存助手回复失败:', msgError)
      throw msgError
    }

    console.log('[Chat] 助手回复已保存:', conversationId)
  } catch (err) {
    console.error('[Chat] 保存助手回复异常:', err)
  }
}
