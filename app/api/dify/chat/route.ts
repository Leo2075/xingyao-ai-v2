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

    const transformStream = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(chunk)

        buffer += decoder.decode(chunk, { stream: true })
        buffer = processBuffer(buffer, (payload) => {
          if (payload.conversation_id && !resolvedConversationId) {
            resolvedConversationId = payload.conversation_id
          }
          if (payload.answer) {
            aggregatedAnswer += payload.answer
          }
        })
      },
      async flush(controller) {
        buffer += decoder.decode()
        buffer = processBuffer(buffer, (payload) => {
          if (payload.conversation_id && !resolvedConversationId) {
            resolvedConversationId = payload.conversation_id
          }
          if (payload.answer) {
            aggregatedAnswer += payload.answer
          }
        })

        if (resolvedConversationId && aggregatedAnswer) {
          await persistMessages({
            conversationId: resolvedConversationId,
            userIdentifier,
            assistantId,
            userMessage: message,
            assistantAnswer: aggregatedAnswer,
          })
        }
      },
    })

    const streamedBody = difyResponse.body.pipeThrough(transformStream)

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
}: {
  conversationId: string
  userIdentifier: string
  assistantId: string
  userMessage: string
  assistantAnswer: string
}) {
  try {
    const now = new Date()
    const userMessageTime = new Date(now.getTime() - 10)

    const { error: convError } = await supabase
      .from('chat_conversations')
      .upsert(
        {
          id: conversationId,
          user_id: userIdentifier,
          assistant_id: assistantId,
          updated_at: now.toISOString(),
        },
        { onConflict: 'id' }
      )

    if (convError) {
      console.error('保存会话失败:', convError)
      return
    }

    const { error: msgError } = await supabase.from('chat_messages').insert([
      {
        conversation_id: conversationId,
        role: 'user',
        content: userMessage,
        user_id: userIdentifier,
        created_at: userMessageTime.toISOString(),
      },
      {
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantAnswer,
        user_id: userIdentifier,
        created_at: now.toISOString(),
      },
    ])

    if (msgError) {
      console.error('保存消息失败:', msgError)
    }
  } catch (err) {
    console.error('保存对话历史异常:', err)
  }
}
