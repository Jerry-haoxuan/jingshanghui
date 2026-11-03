import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/authSession'

// 不需要登录就能访问的精确路径（分享落地、登录页、公开下载、鉴权接口）
const publicRoutes = [
  '/',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/login-check',
  '/api/auth/register-phone',
  '/api/auth/send-code',
  '/api/auth/session',
  '/api/download-template',
]

// 需要登录才能打开的页面前缀。/api/ 下除了上面列出的公开接口，也全部要求登录。
const protectedPrefixes = [
  '/dashboard',
  '/person',
  '/company',
  '/data-input',
  '/ai-assistant',
  '/projects',
  '/import-companies',
]

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  const isApi = pathname.startsWith('/api/')
  const isProtectedRoute = protectedPrefixes.some(prefix => pathname.startsWith(prefix))
  if (!isApi && !isProtectedRoute) {
    return NextResponse.next()
  }

  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (session) {
    return NextResponse.next()
  }

  if (isApi) {
    // x-login-required 告诉前端（SessionWatcher）这是登录失效，而不是接口自己的 401（比如密码错误）
    return NextResponse.json(
      { success: false, message: '请先登录' },
      { status: 401, headers: { 'x-login-required': '1' } }
    )
  }

  const redirectUrl = new URL('/', request.url)
  return NextResponse.redirect(redirectUrl)
}

export const config = {
  matcher: [
    // 单独列出 /api：下面那条会跳过以图片后缀结尾的路径，接口不能因此绕过登录检查
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
