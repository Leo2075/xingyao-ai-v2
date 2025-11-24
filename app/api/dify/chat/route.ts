import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { assistantId, message, conversationId, userId, inputs } = await request.json()

    if (!assistantId || !message) {
      return new Response(
        JSON.stringify({ error: '缺少必要参数' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 获取助手配置
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

    // 解析密钥：优先从环境变量引用名读取，其次回退数据库存储
    const keyRef = (assistant as any).key_ref as string | undefined
    const bearerKey = (keyRef && process.env[keyRef]) || assistant.dify_api_key
    const difyUrl = `${assistant.dify_base_url}/chat-messages`
    const userIdentifier = userId ? `user-${userId}` : 'user-anon'
    
    // 记录用户消息发送时间（用于后续去重和排序）
    const userMessageTimestamp = new Date()
    
    const difyResponse = await fetch(difyUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bearerKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: message,
        user: userIdentifier,
        response_mode: 'streaming',
        conversation_id: conversationId || undefined,
        inputs: inputs || {},
      }),
    })

    if (!difyResponse.ok || !difyResponse.body) {
      const errorText = await difyResponse.text().catch(() => '')
      console.error('Dify API错误:', errorText)
      return new Response(
        JSON.stringify({ error: 'AI服务暂时不可用' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let aggregatedAnswer = ''
    let resolvedConversationId = conversationId || ''
    let conversationName = '' // 新增：收集对话名称
    let isAborted = false
    let savePromise: Promise<void> | null = null

    // 保存数据的函数（可复用）
    const saveData = async () => {
      if (savePromise) return savePromise // 防止重复保存
      
      savePromise = (async () => {
        if (resolvedConversationId && aggregatedAnswer && !isAborted) {
          await persistMessages({
            conversationId: resolvedConversationId,
            userIdentifier,
            assistantId,
            userMessage: message,
            assistantAnswer: aggregatedAnswer,
            userMessageTimestamp,
            conversationName: conversationName || undefined, // 传递对话名称
          })
        }
      })()
      
      return savePromise
    }

    const transformStream = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        if (isAborted) {
          controller.terminate()
          return
        }
        
        controller.enqueue(chunk)

        buffer += decoder.decode(chunk, { stream: true })
        buffer = processBuffer(buffer, (payload) => {
          if (payload.conversation_id && !resolvedConversationId) {
            resolvedConversationId = payload.conversation_id
          }
          if (payload.answer) {
            aggregatedAnswer += payload.answer
          }
          // 修复：收集对话名称（从 message_end 事件或 conversation 对象）
          if (payload.conversation_name) {
            conversationName = payload.conversation_name
          } else if (payload.conversation?.name) {
            conversationName = payload.conversation.name
          } else if (payload.name) {
            conversationName = payload.name
          }
        })
      },
      async flush(controller) {
        // 修复：正确处理剩余的 buffer（buffer已经是字符串，直接处理）
        if (buffer) {
          buffer = processBuffer(buffer, (payload) => {
            if (payload.conversation_id && !resolvedConversationId) {
              resolvedConversationId = payload.conversation_id
            }
            if (payload.answer) {
              aggregatedAnswer += payload.answer
            }
            // 修复：收集对话名称
            if (payload.conversation_name) {
              conversationName = payload.conversation_name
            } else if (payload.conversation?.name) {
              conversationName = payload.conversation.name
            } else if (payload.name) {
              conversationName = payload.name
            }
          })
        }

        // 保存数据（即使流被中断）
        await saveData()
      },
    })

    const streamedBody = difyResponse.body.pipeThrough(transformStream)

    // 监听请求中断
    request.signal?.addEventListener('abort', async () => {
      isAborted = true
      // 即使中断也尝试保存已收集的数据
      await saveData()
    })

    return new Response(streamedBody, {
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

type StreamPayload = {
  conversation_id?: string
  answer?: string
  conversation_name?: string
  conversation?: {
    name?: string
  }
  name?: string
}

function processBuffer(
  buffer: string,
  consumer: (payload: StreamPayload) => void
) {
  const lines = buffer.split('\n')
  const unfinished = lines.pop() ?? ''

  for (const raw of lines) {
    const line = raw.trim()
    if (!line.startsWith('data:')) continue

    const jsonStr = line.slice(5).trim()
    if (!jsonStr || jsonStr === '[DONE]') continue

    try {
      consumer(JSON.parse(jsonStr))
    } catch (err) {
      console.warn('解析SSE数据失败:', err)
    }
  }

  return unfinished
}

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
    // 优化：使用实际时间戳，用户消息时间稍早（确保顺序）
    const userMessageTime = new Date(userMessageTimestamp.getTime() - 100) // 100ms 前

    // 1. 确保会话存在（修复：保存对话名称）
    const { error: convError } = await supabase
      .from('chat_conversations')
      .upsert(
        {
          id: conversationId,
          user_id: userIdentifier,
          assistant_id: assistantId,
          title: conversationName || null, // 修复：保存对话名称
          updated_at: now.toISOString(),
        },
        { onConflict: 'id' }
      )

    if (convError) {
      console.error('保存会话失败:', convError)
      throw convError // 抛出错误以便上层处理
    }

    // 2. 检查消息是否已存在（去重）
    const userMessageTimeStr = userMessageTime.toISOString()
    const assistantMessageTimeStr = now.toISOString()
    
    // 检查用户消息是否已存在（基于内容、时间和角色）
    const { data: existingUserMsg } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('role', 'user')
      .eq('content', userMessage)
      .gte('created_at', new Date(userMessageTime.getTime() - 5000).toISOString()) // 5秒内的消息
      .lte('created_at', new Date(userMessageTime.getTime() + 5000).toISOString())
      .limit(1)
      .maybeSingle()

    if (existingUserMsg) {
      console.log('用户消息已存在，跳过插入:', existingUserMsg.id)
      return // 消息已存在，跳过
    }

    // 3. 插入消息（使用事务性插入）
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
      // 如果是唯一约束冲突，可能是并发插入，记录但不抛出
      if (msgError.code === '23505') {
        console.warn('消息可能已存在（并发插入）:', msgError.message)
        return
      }
      console.error('保存消息失败:', msgError)
      throw msgError
    }
  } catch (err) {
    console.error('保存对话历史异常:', err)
    // 不抛出错误，避免影响主流程
  }
}
