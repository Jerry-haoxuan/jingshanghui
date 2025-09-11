import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@/lib/userRole'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userType, betaCode } = body

    console.log('[Login API] 收到登录请求:', { userType, betaCode })

    // 验证内测码
    let isValid = false
    if (userType === UserRole.MANAGER && betaCode === 'ECOSYSTEM2024') {
      isValid = true
    } else if (userType === UserRole.MEMBER && betaCode === 'MEMBER2024') {
      isValid = true
    }

    if (!isValid) {
      console.log('[Login API] 无效的内测码')
      return NextResponse.json(
        { success: false, message: '无效的内测码' },
        { status: 401 }
      )
    }

    console.log('[Login API] 内测码验证成功，用户类型:', userType)

    // 创建响应
    const response = NextResponse.json({ success: true })

    // 在服务器端设置Cookie
    const isProduction = process.env.NODE_ENV === 'production'
    
    const cookieOptions = {
      name: 'userRole',
      value: userType,
      path: '/',
      maxAge: 60 * 60 * 24 * 90, // 90天 - 延长有效期以实现持久登录
      sameSite: 'lax' as const,
      secure: isProduction, // 生产环境使用secure
      httpOnly: false // 允许客户端JavaScript访问
    }

    console.log('[Login API] 设置Cookie选项:', cookieOptions)
    console.log('[Login API] 当前环境:', process.env.NODE_ENV)
    console.log('[Login API] isProduction:', isProduction)

    response.cookies.set(cookieOptions)

    console.log('[Login API] Cookie设置完成，返回成功响应')

    return response
  } catch (error) {
    console.error('[Login API] 登录过程中出错:', error)
    return NextResponse.json(
      { success: false, message: '登录失败' },
      { status: 500 }
    )
  }
} 