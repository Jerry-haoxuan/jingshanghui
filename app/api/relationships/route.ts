import { NextRequest, NextResponse } from 'next/server'
import { listRelationshipsFromCloud, batchUpsertRelationshipsToCloud } from '@/lib/cloudStore'
import type { RelationshipData } from '@/lib/relationshipManager'

// 关系数据的云端读写必须走服务器接口：DATABASE_URL 只在服务器端可用，
// 之前 lib/relationshipManager.ts 直接从客户端调用 cloudStore 里的函数，
// 导致"是否已配置云端"的判断在浏览器里永远是 false，关系数据从来没有真正存进过云端数据库——
// 每个用户每次打开人物详情页都会因为"查无关系"而重新触发一次AI分析，白白浪费DeepSeek调用次数。
export async function GET() {
  try {
    const relationships = await listRelationshipsFromCloud()
    return NextResponse.json({ relationships })
  } catch (e) {
    console.error('[api/relationships] GET error:', e)
    return NextResponse.json({ relationships: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const relationships: RelationshipData[] = Array.isArray(body?.relationships) ? body.relationships : []
    await batchUpsertRelationshipsToCloud(relationships)
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (e) {
    console.error('[api/relationships] POST error:', e)
    return NextResponse.json({ error: '保存失败' }, { status: 500 })
  }
}
