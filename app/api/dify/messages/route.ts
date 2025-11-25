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
 * 分页策略（从最新消息开始加载）：
 * - rounds: 每次加载的轮数（每轮 = 1条用户消息 + 1条助手回复）
 * - cursorRounds: 已加载的轮数（用于分页，0 表示加载最新消息）
 * 
 * 工作方式：
 * - cursorRounds=0: 获取最新的 N 条消息
 * - cursorRounds>0: 获取更早的历史消息（向上翻页）
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

    // 先获取消息总数，用于计算从后往前的偏移量
    const { count: totalCount, error: countError } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .eq('user_id', userIdentifier)

    if (countError) {
      console.error('[Messages] 查询消息总数失败:', countError)
      return NextResponse.json(
        { messages: [], nextCursorRounds: null },
        { status: 200 }
      )
    }

    const total = totalCount || 0
    
    // 计算从后往前的起始位置
    // 例如：总共 50 条消息，limit=30，offset=0
    // 应该获取第 20-49 条（最新的 30 条）
    const startFromEnd = total - offset - limit
    const actualStart = Math.max(0, startFromEnd)
    const actualLimit = startFromEnd < 0 ? limit + startFromEnd : limit

    // 如果没有更多消息可加载
    if (actualLimit <= 0) {
      return NextResponse.json({
        messages: [],
        nextCursorRounds: null,
      })
    }

    // 从数据库查询消息（按时间升序，从计算好的位置开始）
    const { data: messages, error: msgError } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', userIdentifier)
      .order('created_at', { ascending: true })
      .range(actualStart, actualStart + actualLimit - 1)

    if (msgError) {
      console.error('[Messages] 查询消息失败:', msgError)
      return NextResponse.json(
        { messages: [], nextCursorRounds: null },
        { status: 200 }
      )
    }

    // 判断是否还有更早的消息
    const hasMore = actualStart > 0
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
