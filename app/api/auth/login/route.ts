import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@/lib/userRole'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userType, betaCode } = body

    // 验证内测码
    let isValid = false
    if (userType === UserRole.MANAGER && betaCode === 'ECOSYSTEM2024') {
      isValid = true
    } else if (userType === UserRole.MEMBER && betaCode === 'MEMBER2024') {
      isValid = true
    }

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: '无效的内测码' },
        { status: 401 }
      )
    }

    // 创建响应
    const response = NextResponse.json({ success: true })

    // 在服务器端设置Cookie
    const isProduction = process.env.NODE_ENV === 'production'
    
    response.cookies.set({
      name: 'userRole',
      value: userType,
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30天
      sameSite: 'lax',
      secure: isProduction, // 生产环境使用secure
      httpOnly: false // 允许客户端JavaScript访问
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { success: false, message: '登录失败' },
      { status: 500 }
    )
  }
} 