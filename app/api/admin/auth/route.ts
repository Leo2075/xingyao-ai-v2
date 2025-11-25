// ============================================================
// 星耀AI - 管理后台认证 API
// ============================================================

import { NextRequest, NextResponse } from 'next/server'

// POST: 验证管理员密码
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json(
        { error: '请输入密码' },
        { status: 400 }
      )
    }

    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

    if (password === adminPassword) {
      return NextResponse.json({ 
        success: true,
        token: adminPassword,  // 简单实现，生产环境建议使用 JWT
        message: '登录成功'
      })
    } else {
      return NextResponse.json(
        { error: '密码错误' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('认证错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

