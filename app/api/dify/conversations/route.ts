import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const DEFAULT_LIMIT = 100

export async function POST(request: NextRequest) {
  try {
    const { assistantId, userId, limit = DEFAULT_LIMIT } = await request.json()

    if (!assistantId) {
      return NextResponse.json(
        { error: '缺少助手ID' },
        { status: 400 }
      )
    }

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

    // 查询本地数据
    const { data: localConversations, error: convError } = await supabase
      .from('chat_conversations')
      .select('id, title, created_at, updated_at')
      .eq('assistant_id', assistantId)
      .eq('user_id', userIdentifier)
      .order('updated_at', { ascending: false })
      .limit(Math.max(Number(limit) || DEFAULT_LIMIT, 1))

    if (convError) {
      console.error('查询本地会话失败:', convError)
    }

    // 优化：合并本地和Dify数据
    if (localConversations && localConversations.length > 0) {
      // 中转站模式：只返回本地数据，不调用 Dify
      if (assistant.api_mode === 'relay') {
        return NextResponse.json({
          conversations: localConversations.map(item => ({
            id: item.id,
            name: item.title || '新的对话',
            created_at: item.created_at,
            updated_at: item.updated_at,
          }))
        })
      }

      // Dify 模式：本地有数据，但可能不完整，尝试从Dify补充
      const difyData = await fetchFromDify({
        assistant,
        userIdentifier,
        limit,
      }).catch(err => {
        console.warn('获取Dify数据失败，仅返回本地数据:', err)
        return { conversations: [] }
      })

      // 合并数据（本地优先，Dify补充）
      const localMap = new Map(localConversations.map(c => [c.id, c]))
      const difyConversations = (difyData.conversations || []).filter(
        (c: any) => !localMap.has(c.id)
      )

      // 合并并排序
      const merged = [
        ...localConversations.map(item => ({
          id: item.id,
          name: item.title || '新的对话',
          created_at: item.created_at,
          updated_at: item.updated_at,
        })),
        ...difyConversations,
      ].sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at).getTime()
        const bTime = new Date(b.updated_at || b.created_at).getTime()
        return bTime - aTime
      }).slice(0, limit)

      return NextResponse.json({ conversations: merged })
    }

    // 中转站模式：本地无数据，返回空列表
    if (assistant.api_mode === 'relay') {
      return NextResponse.json({ conversations: [] })
    }

    // Dify 模式：本地无数据，从Dify获取并同步
    const fallback = await fetchFromDify({
      assistant,
      userIdentifier,
      limit,
    })

    return NextResponse.json(fallback)
  } catch (error) {
    console.error('获取对话列表错误:', error)
    return NextResponse.json(
      { conversations: [], error: '获取对话列表失败' },
      { status: 200 }
    )
  }
}

async function fetchFromDify({
  assistant,
  userIdentifier,
  limit,
}: {
  assistant: Record<string, any>
  userIdentifier: string
  limit: number
}) {
  const keyRef = (assistant as any).key_ref as string | undefined
  const bearerKey = (keyRef && process.env[keyRef]) || assistant.dify_api_key
  const difyUrl = `${assistant.dify_base_url}/conversations`

  const difyResponse = await fetch(
    `${difyUrl}?user=${userIdentifier}&limit=${Math.max(Number(limit) || DEFAULT_LIMIT, 1)}`,
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
    return { conversations: [] }
  }

  const data = await difyResponse.json()

  // 同步到Supabase（后台操作，不阻塞响应）
  syncConversationsFromDify({
    items: data.data || [],
    assistantId: assistant.id,
    userIdentifier,
  }).catch(err => {
    console.error('后台同步失败:', err)
  })

  return { conversations: data.data || [] }
}

async function syncConversationsFromDify({
  items,
  assistantId,
  userIdentifier,
}: {
  items: any[]
  assistantId: string
  userIdentifier: string
}) {
  if (!items.length) return

  const rows = items.map((item) => {
    const createdAt = normalizeDate(item.created_at)
    const updatedAt = normalizeDate(item.updated_at) || createdAt || new Date().toISOString()
    return {
      id: item.id,
      title: item.name || null, // 保持null，前端会处理
      user_id: userIdentifier,
      assistant_id: assistantId,
      created_at: createdAt || new Date().toISOString(),
      updated_at: updatedAt,
    }
  })

  const { error } = await supabase
    .from('chat_conversations')
    .upsert(rows, { onConflict: 'id' })

  if (error) {
    console.error('同步Dify会话数据失败:', error)
    throw error // 抛出错误以便上层处理
  }
}

function normalizeDate(value: string | number | null | undefined) {
  if (value === null || value === undefined) return undefined

  const date =
    typeof value === 'number'
      ? new Date(value < 1e12 ? value * 1000 : value)
      : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  return date.toISOString()
}
