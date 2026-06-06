import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

const isDbReady = Boolean(process.env.DATABASE_URL)

type DbPerson = {
  id: string
  name: string
  company: string
  position: string
  tags: string[] | null
  current_city: string | null
  industry: string | null
  is_followed: boolean | null
  phone: string | null
  email: string | null
}

const mapRow = (row: DbPerson) => ({
  id: row.id,
  name: row.name,
  company: row.company,
  position: row.position,
  tags: row.tags ?? [],
  location: row.current_city ?? '未知',
  currentCity: row.current_city ?? undefined,
  industry: row.industry ?? undefined,
  isFollowed: Boolean(row.is_followed),
  phone: row.phone ?? undefined,
  email: row.email ?? undefined,
})

/**
 * GET /api/people
 * 返回 public.people 表中的所有人员记录。
 * 同时兼顾已注册但尚未产生 people 记录的用户：
 * 如果传入 ?ensureName=xxx，会自动 find-or-create 该用户的记录。
 */
export async function GET(request: NextRequest) {
  if (!isDbReady) return NextResponse.json({ people: [] })

  const { searchParams } = new URL(request.url)
  const ensureName = searchParams.get('ensureName')

  // 若当前用户的 personName 在 people 表里不存在，则自动创建
  if (ensureName) {
    const { rows } = await pool.query(
      'SELECT id FROM public.people WHERE name = $1 LIMIT 1',
      [ensureName]
    )
    if (rows.length === 0) {
      const id = `person_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      await pool.query(
        `INSERT INTO public.people (id, name, company, position, tags, is_followed)
         VALUES ($1, $2, '', '', '{}', false)
         ON CONFLICT DO NOTHING`,
        [id, ensureName]
      )
    }
  }

  // 同步：把所有 user_accounts 中有 person_name 但在 people 表里还不存在的用户自动创建记录
  // 这样一来，只要有人访问商圈页，其他已注册但未访问的用户也会被创建出来
  try {
    const { rows: users } = await pool.query(
      `SELECT person_name FROM public.user_accounts
       WHERE person_name IS NOT NULL AND person_name <> ''`
    )
    for (const u of users) {
      const pname = u.person_name as string
      const { rows: existing } = await pool.query(
        'SELECT id FROM public.people WHERE name = $1 LIMIT 1',
        [pname]
      )
      if (existing.length === 0) {
        const id = `person_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        await pool.query(
          `INSERT INTO public.people (id, name, company, position, tags, is_followed)
           VALUES ($1, $2, '', '', '{}', false)
           ON CONFLICT DO NOTHING`,
          [id, pname]
        )
      }
    }
  } catch {
    // 自动创建失败不影响主流程
  }

  const { rows } = await pool.query(
    'SELECT id, name, company, position, tags, current_city, industry, is_followed, phone, email FROM public.people ORDER BY created_at DESC'
  )

  return NextResponse.json({ people: (rows as DbPerson[]).map(mapRow) })
}
