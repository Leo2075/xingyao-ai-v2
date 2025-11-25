// ============================================================
// 星耀AI - 单个对话操作 API
// 支持重命名和删除对话
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * 重命名对话
 * PATCH /api/dify/conversations/[id]
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { assistantId, userId, name } = await request.json()
    const conversationId = params.id

    // 参数校验
    if (!assistantId || !conversationId || !name || !name.trim()) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const userIdentifier = userId ? `user-${userId}` : 'user-anon'
    const trimmedName = name.trim()
    const nowIso = new Date().toISOString()

    // 更新对话标题
    const { data: updated, error: updateError } = await supabase
      .from('chat_conversations')
      .update({ title: trimmedName, updated_at: nowIso })
      .eq('id', conversationId)
      .eq('user_id', userIdentifier)
      .select('id')

    if (updateError) {
      console.error('[Conversation] 更新对话标题失败:', updateError)
      return NextResponse.json({ error: '更新失败，请重试' }, { status: 500 })
    }

    // 如果没有找到记录，可能是新对话，尝试插入
    if (!updated || updated.length === 0) {
      const { error: insertError } = await supabase.from('chat_conversations').insert({
        id: conversationId,
        user_id: userIdentifier,
        assistant_id: assistantId,
        title: trimmedName,
        created_at: nowIso,
        updated_at: nowIso,
      })

      if (insertError) {
        console.error('[Conversation] 插入对话标题失败:', insertError)
        return NextResponse.json({ error: '更新失败，请重试' }, { status: 500 })
      }
    }

    return NextResponse.json({
      conversation: {
        id: conversationId,
        name: trimmedName,
      }
    })
  } catch (e) {
    console.error('[Conversation] 更新对话名称错误:', e)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * 删除对话
 * DELETE /api/dify/conversations/[id]
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { assistantId, userId } = await request.json()
    const conversationId = params.id

    // 参数校验
    if (!assistantId || !conversationId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const userIdentifier = userId ? `user-${userId}` : 'user-anon'

    // 1. 先删除该对话的所有消息
    const { error: deleteMessagesError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userIdentifier)

    if (deleteMessagesError) {
      console.error('[Conversation] 删除消息失败:', deleteMessagesError)
      // 继续尝试删除会话
    }

    // 2. 删除对话记录
    const { error: deleteConvError } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userIdentifier)

    if (deleteConvError) {
      console.error('[Conversation] 删除对话失败:', deleteConvError)
      return NextResponse.json({ error: '删除失败，请重试' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[Conversation] 删除对话错误:', e)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
