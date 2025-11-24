import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 本地开发模式 - 允许的用户列表
const DEV_USERS = [
  { id: '001', username: '001', password: '001' },
  { id: '002', username: '002', password: '002' },
  { id: '003', username: '003', password: '003' },
  { id: 'admin', username: 'admin', password: 'password' },
]

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: '请输入用户名和密码' },
        { status: 400 }
      )
    }

    // 优先尝试 Supabase（本地和生产环境统一）
    console.log('📡 尝试连接 Supabase 验证用户:', username)
    
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle()

    if (error) {
      console.error('❌ Supabase 查询错误:', error.message)
      // 如果 Supabase 连接失败，降级使用本地用户列表（仅开发环境）
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ 降级使用本地用户认证')
        const user = DEV_USERS.find(u => u.username === username && u.password === password)
        
        if (user) {
          const { password: _, ...userData } = user
          console.log('✅ 本地认证成功:', username)
          return NextResponse.json({ user: userData })
        } else {
          console.log('❌ 本地认证失败:', username)
          return NextResponse.json(
            { error: '用户名或密码错误' },
            { status: 401 }
          )
        }
      }
      return NextResponse.json(
        { error: '登录失败，请重试' },
        { status: 500 }
      )
    }

    if (!users) {
      console.log('❌ 用户不存在:', username)
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      )
    }

    // 简单密码验证（实际应用中应该使用哈希）
    if (users.password !== password) {
      console.log('❌ 密码错误:', username)
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      )
    }

    // 返回用户信息（不包括密码）
    const { password: _, ...user } = users
    console.log('✅ Supabase 认证成功:', username)

    return NextResponse.json({ user })
  } catch (error) {
    console.error('登录异常:', error)
    // 降级处理
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ 发生异常，尝试本地认证')
      const { username, password } = await request.json()
      const user = DEV_USERS.find(u => u.username === username && u.password === password)
      
      if (user) {
        const { password: _, ...userData } = user
        return NextResponse.json({ user: userData })
      }
    }
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
