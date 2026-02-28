import { NextRequest, NextResponse } from 'next/server'
import { listFiles, addFile, deleteFile } from '@/lib/projectStore'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const files = await listFiles(params.id)
  return NextResponse.json({ files })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { file_name, file_url, file_type, uploaded_by_person_id } = body
    if (!file_name) {
      return NextResponse.json({ error: 'file_name is required' }, { status: 400 })
    }
    const file = await addFile({
      project_id: params.id,
      file_name,
      file_url,
      file_type,
      uploaded_by_person_id,
    })
    if (!file) {
      return NextResponse.json({ error: '添加失败' }, { status: 500 })
    }
    return NextResponse.json({ file }, { status: 201 })
  } catch (e) {
    console.error('[api/projects/[id]/files] POST error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const fileId = searchParams.get('fileId')
  if (!fileId) {
    return NextResponse.json({ error: 'fileId is required' }, { status: 400 })
  }
  const ok = await deleteFile(fileId)
  if (!ok) {
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
