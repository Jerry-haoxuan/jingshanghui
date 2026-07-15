import { NextRequest, NextResponse } from 'next/server'
import { sendVerificationCode, isValidChinesePhone } from '@/lib/smsService'

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()

    if (!phone || typeof phone !== 'string' || !isValidChinesePhone(phone)) {
      return NextResponse.json({ success: false, message: '请输入有效的手机号' }, { status: 400 })
    }

    const result = await sendVerificationCode(phone.trim())
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 429 })
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      // devCode 仅在短信服务未配置时存在（本地调试用），生产环境配置好阿里云短信后不会返回
      devCode: result.devCode,
    })
  } catch (error) {
    console.error('[发送验证码] 出错:', error)
    return NextResponse.json({ success: false, message: '发送失败，请稍后重试' }, { status: 500 })
  }
}
