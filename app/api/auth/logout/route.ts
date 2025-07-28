import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // 创建响应
  const response = NextResponse.json({ success: true })

  // 清除Cookie
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