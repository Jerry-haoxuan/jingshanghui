import { NextRequest, NextResponse } from 'next/server'
import { listLogs, addLog } from '@/lib/projectStore'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const logs = await listLogs(params.id)
  return NextResponse.json({ logs })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { log_type, content, author_person_id, metadata } = body
    if (!log_type || !content) {
      return NextResponse.json({ error: 'log_type and content are required' }, { status: 400 })
    }
    const log = await addLog({
      project_id: params.id,
      log_type,
      content,
      author_person_id,
      metadata,
    })
    if (!log) {
      return NextResponse.json({ error: '添加失败' }, { status: 500 })
    }
    return NextResponse.json({ log }, { status: 201 })
  } catch (e) {
    console.error('[api/projects/[id]/logs] POST error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
