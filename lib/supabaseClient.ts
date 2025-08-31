import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const isSupabaseReady = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseReady
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as any)


