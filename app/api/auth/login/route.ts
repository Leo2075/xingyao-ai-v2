import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: '请输入用户名和密码' },
        { status: 400 }
      )
    }

    // 查询用户
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle()

    if (error) {
      console.error('数据库查询错误:', error)
      return NextResponse.json(
        { error: '登录失败，请重试' },
        { status: 500 }
      )
    }

    if (!users) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      )
    }

    // 简单密码验证（实际应用中应该使用哈希）
    if (users.password !== password) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      )
    }

    // 返回用户信息（不包括密码）
    const { password: _, ...user } = users

    return NextResponse.json({ user })
  } catch (error) {
    console.error('登录错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
