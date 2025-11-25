// ============================================================
// 星耀AI - 对话列表 API
// 从本地数据库获取用户的对话列表
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 默认返回的对话数量
const DEFAULT_LIMIT = 100

export async function POST(request: NextRequest) {
  try {
    const { assistantId, userId, limit = DEFAULT_LIMIT } = await request.json()

    // 参数校验
    if (!assistantId) {
      return NextResponse.json(
        { error: '缺少助手ID' },
        { status: 400 }
      )
    }

    const userIdentifier = userId ? `user-${userId}` : 'user-anon'

    // 从本地数据库查询对话列表（移除不必要的助手验证查询）
    // 依赖外键约束保证数据一致性
    const { data: conversations, error: convError } = await supabase
      .from('chat_conversations')
      .select('id, title, created_at, updated_at')
      .eq('assistant_id', assistantId)
      .eq('user_id', userIdentifier)
      .order('updated_at', { ascending: false })
      .limit(Math.max(Number(limit) || DEFAULT_LIMIT, 1))

    if (convError) {
      console.error('[Conversations] 查询对话列表失败:', convError)
      return NextResponse.json(
        { conversations: [], error: '查询失败' },
        { status: 200 }
      )
    }

    // 格式化返回数据
    const formattedConversations = (conversations || []).map(item => ({
      id: item.id,
      name: item.title || '新的对话',
      created_at: item.created_at,
      updated_at: item.updated_at,
    }))

    return NextResponse.json({ conversations: formattedConversations })
  } catch (error) {
    console.error('[Conversations] 获取对话列表错误:', error)
    return NextResponse.json(
      { conversations: [], error: '获取对话列表失败' },
      { status: 200 }
    )
  }
}
