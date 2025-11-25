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
    const limit = desiredRounds * 2 + 1  // 多取1条用于判断是否有更多消息
    const offset = usedCursor * 2

    // 优化：使用反向查询 + limit，避免 count 查询
    // 先按降序获取，然后在应用层反转
    const { data: rawMessages, error: msgError } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', userIdentifier)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (msgError) {
      console.error('[Messages] 查询消息失败:', msgError)
      return NextResponse.json(
        { messages: [], nextCursorRounds: null },
        { status: 200 }
      )
    }

    // 检查是否有更多消息（如果返回了 limit 条，说明可能还有更多）
    const hasMore = (rawMessages?.length || 0) > desiredRounds * 2
    
    // 只返回请求的消息数量（去掉多取的那一条）
    const messages = hasMore 
      ? (rawMessages?.slice(0, -1) || []).reverse() 
      : (rawMessages || []).reverse()
    
    const nextCursorRounds = hasMore ? usedCursor + desiredRounds : null

    return NextResponse.json({
      messages,
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
