import { NextRequest, NextResponse } from 'next/server'
import { registerUser } from '@/lib/userStore'
import { verifyCode, consumeVerificationCode, isValidChinesePhone } from '@/lib/smsService'

// 手机号注册（服务器端执行，确保直接写入云端数据库，而不是浏览器本地存储）
export async function POST(request: NextRequest) {
  try {
    const { phone, code, password, inviteCode, realName } = await request.json()

    if (!phone || typeof phone !== 'string' || !isValidChinesePhone(phone)) {
      return NextResponse.json({ success: false, message: '请输入有效的手机号' }, { status: 400 })
    }
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ success: false, message: '请输入验证码' }, { status: 400 })
    }
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ success: false, message: '请设置密码' }, { status: 400 })
    }
    if (!realName || typeof realName !== 'string' || !realName.trim()) {
      return NextResponse.json({ success: false, message: '请填写真实姓名' }, { status: 400 })
    }

    const phoneTrimmed = phone.trim()

    const codeCheck = verifyCode(phoneTrimmed, code)
    if (!codeCheck.success) {
      return NextResponse.json({ success: false, message: codeCheck.message }, { status: 400 })
    }

    const result = await registerUser(phoneTrimmed, password, inviteCode, realName.trim())
    if (!result.success || !result.role || !result.account) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 })
    }

    // 注册真正成功后才让验证码失效，避免邀请码等其他信息填错时白白浪费验证码
    consumeVerificationCode(phoneTrimmed)

    const response = NextResponse.json({
      success: true,
      message: '注册成功',
      role: result.role,
      account: result.account,
    })

    const isProduction = process.env.NODE_ENV === 'production'
    response.cookies.set({
      name: 'userRole',
      value: result.role,
      path: '/',
      maxAge: 60 * 60 * 24 * 90,
      sameSite: 'lax',
      secure: isProduction,
      httpOnly: false,
    })

    return response
  } catch (error) {
    console.error('[手机号注册] 出错:', error)
    return NextResponse.json({ success: false, message: '注册失败，请稍后重试' }, { status: 500 })
  }
}
