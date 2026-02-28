import { NextRequest, NextResponse } from 'next/server'
import { listProjects, createProject } from '@/lib/projectStore'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const personId = searchParams.get('personId')
  if (!personId) {
    return NextResponse.json({ error: 'personId is required' }, { status: 400 })
  }
  const projects = await listProjects(personId)
  return NextResponse.json({ projects })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, creator_person_id, partner_person_id } = body
    if (!name || !creator_person_id || !partner_person_id) {
      return NextResponse.json({ error: 'name, creator_person_id, partner_person_id are required' }, { status: 400 })
    }
    const project = await createProject({
      name,
      description,
      status: 'in_progress',
      current_stage: 'initiation',
      creator_person_id,
      partner_person_id,
    })
    if (!project) {
      return NextResponse.json({ error: '创建失败，请检查 Supabase 配置' }, { status: 500 })
    }
    return NextResponse.json({ project }, { status: 201 })
  } catch (e) {
    console.error('[api/projects] POST error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
