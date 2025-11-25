// ============================================================
// 星耀AI - 管理 API：单个助手操作（更新、删除）
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { UpdateAssistantRequest } from '@/lib/ai-types'

// 验证管理员密码
function verifyAdminAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }
  const token = authHeader.slice(7)
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  return token === adminPassword
}

// GET: 获取单个助手详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 验证权限
  if (!verifyAdminAuth(request)) {
    return NextResponse.json(
      { error: '未授权访问' },
      { status: 401 }
    )
  }

  try {
    const { id } = params

    const { data: assistant, error } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !assistant) {
      return NextResponse.json(
        { error: '助手不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({ assistant })
  } catch (error) {
    console.error('获取助手详情错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// PATCH: 更新助手配置
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 验证权限
  if (!verifyAdminAuth(request)) {
    return NextResponse.json(
      { error: '未授权访问' },
      { status: 401 }
    )
  }

  try {
    const { id } = params
    const body: UpdateAssistantRequest = await request.json()

    // 构建更新对象（只更新传入的字段）
    const updates: Record<string, any> = {}
    
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.icon_name !== undefined) updates.icon_name = body.icon_name
    if (body.api_mode !== undefined) updates.api_mode = body.api_mode
    if (body.dify_url !== undefined) updates.dify_url = body.dify_url
    if (body.dify_key !== undefined) updates.dify_key = body.dify_key
    if (body.relay_url !== undefined) updates.relay_url = body.relay_url
    if (body.relay_key !== undefined) updates.relay_key = body.relay_key
    if (body.relay_model !== undefined) updates.relay_model = body.relay_model
    if (body.system_prompt !== undefined) updates.system_prompt = body.system_prompt
    if (body.temperature !== undefined) updates.temperature = body.temperature
    if (body.max_tokens !== undefined) updates.max_tokens = body.max_tokens
    if (body.top_p !== undefined) updates.top_p = body.top_p
    if (body.frequency_penalty !== undefined) updates.frequency_penalty = body.frequency_penalty
    if (body.presence_penalty !== undefined) updates.presence_penalty = body.presence_penalty
    if (body.context_window !== undefined) updates.context_window = body.context_window
    if (body.advanced_config !== undefined) updates.advanced_config = body.advanced_config

    // 添加更新时间
    updates.updated_at = new Date().toISOString()

    // 执行更新
    const { data: assistant, error } = await supabase
      .from('assistants')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('更新助手失败:', error)
      return NextResponse.json(
        { error: '更新失败: ' + error.message },
        { status: 500 }
      )
    }

    if (!assistant) {
      return NextResponse.json(
        { error: '助手不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      assistant,
      message: '更新成功'
    })
  } catch (error) {
    console.error('更新助手错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// DELETE: 删除助手
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 验证权限
  if (!verifyAdminAuth(request)) {
    return NextResponse.json(
      { error: '未授权访问' },
      { status: 401 }
    )
  }

  try {
    const { id } = params

    // 检查助手是否存在
    const { data: existing } = await supabase
      .from('assistants')
      .select('id, name')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: '助手不存在' },
        { status: 404 }
      )
    }

    // 软删除：将状态改为 inactive
    const { error } = await supabase
      .from('assistants')
      .update({ 
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('删除助手失败:', error)
      return NextResponse.json(
        { error: '删除失败: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: `助手 "${existing.name}" 已删除`
    })
  } catch (error) {
    console.error('删除助手错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

