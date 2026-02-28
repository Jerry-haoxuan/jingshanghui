import { supabase, isSupabaseReady } from './supabaseClient'

export interface Friendship {
  id: string
  person_id_1: string
  person_id_2: string
  created_at: string
}

// 标准化存储：始终以较小的 id 在前，保证唯一性
function normalize(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

export async function listFriends(personId: string): Promise<string[]> {
  if (!isSupabaseReady) return []
  const { data, error } = await supabase
    .from('friendships')
    .select('person_id_1, person_id_2')
    .or(`person_id_1.eq.${personId},person_id_2.eq.${personId}`)
  if (error) {
    console.error('[friendshipStore] listFriends error:', error)
    return []
  }
  return (data ?? []).map((row: { person_id_1: string; person_id_2: string }) =>
    row.person_id_1 === personId ? row.person_id_2 : row.person_id_1
  )
}

export async function addFriend(personId: string, friendId: string): Promise<boolean> {
  if (!isSupabaseReady) return false
  const [id1, id2] = normalize(personId, friendId)
  const { error } = await supabase
    .from('friendships')
    .upsert([{ person_id_1: id1, person_id_2: id2 }], { onConflict: 'person_id_1,person_id_2' })
  if (error) {
    console.error('[friendshipStore] addFriend error:', error)
    return false
  }
  return true
}

export async function removeFriend(personId: string, friendId: string): Promise<boolean> {
  if (!isSupabaseReady) return false
  const [id1, id2] = normalize(personId, friendId)
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('person_id_1', id1)
    .eq('person_id_2', id2)
  if (error) {
    console.error('[friendshipStore] removeFriend error:', error)
    return false
  }
  return true
}

export async function isFriend(personId: string, friendId: string): Promise<boolean> {
  if (!isSupabaseReady) return false
  const [id1, id2] = normalize(personId, friendId)
  const { data, error } = await supabase
    .from('friendships')
    .select('id')
    .eq('person_id_1', id1)
    .eq('person_id_2', id2)
    .single()
  if (error) return false
  return !!data
}
