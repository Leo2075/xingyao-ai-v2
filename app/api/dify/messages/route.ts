import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { assistantId, conversationId, userId } = await request.json()

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
      `${difyUrl}?conversation_id=${conversationId}&user=${userId ? `user-${userId}` : 'user-anon'}&limit=5`,
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
    
    // 转换Dify消息格式为我们的格式
    const messages = (data.data || []).reverse().flatMap((item: any) => {
      const result = []
      
      // 用户消息
      if (item.query) {
        result.push({
          id: `${item.id}-user`,
          role: 'user',
          content: item.query,
          created_at: item.created_at,
        })
      }
      
      // AI回复
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

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('获取消息历史错误:', error)
    return NextResponse.json(
      { messages: [] },
      { status: 200 }
    )
  }
}
