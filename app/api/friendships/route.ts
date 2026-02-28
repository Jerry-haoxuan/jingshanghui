import { NextRequest, NextResponse } from 'next/server'
import { listFriends, addFriend, removeFriend } from '@/lib/friendshipStore'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const personId = searchParams.get('personId')
  if (!personId) {
    return NextResponse.json({ error: 'personId is required' }, { status: 400 })
  }
  const friends = await listFriends(personId)
  return NextResponse.json({ friends })
}

export async function POST(request: NextRequest) {
  try {
    const { personId, friendId } = await request.json()
    if (!personId || !friendId) {
      return NextResponse.json({ error: 'personId and friendId are required' }, { status: 400 })
    }
    if (personId === friendId) {
      return NextResponse.json({ error: '不能添加自己为好友' }, { status: 400 })
    }
    const ok = await addFriend(personId, friendId)
    if (!ok) return NextResponse.json({ error: '添加失败，请检查 Supabase 配置' }, { status: 500 })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (e) {
    console.error('[api/friendships] POST error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const personId = searchParams.get('personId')
  const friendId = searchParams.get('friendId')
  if (!personId || !friendId) {
    return NextResponse.json({ error: 'personId and friendId are required' }, { status: 400 })
  }
  const ok = await removeFriend(personId, friendId)
  if (!ok) return NextResponse.json({ error: '删除失败' }, { status: 500 })
  return NextResponse.json({ success: true })
}
