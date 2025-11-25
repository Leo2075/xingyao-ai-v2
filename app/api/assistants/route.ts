// ============================================================
// 星耀AI - 助手列表 API（公开接口，不含敏感信息）
// ============================================================

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 禁用缓存，确保每次都获取最新数据
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const { data: assistants, error } = await supabase
      .from('assistants')
      .select('id, name, description, icon_name, status, created_at, updated_at')
      .eq('status', 'active')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('获取助手列表失败:', error)
      return NextResponse.json(
        { error: '获取助手列表失败' },
        { status: 500 }
      )
    }

    // 返回时添加禁用缓存的头
    return NextResponse.json(
      { assistants: assistants || [] },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        }
      }
    )
  } catch (error) {
    console.error('获取助手列表错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
