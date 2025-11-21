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

    const { data: localConversations, error: convError } = await supabase
      .from('chat_conversations')
      .select('id, title, created_at, updated_at')
      .eq('assistant_id', assistantId)
      .eq('user_id', userIdentifier)
      .order('updated_at', { ascending: false })
      .limit(Math.max(Number(limit) || DEFAULT_LIMIT, 1))

    if (!convError && localConversations && localConversations.length > 0) {
      const normalized = localConversations.map((item) => ({
        id: item.id,
        name: item.title || '未命名对话',
        created_at: item.created_at,
        updated_at: item.updated_at,
      }))

      return NextResponse.json({ conversations: normalized })
    }

    const fallback = await fetchFromDify({
      assistant,
      userIdentifier,
      limit,
    })

    return NextResponse.json(fallback)
  } catch (error) {
    console.error('获取对话列表错误:', error)
    return NextResponse.json(
      { conversations: [] },
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
  return { conversations: data.data || [] }
}
