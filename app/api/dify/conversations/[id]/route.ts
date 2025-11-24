import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { assistantId, userId, name } = await request.json()
    const conversationId = params.id
    if (!assistantId || !conversationId || !name || !name.trim()) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const { data: assistant, error } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .maybeSingle()

    if (error || !assistant) {
      return NextResponse.json({ error: '助手不存在' }, { status: 404 })
    }

    const keyRef = (assistant as any).key_ref as string | undefined
    const bearerKey = (keyRef && process.env[keyRef]) || assistant.dify_api_key
    const userValue = userId ? `user-${userId}` : 'user-anon'
    const trimmedName = name.trim()

    // 优化：先更新Supabase，如果失败则不调用Dify
    const supabaseUpdateResult = await syncConversationTitle({
      conversationId,
      assistantId,
      userIdentifier: userValue,
      title: trimmedName,
    })

    if (!supabaseUpdateResult.success) {
      console.error('Supabase更新失败，不调用Dify')
      return NextResponse.json(
        { error: '更新失败，请重试' },
        { status: 500 }
      )
    }

    // Supabase更新成功，再调用Dify（保持同步）
    const difyUrl = `${assistant.dify_base_url}/conversations/${conversationId}/name`

    const difyResponse = await fetch(difyUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${bearerKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: trimmedName, user: userValue }),
    })

    if (!difyResponse.ok) {
      const errorText = await difyResponse.text()
      console.error('Dify API错误:', errorText)
      // Dify失败但Supabase已更新，记录警告但不回滚（因为Supabase是主数据源）
      console.warn('Dify更新失败，但Supabase已更新成功')
    }

    const data = await difyResponse.json().catch(() => ({
      id: conversationId,
      name: trimmedName,
    }))

    return NextResponse.json({ conversation: data })
  } catch (e) {
    console.error('更新对话名称错误:', e)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { assistantId, userId } = await request.json()
    const conversationId = params.id
    if (!assistantId || !conversationId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const { data: assistant, error } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .maybeSingle()

    if (error || !assistant) {
      return NextResponse.json({ error: '助手不存在' }, { status: 404 })
    }

    const keyRef = (assistant as any).key_ref as string | undefined
    const bearerKey = (keyRef && process.env[keyRef]) || assistant.dify_api_key
    const userValue = userId ? `user-${userId}` : 'user-anon'
    const difyUrl = `${assistant.dify_base_url}/conversations/${conversationId}`

    // 修复：先删除Dify数据，成功后再删除Supabase（避免数据重新同步回来）
    const difyResponse = await fetch(difyUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${bearerKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user: userValue }),
    })

    if (!difyResponse.ok) {
      const errorText = await difyResponse.text()
      console.error('Dify API错误:', errorText)
      // Dify删除失败，不删除Supabase，避免数据不一致
      return NextResponse.json(
        { error: '删除失败，请重试' },
        { status: 500 }
      )
    }

    // Dify删除成功，再删除Supabase数据（修复：同时删除消息和会话）
    const { error: deleteMessagesError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userValue)

    if (deleteMessagesError) {
      console.error('删除Supabase消息失败:', deleteMessagesError)
      // 继续删除会话，即使消息删除失败
    }

    const { error: deleteConvError } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userValue)

    if (deleteConvError) {
      console.error('删除Supabase会话失败:', deleteConvError)
      // Dify已删除但Supabase失败，记录错误但不返回错误（因为Dify已删除）
      console.warn('Dify删除成功，但Supabase删除失败')
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('删除对话错误:', e)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 优化：返回操作结果，便于上层判断
async function syncConversationTitle({
  conversationId,
  assistantId,
  userIdentifier,
  title,
}: {
  conversationId: string
  assistantId: string
  userIdentifier: string
  title: string
}): Promise<{ success: boolean; error?: any }> {
  try {
    const nowIso = new Date().toISOString()

    // 先尝试更新
    const { data: updated, error: updateError } = await supabase
      .from('chat_conversations')
      .update({ title, updated_at: nowIso })
      .eq('id', conversationId)
      .eq('user_id', userIdentifier)
      .select('id')

    if (updateError) {
      console.error('更新会话标题失败:', updateError)
      return { success: false, error: updateError }
    }

    // 如果更新成功（找到记录），直接返回
    if (updated && updated.length > 0) {
      return { success: true }
    }

    // 如果记录不存在，尝试插入
    const { error: insertError } = await supabase.from('chat_conversations').insert({
      id: conversationId,
      user_id: userIdentifier,
      assistant_id: assistantId,
      title,
      created_at: nowIso,
      updated_at: nowIso,
    })

    if (insertError) {
      console.error('插入会话标题失败:', insertError)
      return { success: false, error: insertError }
    }

    return { success: true }
  } catch (err) {
    console.error('同步会话标题异常:', err)
    return { success: false, error: err }
  }
}
