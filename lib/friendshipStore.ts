import pool from './db'

const isReady = Boolean(process.env.DATABASE_URL)

export interface Friendship {
  id: string
  person_id_1: string
  person_id_2: string
  created_at: string
}

function normalize(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

export async function listFriends(personId: string): Promise<string[]> {
  if (!isReady) return []
  const { rows } = await pool.query(
    'SELECT person_id_1, person_id_2 FROM public.friendships WHERE person_id_1=$1 OR person_id_2=$1',
    [personId]
  )
  return rows.map((row: { person_id_1: string; person_id_2: string }) =>
    row.person_id_1 === personId ? row.person_id_2 : row.person_id_1
  )
}

export async function addFriend(personId: string, friendId: string): Promise<boolean> {
  if (!isReady) return false
  const [id1, id2] = normalize(personId, friendId)
  await pool.query(
    `INSERT INTO public.friendships (person_id_1, person_id_2)
     VALUES ($1,$2) ON CONFLICT (person_id_1, person_id_2) DO NOTHING`,
    [id1, id2]
  )
  return true
}

export async function removeFriend(personId: string, friendId: string): Promise<boolean> {
  if (!isReady) return false
  const [id1, id2] = normalize(personId, friendId)
  await pool.query(
    'DELETE FROM public.friendships WHERE person_id_1=$1 AND person_id_2=$2',
    [id1, id2]
  )
  return true
}

export async function isFriend(personId: string, friendId: string): Promise<boolean> {
  if (!isReady) return false
  const [id1, id2] = normalize(personId, friendId)
  const { rows } = await pool.query(
    'SELECT id FROM public.friendships WHERE person_id_1=$1 AND person_id_2=$2',
    [id1, id2]
  )
  return rows.length > 0
}
