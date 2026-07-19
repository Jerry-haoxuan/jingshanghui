import { NextRequest, NextResponse } from 'next/server'
import { listMilestones, batchUpsertMilestones } from '@/lib/projectStore'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const milestones = await listMilestones(params.id)
  return NextResponse.json({ milestones })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const milestones = Array.isArray(body?.milestones) ? body.milestones : []
    const ok = await batchUpsertMilestones(
      milestones.map((m: Record<string, unknown>) => ({ ...m, project_id: params.id }))
    )
    if (!ok) {
      return NextResponse.json({ error: '保存失败' }, { status: 500 })
    }
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (e) {
    console.error('[api/projects/[id]/milestones] POST error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
