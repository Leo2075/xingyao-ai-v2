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
    const difyUrl = `${assistant.dify_base_url}/conversations/${conversationId}/name`

    const difyResponse = await fetch(difyUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${bearerKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: name.trim(), user: userValue }),
    })

    if (!difyResponse.ok) {
      const errorText = await difyResponse.text()
      console.error('Dify API错误:', errorText)
      return NextResponse.json({ error: '更新失败' }, { status: 500 })
    }

    const data = await difyResponse.json()

    await syncConversationTitle({
      conversationId,
      assistantId,
      userIdentifier: userValue,
      title: name.trim(),
    })

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
      return NextResponse.json({ error: '删除失败' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('删除对话错误:', e)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

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
}) {
  try {
    const nowIso = new Date().toISOString()

    const { data: updated, error: updateError } = await supabase
      .from('chat_conversations')
      .update({ title, updated_at: nowIso })
      .eq('id', conversationId)
      .eq('user_id', userIdentifier)
      .select('id')

    if (updateError) {
      console.error('更新会话标题失败:', updateError)
      return
    }

    if (updated && updated.length > 0) {
      return
    }

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
    }
  } catch (err) {
    console.error('同步会话标题异常:', err)
  }
}