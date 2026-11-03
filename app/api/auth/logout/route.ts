import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/authSession'

export async function POST(request: NextRequest) {
  // 创建响应
  const response = NextResponse.json({ success: true })

  // 清除Cookie
  clearSessionCookie(response)
  response.cookies.set({
    name: 'userRole',
    value: '',
    path: '/',
    maxAge: 0, // 立即过期
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false
  })

  return response
} 