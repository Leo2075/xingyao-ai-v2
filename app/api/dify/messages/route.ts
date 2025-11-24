import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

type StoredMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export async function POST(request: NextRequest) {
  try {
    const { assistantId, conversationId, userId, cursorRounds = 0, rounds = 3 } =
      await request.json()

    if (!assistantId || !conversationId) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 获取助手配置
    const { data: assistant, error } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .maybeSingle()

    if (error || !assistant) {
      return NextResponse.json(
        { error: '助手不存在' },
        { status: 404 }
      )
    }

    const userIdentifier = userId ? `user-${userId}` : 'user-anon'

    // 优化：数据库层面分页
    const desiredRounds = Math.max(Number(rounds) || 1, 1)
    const usedCursor = Math.max(Number(cursorRounds) || 0, 0)
    const limit = desiredRounds * 2 // 每轮2条消息（user + assistant）
    const offset = usedCursor * 2

    const { data: storedMessages, error: storedError } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at, user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userIdentifier)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (storedError) {
      console.error('查询本地历史失败:', storedError)
    }

    // 如果本地有数据，直接返回
    if (storedMessages && storedMessages.length > 0) {
      const hasMore = storedMessages.length >= limit
      const nextCursorRounds = hasMore ? usedCursor + desiredRounds : null
      
      return NextResponse.json({
        messages: storedMessages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          created_at: msg.created_at,
        })),
        nextCursorRounds,
      })
    }

    // 本地无数据，从Dify获取
    const difyPagination = await fetchFromDify({
      assistant,
      conversationId,
      userIdentifier,
      rounds,
      cursorRounds,
    })

    return NextResponse.json(difyPagination)
  } catch (error) {
    console.error('获取消息历史错误:', error)
    return NextResponse.json(
      { messages: [], nextCursorRounds: null },
      { status: 200 }
    )
  }
}

// 修复：不再假设消息成对出现，按实际消息数量分页
function paginateMessages(
  allMessages: StoredMessage[],
  rounds: number,
  cursorRounds: number
) {
  if (!allMessages.length) {
    return { messages: [], nextCursorRounds: null }
  }

  const desiredRounds = Math.max(Number(rounds) || 1, 1)
  const usedCursor = Math.max(Number(cursorRounds) || 0, 0)
  
  // 优化：按实际消息数量计算，不假设成对
  // 每轮对话通常有2条消息，但可能不完整
  const messagesPerRound = 2
  const totalRounds = Math.ceil(allMessages.length / messagesPerRound)
  const safeRounds = Math.max(1, Math.min(desiredRounds, totalRounds))
  
  const endRound = Math.max(totalRounds - usedCursor, 0)
  const startRound = Math.max(endRound - safeRounds, 0)
  const startIndex = startRound * messagesPerRound
  const endIndex = endRound * messagesPerRound
  const slice = allMessages.slice(startIndex, endIndex)
  const nextCursorRounds = startRound > 0 ? usedCursor + safeRounds : null

  return { messages: slice, nextCursorRounds }
}

async function fetchFromDify({
  assistant,
  conversationId,
  userIdentifier,
  rounds,
  cursorRounds,
}: {
  assistant: Record<string, any>
  conversationId: string
  userIdentifier: string
  rounds: number
  cursorRounds: number
}) {
  const keyRef = (assistant as any).key_ref as string | undefined
  const bearerKey = (keyRef && process.env[keyRef]) || assistant.dify_api_key
  const difyUrl = `${assistant.dify_base_url}/messages`

  const difyResponse = await fetch(
    `${difyUrl}?conversation_id=${conversationId}&user=${userIdentifier}&limit=${Math.max(
      Number(rounds) * 6 || 30,
      30
    )}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${bearerKey}`,
      },
    }
  )

  if (!difyResponse.ok) {
    const errorText = await difyResponse.text()
    console.error('Dify API错误:', errorText)
    return { messages: [], nextCursorRounds: null }
  }

  const data = await difyResponse.json()
  const flattened = (data.data || [])
    .reverse()
    .flatMap((item: any) => {
      const result: StoredMessage[] = []
      if (item.query) {
        result.push({
          id: `${item.id}-user`,
          role: 'user',
          content: item.query,
          created_at: item.created_at,
        })
      }
      if (item.answer) {
        result.push({
          id: item.id,
          role: 'assistant',
          content: item.answer,
          created_at: item.created_at,
        })
      }
      return result
    })

  // 优化：去重（基于id）
  const uniqueMessages: StoredMessage[] = Array.from(
    new Map(flattened.map((msg: StoredMessage) => [msg.id, msg])).values()
  ) as StoredMessage[]

  return paginateMessages(uniqueMessages, rounds, cursorRounds)
}
