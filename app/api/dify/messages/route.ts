import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { assistantId, conversationId, userId, cursorRounds = 0, rounds = 3 } = await request.json()

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

    // 调用Dify API获取消息历史
    const keyRef = (assistant as any).key_ref as string | undefined
    const bearerKey = (keyRef && process.env[keyRef]) || assistant.dify_api_key
    const difyUrl = `${assistant.dify_base_url}/messages`
    const difyResponse = await fetch(
      `${difyUrl}?conversation_id=${conversationId}&user=${userId ? `user-${userId}` : 'user-anon'}&limit=${Math.max(rounds * 6, 30)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${bearerKey}`,
        },
      }
    )

    if (!difyResponse.ok) {
      const errorText = await difyResponse.text()
      console.error('Dify API错误:', errorText)
      return NextResponse.json(
        { messages: [] },
        { status: 200 }
      )
    }

    const data = await difyResponse.json()
    
    const flattened = (data.data || [])
      .reverse()
      .flatMap((item: any) => {
        const result = []
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

    const totalRounds = Math.ceil(flattened.length / 2)
    const safeRounds = Math.max(1, Math.min(rounds, totalRounds))
    const usedCursor = Math.max(Number(cursorRounds) || 0, 0)
    const endRound = Math.max(totalRounds - usedCursor, 0)
    const startRound = Math.max(endRound - safeRounds, 0)
    const startIndex = startRound * 2
    const endIndex = endRound * 2
    const slice = flattened.slice(startIndex, endIndex)
    const nextCursorRounds = startRound > 0 ? usedCursor + safeRounds : null

    return NextResponse.json({ messages: slice, nextCursorRounds })
  } catch (error) {
    console.error('获取消息历史错误:', error)
    return NextResponse.json(
      { messages: [], nextCursorRounds: null },
      { status: 200 }
    )
  }
}
