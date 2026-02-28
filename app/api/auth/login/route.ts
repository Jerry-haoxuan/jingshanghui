import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@/lib/userRole'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userType, username } = body

    console.log('[Login API] 收到登录请求:', { userType, username })

    // 验证 userType 是否合法
    if (userType !== UserRole.MANAGER && userType !== UserRole.MEMBER) {
      return NextResponse.json(
        { success: false, message: '无效的用户类型' },
        { status: 400 }
      )
    }

    console.log('[Login API] 验证通过，用户类型:', userType, '用户名:', username)

    const response = NextResponse.json({ success: true })

    const isProduction = process.env.NODE_ENV === 'production'

    response.cookies.set({
      name: 'userRole',
      value: userType,
      path: '/',
      maxAge: 60 * 60 * 24 * 90, // 90天
      sameSite: 'lax',
      secure: isProduction,
      httpOnly: false,
    })

    console.log('[Login API] Cookie 设置完成，返回成功响应')

    return response
  } catch (error) {
    console.error('[Login API] 登录过程中出错:', error)
    return NextResponse.json(
      { success: false, message: '登录失败' },
      { status: 500 }
    )
  }
}
