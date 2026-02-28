import { NextRequest, NextResponse } from 'next/server'
import { listReviews, addReview, getReview } from '@/lib/projectStore'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url)
  const reviewerPersonId = searchParams.get('reviewerPersonId')

  if (reviewerPersonId) {
    const review = await getReview(params.id, reviewerPersonId)
    return NextResponse.json({ review })
  }

  const reviews = await listReviews(params.id)
  return NextResponse.json({ reviews })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { reviewer_person_id, reviewee_person_id, tags, comment } = body
    if (!reviewer_person_id || !reviewee_person_id) {
      return NextResponse.json(
        { error: 'reviewer_person_id and reviewee_person_id are required' },
        { status: 400 }
      )
    }
    // 防止重复评价
    const existing = await getReview(params.id, reviewer_person_id)
    if (existing) {
      return NextResponse.json({ error: '您已经评价过该项目' }, { status: 409 })
    }
    const review = await addReview({
      project_id: params.id,
      reviewer_person_id,
      reviewee_person_id,
      tags: tags ?? [],
      comment,
    })
    if (!review) {
      return NextResponse.json({ error: '提交评价失败' }, { status: 500 })
    }
    return NextResponse.json({ review }, { status: 201 })
  } catch (e) {
    console.error('[api/projects/[id]/reviews] POST error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
