import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseReady } from '@/lib/supabaseClient'

// 企业名称标准化函数
const normalizeCompanyName = (name: string): string => {
  return name.trim()
    .replace(/\s+/g, ' ') // 多个空格替换为单个空格
    .replace(/[（(].*?[）)]/g, '') // 移除括号内容
    .trim()
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseReady) {
      return NextResponse.json(
        { success: false, message: 'Supabase未配置' },
        { status: 400 }
      )
    }

    // 1. 获取所有企业
    const { data: companies, error: fetchError } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: true }) // 保留最早创建的

    if (fetchError) {
      throw fetchError
    }

    if (!companies || companies.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有找到企业数据',
        result: { original: 0, deduplicated: 0, removed: 0 }
      })
    }

    console.log(`[云端去重] 开始处理，原有企业数量: ${companies.length}`)

    // 2. 按标准化名称分组
    const companyGroups = new Map<string, any[]>()
    
    companies.forEach((company: any) => {
      const normalizedName = normalizeCompanyName(company.name)
      if (!companyGroups.has(normalizedName)) {
        companyGroups.set(normalizedName, [])
      }
      companyGroups.get(normalizedName)!.push(company)
    })

    // 3. 合并重复企业
    const toKeep: any[] = []
    const toDelete: string[] = []

    Array.from(companyGroups.entries()).forEach(([normalizedName, group]) => {
      if (group.length === 1) {
        // 没有重复
        toKeep.push(group[0])
      } else {
        // 有重复，合并信息
        console.log(`[云端去重] 发现重复企业: ${normalizedName}, 数量: ${group.length}`)
        
        // 选择最早创建的作为主记录
        const primary = group[0]
        const duplicates = group.slice(1)
        
        // 合并所有信息到主记录
        const merged = { ...primary }
        
        duplicates.forEach((dup: any) => {
          // 智能合并字段
          merged.industry = merged.industry || dup.industry
          merged.scale = merged.scale || dup.scale
          merged.positioning = merged.positioning || dup.positioning
          merged.value = merged.value || dup.value
          merged.achievements = merged.achievements || dup.achievements
          merged.demands = merged.demands || dup.demands
          merged.additional_info = merged.additional_info || dup.additional_info
          
          // 合并数组字段（去重）
          if (dup.products) {
            merged.products = [...(merged.products || []), ...dup.products]
              .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i)
          }
          if (dup.suppliers) {
            merged.suppliers = [...(merged.suppliers || []), ...dup.suppliers]
              .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i)
          }
          if (dup.customers) {
            merged.customers = [...(merged.customers || []), ...dup.customers]
              .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i)
          }
          
          // 记录要删除的重复记录
          toDelete.push(dup.id)
        })
        
        toKeep.push(merged)
      }
    })

    // 4. 执行数据库操作
    let updateCount = 0
    let deleteCount = 0

    // 更新合并后的记录
    for (const company of toKeep) {
      if (companyGroups.get(normalizeCompanyName(company.name))!.length > 1) {
        const { error: updateError } = await supabase
          .from('companies')
          .update(company)
          .eq('id', company.id)
        
        if (updateError) {
          console.error(`[云端去重] 更新企业失败: ${company.name}`, updateError)
        } else {
          updateCount++
        }
      }
    }

    // 删除重复记录
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('companies')
        .delete()
        .in('id', toDelete)
      
      if (deleteError) {
        console.error('[云端去重] 删除重复企业失败:', deleteError)
      } else {
        deleteCount = toDelete.length
      }
    }

    console.log(`[云端去重] 完成 - 原始: ${companies.length}, 保留: ${toKeep.length}, 删除: ${toDelete.length}`)

    return NextResponse.json({
      success: true,
      message: '云端企业去重完成',
      result: {
        original: companies.length,
        deduplicated: toKeep.length,
        removed: toDelete.length,
        updated: updateCount,
        deleted: deleteCount
      }
    })
  } catch (error: any) {
    console.error('[云端去重] 错误:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '云端去重失败',
        error: error.message 
      },
      { status: 500 }
    )
  }
}
