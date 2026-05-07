import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

const isReady = Boolean(process.env.DATABASE_URL)

const normalizeCompanyName = (name: string): string => {
  return name.trim()
    .replace(/\s+/g, ' ')
    .replace(/[（(].*?[）)]/g, '')
    .trim()
}

export async function POST(_request: NextRequest) {
  try {
    if (!isReady) {
      return NextResponse.json({ success: false, message: '数据库未配置' }, { status: 400 })
    }

    const { rows: companies } = await pool.query(
      'SELECT * FROM public.companies ORDER BY created_at ASC'
    )

    if (companies.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有找到企业数据',
        result: { original: 0, deduplicated: 0, removed: 0 }
      })
    }

    console.log(`[云端去重] 开始处理，原有企业数量: ${companies.length}`)

    const companyGroups = new Map<string, any[]>()
    companies.forEach((company: any) => {
      const normalizedName = normalizeCompanyName(company.name)
      if (!companyGroups.has(normalizedName)) companyGroups.set(normalizedName, [])
      companyGroups.get(normalizedName)!.push(company)
    })

    const toKeep: any[] = []
    const toDelete: string[] = []

    Array.from(companyGroups.entries()).forEach(([, group]) => {
      if (group.length === 1) {
        toKeep.push(group[0])
      } else {
        const primary = group[0]
        const duplicates = group.slice(1)
        const merged = { ...primary }
        duplicates.forEach((dup: any) => {
          merged.industry = merged.industry || dup.industry
          merged.scale = merged.scale || dup.scale
          merged.positioning = merged.positioning || dup.positioning
          merged.value = merged.value || dup.value
          merged.achievements = merged.achievements || dup.achievements
          merged.demands = merged.demands || dup.demands
          merged.additional_info = merged.additional_info || dup.additional_info
          if (dup.products) merged.products = [...(merged.products || []), ...dup.products].filter((v, i, a) => a.indexOf(v) === i)
          if (dup.suppliers) merged.suppliers = [...(merged.suppliers || []), ...dup.suppliers].filter((v, i, a) => a.indexOf(v) === i)
          if (dup.customers) merged.customers = [...(merged.customers || []), ...dup.customers].filter((v, i, a) => a.indexOf(v) === i)
          toDelete.push(dup.id)
        })
        toKeep.push(merged)
      }
    })

    let updateCount = 0
    let deleteCount = 0

    for (const company of toKeep) {
      if ((companyGroups.get(normalizeCompanyName(company.name))?.length ?? 0) > 1) {
        await pool.query(
          `UPDATE public.companies SET industry=$1, scale=$2, products=$3, is_followed=$4, additional_info=$5,
           positioning=$6, value=$7, achievements=$8, suppliers=$9, customers=$10, demands=$11 WHERE id=$12`,
          [company.industry, company.scale, company.products, company.is_followed, company.additional_info,
           company.positioning, company.value, company.achievements, company.suppliers, company.customers,
           company.demands, company.id]
        )
        updateCount++
      }
    }

    if (toDelete.length > 0) {
      await pool.query(
        `DELETE FROM public.companies WHERE id = ANY($1::text[])`,
        [toDelete]
      )
      deleteCount = toDelete.length
    }

    return NextResponse.json({
      success: true,
      message: '云端企业去重完成',
      result: { original: companies.length, deduplicated: toKeep.length, removed: toDelete.length, updated: updateCount, deleted: deleteCount }
    })
  } catch (error: any) {
    console.error('[云端去重] 错误:', error)
    return NextResponse.json({ success: false, message: '云端去重失败', error: error.message }, { status: 500 })
  }
}
