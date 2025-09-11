import { NextRequest, NextResponse } from 'next/server'
import { getPeople, getCompanies, savePeople, saveCompanies } from '@/lib/dataStore'
import { listPeopleFromCloud, listCompaniesFromCloud, upsertPersonToCloud, upsertCompanyToCloud } from '@/lib/cloudStore'

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json()
    
    console.log('[Sync API] 收到同步请求:', action)
    
    if (action === 'upload-local-to-cloud') {
      // 将本地数据上传到云端
      const localPeople = data.people || []
      const localCompanies = data.companies || []
      
      console.log('[Sync API] 上传本地数据到云端:', {
        peopleCount: localPeople.length,
        companiesCount: localCompanies.length
      })
      
      let uploadedPeople = 0
      let uploadedCompanies = 0
      
      // 上传人物数据
      for (const person of localPeople) {
        try {
          await upsertPersonToCloud(person)
          uploadedPeople++
        } catch (error) {
          console.error('[Sync API] 上传人物失败:', person.id, error)
        }
      }
      
      // 上传公司数据
      for (const company of localCompanies) {
        try {
          await upsertCompanyToCloud(company)
          uploadedCompanies++
        } catch (error) {
          console.error('[Sync API] 上传公司失败:', company.id, error)
        }
      }
      
      return NextResponse.json({
        success: true,
        message: '数据同步完成',
        uploaded: {
          people: uploadedPeople,
          companies: uploadedCompanies
        }
      })
    }
    
    if (action === 'download-cloud-to-local') {
      // 从云端下载数据到本地
      try {
        const cloudPeople = await listPeopleFromCloud()
        const cloudCompanies = await listCompaniesFromCloud()
        
        console.log('[Sync API] 从云端下载数据:', {
          peopleCount: cloudPeople.length,
          companiesCount: cloudCompanies.length
        })
        
        // 保存到本地
        savePeople(cloudPeople)
        saveCompanies(cloudCompanies)
        
        return NextResponse.json({
          success: true,
          message: '云端数据已同步到本地',
          downloaded: {
            people: cloudPeople.length,
            companies: cloudCompanies.length
          },
          data: {
            people: cloudPeople,
            companies: cloudCompanies
          }
        })
      } catch (error: any) {
        console.error('[Sync API] 下载云端数据失败:', error)
        return NextResponse.json({
          success: false,
          message: '下载云端数据失败：' + error.message
        }, { status: 500 })
      }
    }
    
    return NextResponse.json({
      success: false,
      message: '未知的同步操作'
    }, { status: 400 })
    
  } catch (error: any) {
    console.error('[Sync API] 同步失败:', error)
    return NextResponse.json({
      success: false,
      message: '同步失败：' + error.message
    }, { status: 500 })
  }
}
