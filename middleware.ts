import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 不需要保护的路由（公开路由）
const publicRoutes = [
  '/',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/download-template',
  '/api/download-customer-template',
  '/api/download-supplier-template'
]

// 需要保护的路由前缀
const protectedPrefixes = [
  '/dashboard',
  '/person',
  '/company',
  '/data-input',
  '/ai-assistant',
  '/add',
  '/company-input'
]

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // 检查是否是公开路由
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }
  
  // 检查是否是需要保护的路由
  const isProtectedRoute = protectedPrefixes.some(prefix => pathname.startsWith(prefix))
  
  if (isProtectedRoute) {
    // 检查用户角色Cookie
    const userRole = request.cookies.get('userRole')?.value
    
    // 如果没有用户角色，重定向到首页
    if (!userRole) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }
  
  return NextResponse.next()
}

// 配置中间件应用的路径
export const config = {
  matcher: [
    /*
     * 匹配所有路径除了：
     * - _next/static (静态文件)
     * - _next/image (图片优化文件)
     * - favicon.ico (网站图标)
     * - public 文件夹中的文件
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 