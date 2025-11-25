// ============================================================
// 星耀AI - 管理 API：助手列表（含敏感信息）& 新增助手
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { CreateAssistantRequest } from '@/lib/ai-types'

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

// GET: 获取所有助手（含敏感信息）
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
      console.error('获取助手列表失败:', error)
      // 检查是否是字段不存在的错误
      if (error.message?.includes('column') || error.code === '42703') {
        return NextResponse.json(
          { 
            error: '数据库字段缺失，请先执行迁移脚本',
            migration_needed: true,
            details: error.message
          },
          { status: 500 }
        )
      }
      return NextResponse.json(
        { error: '获取助手列表失败: ' + error.message },
        { status: 500 }
      )
    }

    // 兼容旧数据结构：为没有新字段的助手添加默认值
    const normalizedAssistants = (assistants || []).map(assistant => ({
      ...assistant,
      // 如果没有 api_mode，根据 dify_api_key 是否存在判断
      api_mode: assistant.api_mode || 'dify',
      // 兼容旧字段名
      dify_url: assistant.dify_url || assistant.dify_base_url || 'https://api.dify.ai/v1',
      dify_key: assistant.dify_key || assistant.dify_api_key || '',
      // 设置默认值
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
    console.error('获取助手列表错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// POST: 新增助手
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

    if (!body.api_mode || !['dify', 'relay'].includes(body.api_mode)) {
      return NextResponse.json(
        { error: '调用模式必须是 dify 或 relay' },
        { status: 400 }
      )
    }

    // 根据模式验证必填配置
    if (body.api_mode === 'dify') {
      if (!body.dify_url || !body.dify_key) {
        return NextResponse.json(
          { error: 'Dify 模式需要配置 dify_url 和 dify_key' },
          { status: 400 }
        )
      }
    } else if (body.api_mode === 'relay') {
      if (!body.relay_url || !body.relay_key || !body.relay_model) {
        return NextResponse.json(
          { error: '中转站模式需要配置 relay_url、relay_key 和 relay_model' },
          { status: 400 }
        )
      }
    }

    // 构建插入数据
    // 注意：如果旧字段 (dify_api_key, dify_app_id) 仍有 NOT NULL 约束，需要同时填充
    const insertData: Record<string, unknown> = {
      name: body.name,
      description: body.description || '',
      icon_name: body.icon_name || 'brain',
      status: 'active',
      // 新字段
      api_mode: body.api_mode,
      dify_url: body.dify_url || null,
      dify_key: body.dify_key || null,
      relay_url: body.relay_url || null,
      relay_key: body.relay_key || null,
      relay_model: body.relay_model || null,
      system_prompt: body.system_prompt || '你是一个专业的AI助手。',
      temperature: body.temperature ?? 0.8,
      max_tokens: body.max_tokens ?? 2500,
      top_p: body.top_p ?? 1.0,
      frequency_penalty: body.frequency_penalty ?? 0,
      presence_penalty: body.presence_penalty ?? 0,
      context_window: body.context_window ?? 20,
      // 兼容旧字段（如果表中仍有 NOT NULL 约束）
      dify_api_key: body.dify_key || 'migrated',
      dify_app_id: 'app-migrated',
      dify_base_url: body.dify_url || 'https://api.dify.ai/v1',
    }

    console.log('准备插入数据:', JSON.stringify(insertData, null, 2))
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '已配置' : '未配置')

    let { data: assistant, error } = await supabase
      .from('assistants')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('创建助手失败:', error)
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
    console.error('创建助手错误:', error)
    return NextResponse.json(
      { error: '创建助手失败: ' + (error?.message || String(error)) },
      { status: 500 }
    )
  }
}

