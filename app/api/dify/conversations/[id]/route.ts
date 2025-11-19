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
    return NextResponse.json({ conversation: data })
  } catch (e) {
    console.error('更新对话名称错误:', e)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}