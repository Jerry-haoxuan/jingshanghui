import { NextRequest, NextResponse } from 'next/server'
import { getProject, updateProject, deleteProject } from '@/lib/projectStore'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const project = await getProject(params.id)
  if (!project) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 })
  }
  return NextResponse.json({ project })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const ok = await updateProject(params.id, body)
    if (!ok) {
      return NextResponse.json({ error: '更新失败' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[api/projects/[id]] PATCH error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ok = await deleteProject(params.id)
  if (!ok) {
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
