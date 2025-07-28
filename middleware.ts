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
  
  // 添加调试日志
  console.log('[Middleware] 访问路径:', pathname)
  console.log('[Middleware] User-Agent:', request.headers.get('user-agent'))
  
  // 检查是否是公开路由
  if (publicRoutes.includes(pathname)) {
    console.log('[Middleware] 公开路由，允许访问')
    return NextResponse.next()
  }
  
  // 检查是否是需要保护的路由
  const isProtectedRoute = protectedPrefixes.some(prefix => pathname.startsWith(prefix))
  
  if (isProtectedRoute) {
    // 检查用户角色Cookie
    const userRole = request.cookies.get('userRole')?.value
    const allCookies = request.cookies.getAll()
    
    console.log('[Middleware] 受保护路由:', pathname)
    console.log('[Middleware] userRole Cookie:', userRole)
    console.log('[Middleware] 所有Cookies:', allCookies.map(c => `${c.name}=${c.value}`))
    
    // 如果没有用户角色，重定向到首页
    if (!userRole) {
      console.log('[Middleware] 未找到用户角色，重定向到首页')
      const redirectUrl = new URL('/', request.url)
      console.log('[Middleware] 重定向URL:', redirectUrl.toString())
      return NextResponse.redirect(redirectUrl)
    }
    
    console.log('[Middleware] 用户已认证，角色:', userRole)
  } else {
    console.log('[Middleware] 非保护路由，直接放行')
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