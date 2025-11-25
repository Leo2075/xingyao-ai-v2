// ============================================================
// 星耀AI - 管理 API：助手列表 & 新增助手
// 仅支持中转站模式
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { CreateAssistantRequest } from '@/lib/ai-types'

/**
 * 验证管理员密码
 * 从请求头中获取 Bearer Token 并与环境变量比对
 */
function verifyAdminAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }
  const token = authHeader.slice(7)
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  return token === adminPassword
}

/**
 * GET: 获取所有助手（含敏感信息）
 * 需要管理员权限
 */
export async function GET(request: NextRequest) {
  // 验证权限
  if (!verifyAdminAuth(request)) {
    return NextResponse.json(
      { error: '未授权访问' },
      { status: 401 }
    )
  }

  try {
    const { data: assistants, error } = await supabase
      .from('assistants')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[Admin] 获取助手列表失败:', error)
      return NextResponse.json(
        { error: '获取助手列表失败: ' + error.message },
        { status: 500 }
      )
    }

    // 规范化数据：确保所有字段都有默认值
    const normalizedAssistants = (assistants || []).map(assistant => ({
      ...assistant,
      relay_url: assistant.relay_url || '',
      relay_key: assistant.relay_key || '',
      relay_model: assistant.relay_model || '',
      system_prompt: assistant.system_prompt || '你是一个专业的AI助手。',
      temperature: assistant.temperature ?? 0.8,
      max_tokens: assistant.max_tokens ?? 2500,
      top_p: assistant.top_p ?? 1.0,
      frequency_penalty: assistant.frequency_penalty ?? 0,
      presence_penalty: assistant.presence_penalty ?? 0,
      context_window: assistant.context_window ?? 20,
    }))

    return NextResponse.json({ assistants: normalizedAssistants })
  } catch (error) {
    console.error('[Admin] 获取助手列表错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

/**
 * POST: 新增助手
 * 需要管理员权限
 */
export async function POST(request: NextRequest) {
  // 验证权限
  if (!verifyAdminAuth(request)) {
    return NextResponse.json(
      { error: '未授权访问' },
      { status: 401 }
    )
  }

  try {
    const body: CreateAssistantRequest = await request.json()

    // 验证必填字段
    if (!body.name) {
      return NextResponse.json(
        { error: '助手名称不能为空' },
        { status: 400 }
      )
    }

    // 验证中转站必填配置
    if (!body.relay_url || !body.relay_key || !body.relay_model) {
      return NextResponse.json(
        { error: '请填写完整的中转站配置（URL、Key、Model）' },
        { status: 400 }
      )
    }

    console.log('[Admin] 创建助手:', body.name)

    // 插入数据
    const insertData = {
      name: body.name,
      description: body.description || '',
      icon_name: body.icon_name || 'brain',
      status: 'active',
      // 中转站配置
      relay_url: body.relay_url,
      relay_key: body.relay_key,
      relay_model: body.relay_model,
      // 模型参数
      system_prompt: body.system_prompt || '你是一个专业的AI助手。',
      temperature: body.temperature ?? 0.8,
      max_tokens: body.max_tokens ?? 2500,
      top_p: body.top_p ?? 1.0,
      frequency_penalty: body.frequency_penalty ?? 0,
      presence_penalty: body.presence_penalty ?? 0,
      context_window: body.context_window ?? 20,
    }

    const { data: assistant, error } = await supabase
      .from('assistants')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('[Admin] 创建助手失败:', error)
      return NextResponse.json(
        { error: '创建助手失败: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      assistant,
      message: '助手创建成功'
    })
  } catch (error: any) {
    console.error('[Admin] 创建助手错误:', error)
    return NextResponse.json(
      { error: '创建助手失败: ' + (error?.message || String(error)) },
      { status: 500 }
    )
  }
}
