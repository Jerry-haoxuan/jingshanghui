import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@/lib/userRole'
import { validateMemberKey, MemberAccount } from '@/lib/memberKeys'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userType, betaCode } = body

    console.log('[Login API] 收到登录请求:', { userType, betaCode })

    // 验证内测码或密钥
    let isValid = false
    let memberAccount: MemberAccount | null = null
    
    if (userType === UserRole.MANAGER && betaCode === 'ECOSYSTEM2024') {
      isValid = true
    } else if (userType === UserRole.MEMBER) {
      // 会员使用密钥登录
      memberAccount = validateMemberKey(betaCode)
      if (memberAccount) {
        isValid = true
        console.log('[Login API] 会员密钥验证成功:', memberAccount.aliasName)
      }
    }

    if (!isValid) {
      console.log('[Login API] 无效的内测码或密钥')
      return NextResponse.json(
        { 
          success: false, 
          message: userType === UserRole.MEMBER ? '无效的会员密钥' : '无效的内测码' 
        },
        { status: 401 }
      )
    }

    console.log('[Login API] 验证成功，用户类型:', userType)

    // 创建响应，如果是会员登录，返回会员信息
    const response = NextResponse.json({ 
      success: true,
      memberAccount: memberAccount || undefined
    })

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