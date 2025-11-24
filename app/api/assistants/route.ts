import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 本地开发模式 - 预设助手列表（与正式环境保持一致：2个助手）
const DEV_ASSISTANTS = [
  {
    id: '1',
    name: 'IP策划师',
    description: '帮你构建个人IP形象和人设定位，专注于品牌定位、人设包装',
    dify_api_key: 'YOUR_DIFY_API_KEY',
    dify_app_id: 'app-CC6sKsQ0DG30G6OqjnABxjJF',
    dify_base_url: 'https://api.dify.ai/v1',
    status: 'active',
    icon_name: 'brain',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    name: '短视频脚本专家',
    description: '专业短视频脚本创作和优化，擅长脚本创作、内容规划',
    dify_api_key: 'YOUR_DIFY_API_KEY',
    dify_app_id: 'app-CC6sKsQ0DG30G6OqjnABxjJF',
    dify_base_url: 'https://api.dify.ai/v1',
    status: 'active',
    icon_name: 'video',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

export async function GET() {
  try {
    // 统一使用 Supabase（本地和生产环境同步）
    console.log('📡 连接 Supabase 获取助手列表...')
    
    const { data: assistants, error } = await supabase
      .from('assistants')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('数据库查询错误:', error)
      // 如果 Supabase 连接失败，降级使用本地数据（仅开发环境）
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Supabase 连接失败，使用本地备用数据')
        return NextResponse.json({ assistants: DEV_ASSISTANTS })
      }
      return NextResponse.json(
        { error: '获取助手列表失败' },
        { status: 500 }
      )
    }

    console.log(`✅ 成功获取 ${assistants?.length || 0} 个助手`)
    return NextResponse.json({ assistants: assistants || [] })
  } catch (error) {
    console.error('获取助手列表错误:', error)
    // 降级处理
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ 发生异常，使用本地备用数据')
      return NextResponse.json({ assistants: DEV_ASSISTANTS })
    }
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
