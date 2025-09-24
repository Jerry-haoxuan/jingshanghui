import { supabase, isSupabaseReady } from './supabaseClient'
import type { PersonData, CompanyData } from './dataStore'

// Helpers to map fields between app types and DB rows
type DbPerson = {
  id: string
  name: string
  company: string
  position: string
  tags: string[] | null
  current_city: string | null
  hometown: string | null
  home_address: string | null
  company_address: string | null
  industry: string | null
  is_followed: boolean | null
  phone: string | null
  phones: any | null
  email: string | null
  political_party: string | null
  social_organizations: any | null
  hobbies: string | null
  skills: string | null
  expectations: string | null
  educations: any | null
  work_history: string | null
  additional_info: string | null
  all_companies: any | null
  birth_date: string | null
  school: string | null
  products: string | null
  created_at?: string
}

type DbCompany = {
  id: string
  name: string
  industry: string | null
  scale: string | null
  products: string[] | null
  is_followed: boolean | null
  additional_info: string | null
  positioning: string | null
  value: string | null
  achievements: string | null
  suppliers: string[] | null
  customers: string[] | null
  supplier_infos: any | null
  customer_infos: any | null
  demands: string | null
  created_at?: string
}

const mapDbPersonToApp = (row: DbPerson): PersonData => ({
  id: row.id,
  name: row.name,
  birthDate: row.birth_date ?? undefined,
  company: row.company,
  position: row.position,
  allCompanies: (row.all_companies as PersonData['allCompanies']) ?? undefined,
  phones: (row.phones as string[] | undefined) ?? undefined,
  phone: row.phone ?? undefined,
  email: row.email ?? undefined,
  politicalParty: row.political_party ?? undefined,
  socialOrganizations: (row.social_organizations as string[] | undefined) ?? undefined,
  hobbies: row.hobbies ?? undefined,
  skills: row.skills ?? undefined,
  expectations: row.expectations ?? undefined,
  educations: (row.educations as PersonData['educations']) ?? undefined,
  school: row.school ?? undefined,
  tags: row.tags ?? [],
  location: row.current_city || row.hometown || '未知',
  currentCity: row.current_city ?? undefined,
  hometown: row.hometown ?? undefined,
  homeAddress: row.home_address ?? undefined,
  companyAddress: row.company_address ?? undefined,
  industry: row.industry ?? undefined,
  isFollowed: Boolean(row.is_followed),
  workHistory: row.work_history ?? undefined,
  additionalInfo: row.additional_info ?? undefined,
  products: row.products ?? undefined,
})

const mapAppPersonToDb = (p: PersonData): DbPerson => ({
  id: p.id,
  name: p.name,
  company: p.company,
  position: p.position,
  tags: p.tags ?? [],
  current_city: p.currentCity ?? null,
  hometown: p.hometown ?? null,
  home_address: p.homeAddress ?? null,
  company_address: p.companyAddress ?? null,
  industry: p.industry ?? null,
  is_followed: Boolean(p.isFollowed),
  phone: p.phone ?? null,
  phones: p.phones ?? null,
  email: p.email ?? null,
  political_party: p.politicalParty ?? null,
  social_organizations: p.socialOrganizations ?? null,
  hobbies: p.hobbies ?? null,
  skills: p.skills ?? null,
  expectations: p.expectations ?? null,
  educations: p.educations ?? null,
  work_history: p.workHistory ?? null,
  additional_info: p.additionalInfo ?? null,
  all_companies: p.allCompanies ?? null,
  birth_date: p.birthDate ?? null,
  school: p.school ?? null,
  products: p.products ?? null,
})

const mapDbCompanyToApp = (row: DbCompany): CompanyData => ({
  id: row.id,
  name: row.name,
  industry: row.industry ?? '',
  scale: row.scale ?? '',
  products: row.products ?? [],
  isFollowed: Boolean(row.is_followed),
  additionalInfo: row.additional_info ?? undefined,
  positioning: row.positioning ?? undefined,
  value: row.value ?? undefined,
  achievements: row.achievements ?? undefined,
  suppliers: row.suppliers ?? undefined,
  customers: row.customers ?? undefined,
  supplierInfos: (row.supplier_infos as CompanyData['supplierInfos']) ?? undefined,
  customerInfos: (row.customer_infos as CompanyData['customerInfos']) ?? undefined,
  demands: row.demands ?? undefined,
})

const mapAppCompanyToDb = (c: CompanyData): DbCompany => ({
  id: c.id,
  name: c.name,
  industry: c.industry ?? null,
  scale: c.scale ?? null,
  products: c.products ?? null,
  is_followed: Boolean(c.isFollowed),
  additional_info: c.additionalInfo ?? null,
  positioning: (c as any).positioning ?? null,
  value: (c as any).value ?? null,
  achievements: (c as any).achievements ?? null,
  suppliers: (c as any).suppliers ?? null,
  customers: (c as any).customers ?? null,
  supplier_infos: (c as any).supplierInfos ?? null,
  customer_infos: (c as any).customerInfos ?? null,
  demands: (c as any).demands ?? null,
})

export async function listPeopleFromCloud(): Promise<PersonData[]> {
  if (!isSupabaseReady) return []
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as DbPerson[]).map(mapDbPersonToApp)
}

export async function upsertPersonToCloud(person: PersonData): Promise<void> {
  if (!isSupabaseReady) {
    console.warn('[CloudStore] Supabase未配置，跳过云端同步')
    return
  }
  
  console.log('[CloudStore] 准备同步人物到云端:', {
    id: person.id,
    name: person.name,
    isUpdate: Boolean(person.id)
  })
  const row = mapAppPersonToDb(person)
  console.log('[CloudStore] 转换后的数据行ID:', row.id)
  
  try {
    // 使用 upsert 时，确保指定冲突处理
    const { data, error } = await supabase
      .from('people')
      .upsert(row, { 
        onConflict: 'id',  // 明确指定以 id 为冲突判断字段
        ignoreDuplicates: false  // 确保更新而不是忽略
      })
      .select()
    
    if (error) {
      console.error('[CloudStore] Supabase upsert失败:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        rowId: row.id
      })
      throw error
    }
    
    console.log('[CloudStore] 成功同步到云端:', data)
  } catch (err) {
    console.error('[CloudStore] 同步异常:', err)
    throw err
  }
}

export async function deletePersonFromCloud(id: string): Promise<void> {
  if (!isSupabaseReady) return
  const { error } = await supabase.from('people').delete().eq('id', id)
  if (error) throw error
}

export async function setPersonFollowInCloud(id: string, isFollowed: boolean): Promise<void> {
  if (!isSupabaseReady) return
  const { error } = await supabase.from('people').update({ is_followed: isFollowed }).eq('id', id)
  if (error) throw error
}

export async function listCompaniesFromCloud(): Promise<CompanyData[]> {
  if (!isSupabaseReady) return []
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as DbCompany[]).map(mapDbCompanyToApp)
}

export async function upsertCompanyToCloud(company: CompanyData): Promise<void> {
  if (!isSupabaseReady) return
  const row = mapAppCompanyToDb(company)
  const { error } = await supabase.from('companies').upsert(row)
  if (error) throw error
}

export async function deleteCompanyFromCloud(id: string): Promise<void> {
  if (!isSupabaseReady) return
  const { error } = await supabase.from('companies').delete().eq('id', id)
  if (error) throw error
}

export async function setCompanyFollowInCloud(id: string, isFollowed: boolean): Promise<void> {
  if (!isSupabaseReady) return
  const { error } = await supabase.from('companies').update({ is_followed: isFollowed }).eq('id', id)
  if (error) throw error
}

export function subscribeCloud(table: 'people' | 'companies', onChange: () => void) {
  if (!isSupabaseReady) return { unsubscribe: () => {} }
  const channel = supabase
    .channel(`public:${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
      onChange()
    })
    .subscribe()
  return {
    unsubscribe: () => {
      try { supabase.removeChannel(channel) } catch (_) {}
    }
  }
}


