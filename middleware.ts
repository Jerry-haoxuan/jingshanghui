import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 不需要登录就能访问的精确路径（分享落地、登录页、公开下载、鉴权接口）
const publicRoutes = [
  '/',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/login-check',
  '/api/auth/register-phone',
  '/api/auth/send-code',
  '/api/download-template',
]

// 需要登录才能打开的页面前缀。API 不放这里：登录页、Excel 解析、AI 对话都要在未登录或跨页时能调。
const protectedPrefixes = [
  '/dashboard',
  '/person',
  '/company',
  '/data-input',
  '/ai-assistant',
  '/projects',
  '/import-companies',
]

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  const isProtectedRoute = protectedPrefixes.some(prefix => pathname.startsWith(prefix))
  if (isProtectedRoute) {
    const userRole = request.cookies.get('userRole')?.value
    if (!userRole || (userRole !== 'member' && userRole !== 'manager')) {
      const redirectUrl = new URL('/', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
