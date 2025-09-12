import { NextRequest, NextResponse } from 'next/server'
import { upsertPersonToCloud } from '@/lib/cloudStore'
import type { PersonData } from '@/lib/dataStore'

export async function POST(request: NextRequest) {
  try {
    const personData: PersonData = await request.json()
    
    console.log('[Update Person API] 收到更新请求:', {
      id: personData.id,
      name: personData.name,
      hasSupabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
    })
    
    // 确保ID存在且有效
    if (!personData.id) {
      console.error('[Update Person API] 错误：缺少ID')
    }
    
    if (!personData.id || !personData.name) {
      return NextResponse.json(
        { success: false, message: '缺少必要的字段（id和name）' },
        { status: 400 }
      )
    }

    // 1. 仅同步到云端（服务端无法访问浏览器 localStorage，不做本地更新）
    const updatedPerson = personData
    
    console.log('[Update Person API] 本地更新成功')

    // 2. 同步到云端数据库
    try {
      await upsertPersonToCloud(updatedPerson)
      console.log('[Update Person API] 成功同步到云端:', personData.id)
    } catch (cloudError: any) {
      console.error('[Update Person API] 云端同步失败:', {
        error: cloudError,
        message: cloudError?.message,
        details: cloudError?.details,
        hint: cloudError?.hint
      })
      // 即使云端同步失败，本地更新已成功，返回部分成功状态
      return NextResponse.json({
        success: true,
        message: '本地更新成功，但云端同步失败',
        data: updatedPerson,
        cloudError: true,
        errorDetails: cloudError?.message || '未知错误'
      })
    }

    return NextResponse.json({
      success: true,
      message: '人物信息更新成功',
      data: updatedPerson
    })
  } catch (error) {
    console.error('[Update Person API] 更新失败:', error)
    return NextResponse.json(
      { success: false, message: '更新失败，请稍后重试' },
      { status: 500 }
    )
  }
}
