import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { assistantId, userId } = await request.json()

    if (!assistantId) {
      return NextResponse.json(
        { error: '缺少助手ID' },
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

    // 调用Dify API获取对话列表
    const keyRef = (assistant as any).key_ref as string | undefined
    const bearerKey = (keyRef && process.env[keyRef]) || assistant.dify_api_key
    const difyUrl = `${assistant.dify_base_url}/conversations`
    const difyResponse = await fetch(
      `${difyUrl}?user=${userId ? `user-${userId}` : 'user-anon'}&limit=20`,
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
        { conversations: [] },
        { status: 200 }
      )
    }

    const data = await difyResponse.json()
    
    return NextResponse.json({
      conversations: data.data || [],
    })
  } catch (error) {
    console.error('获取对话列表错误:', error)
    return NextResponse.json(
      { conversations: [] },
      { status: 200 }
    )
  }
}
