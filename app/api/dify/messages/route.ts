// ============================================================
// 星耀AI - 对话消息 API
// 从本地数据库获取对话的历史消息
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * 获取对话的历史消息
 * POST /api/dify/messages
 * 
 * 支持分页加载：
 * - rounds: 每次加载的轮数（每轮 = 1条用户消息 + 1条助手回复）
 * - cursorRounds: 已加载的轮数（用于分页）
 */
export async function POST(request: NextRequest) {
  try {
    const { conversationId, userId, cursorRounds = 0, rounds = 3 } =
      await request.json()

    // 参数校验：只需要 conversationId（已通过外键关联助手）
    if (!conversationId) {
      return NextResponse.json(
        { error: '缺少 conversationId' },
        { status: 400 }
      )
    }

    const userIdentifier = userId ? `user-${userId}` : 'user-anon'

    // 计算分页参数
    const desiredRounds = Math.max(Number(rounds) || 1, 1)
    const usedCursor = Math.max(Number(cursorRounds) || 0, 0)
    const limit = desiredRounds * 2  // 每轮2条消息（user + assistant）
    const offset = usedCursor * 2

    // 从数据库查询消息
    const { data: messages, error: msgError } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', userIdentifier)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (msgError) {
      console.error('[Messages] 查询消息失败:', msgError)
      return NextResponse.json(
        { messages: [], nextCursorRounds: null },
        { status: 200 }
      )
    }

    // 判断是否还有更多消息
    const hasMore = (messages || []).length >= limit
    const nextCursorRounds = hasMore ? usedCursor + desiredRounds : null

    return NextResponse.json({
      messages: messages || [],
      nextCursorRounds,
    })
  } catch (error) {
    console.error('[Messages] 获取消息历史错误:', error)
    return NextResponse.json(
      { messages: [], nextCursorRounds: null },
      { status: 200 }
    )
  }
}
