import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/authSession'

export const dynamic = 'force-dynamic'

// 首页用它判断浏览器里记住的登录状态是否还有效
export async function GET(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  return NextResponse.json(session ? { authenticated: true, role: session.role } : { authenticated: false })
}
