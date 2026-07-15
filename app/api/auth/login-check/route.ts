import { NextRequest, NextResponse } from 'next/server'
import { loginUser } from '@/lib/userStore'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json({ success: false, message: '请输入手机号/用户名和密码' }, { status: 400 })
    }

    const result = await loginUser(username, password)
    return NextResponse.json(result, { status: result.success ? 200 : 401 })
  } catch (error) {
    console.error('[登录校验API] 出错:', error)
    return NextResponse.json({ success: false, message: '登录失败，请稍后重试' }, { status: 500 })
  }
}
