import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: assistants, error } = await supabase
      .from('assistants')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('数据库查询错误:', error)
      return NextResponse.json(
        { error: '获取助手列表失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({ assistants: assistants || [] })
  } catch (error) {
    console.error('获取助手列表错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
