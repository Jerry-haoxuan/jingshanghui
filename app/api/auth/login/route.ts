import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/authSession'

// 身份已经在 login-check / register-phone 核对过，登录凭证也是那时发的。
// 这里只按凭证里的角色写前端用的 userRole Cookie，不能相信请求里传的角色，否则任何人都能自称管理者。
export async function POST(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (!session) {
    return NextResponse.json({ success: false, message: '请先登录' }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })

  const isProduction = process.env.NODE_ENV === 'production'

  response.cookies.set({
    name: 'userRole',
    value: session.role,
    path: '/',
    maxAge: 60 * 60 * 24 * 90, // 90天
    sameSite: 'lax',
    secure: isProduction,
    httpOnly: false,
  })

  return response
}
