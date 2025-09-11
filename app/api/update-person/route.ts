import { NextRequest, NextResponse } from 'next/server'
import { upsertPersonToCloud } from '@/lib/cloudStore'
import { updatePerson } from '@/lib/dataStore'
import type { PersonData } from '@/lib/dataStore'

export async function POST(request: NextRequest) {
  try {
    const personData: PersonData = await request.json()
    
    if (!personData.id || !personData.name) {
      return NextResponse.json(
        { success: false, message: '缺少必要的字段（id和name）' },
        { status: 400 }
      )
    }

    // 1. 更新本地存储
    const updatedPerson = updatePerson(personData.id, personData)
    
    if (!updatedPerson) {
      return NextResponse.json(
        { success: false, message: '未找到要更新的人物' },
        { status: 404 }
      )
    }

    // 2. 同步到云端数据库
    try {
      await upsertPersonToCloud(updatedPerson)
      console.log('[Update Person API] 成功同步到云端:', personData.id)
    } catch (cloudError) {
      console.error('[Update Person API] 云端同步失败:', cloudError)
      // 即使云端同步失败，本地更新已成功，返回部分成功状态
      return NextResponse.json({
        success: true,
        message: '本地更新成功，但云端同步失败',
        data: updatedPerson,
        cloudError: true
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
