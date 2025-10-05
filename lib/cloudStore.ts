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
  if (!isSupabaseReady) {
    console.warn('[CloudStore] Supabase未配置，跳过企业云端同步')
    return
  }
  
  console.log('[CloudStore] 准备同步企业到云端:', {
    id: company.id,
    name: company.name,
    isUpdate: Boolean(company.id)
  })
  
  const row = mapAppCompanyToDb(company)
  console.log('[CloudStore] 转换后的企业数据行ID:', row.id, '名称:', row.name)
  
  try {
    // 先尝试查找是否已存在同名企业（使用名称作为唯一标识）
    const { data: existingCompanies, error: searchError } = await supabase
      .from('companies')
      .select('*')
      .eq('name', company.name)
      .limit(1)
    
    if (searchError) {
      console.error('[CloudStore] 查找现有企业失败:', searchError)
      throw searchError
    }
    
    if (existingCompanies && existingCompanies.length > 0) {
      // 如果存在同名企业，更新它（保留原有ID）
      const existingCompany = existingCompanies[0]
      console.log('[CloudStore] 找到现有企业，更新而非创建:', existingCompany.id, existingCompany.name)
      
      const { data, error: updateError } = await supabase
        .from('companies')
        .update({
          ...row,
          id: existingCompany.id // 保持原有ID
        })
        .eq('id', existingCompany.id)
        .select()
      
      if (updateError) {
        console.error('[CloudStore] 更新企业失败:', updateError)
        throw updateError
      }
      
      console.log('[CloudStore] 成功更新企业到云端:', data)
    } else {
      // 如果不存在，创建新企业
      console.log('[CloudStore] 未找到现有企业，创建新企业:', company.name)
      
      const { data, error: insertError } = await supabase
        .from('companies')
        .insert(row)
        .select()
      
      if (insertError) {
        console.error('[CloudStore] 创建企业失败:', insertError)
        throw insertError
      }
      
      console.log('[CloudStore] 成功创建新企业到云端:', data)
    }
  } catch (err) {
    console.error('[CloudStore] 企业同步异常:', err)
    throw err
  }
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

// ==================== 关系数据云端同步 ====================

import type { RelationshipData } from './relationshipManager'

type DbRelationship = {
  id: string
  person_id: string
  related_person_id: string | null
  related_company_id: string | null
  relationship_type: string
  strength: number | null
  description: string | null
  created_at?: string
  updated_at?: string
}

const mapDbRelationshipToApp = (row: DbRelationship): RelationshipData => ({
  id: row.id,
  personId: row.person_id,
  relatedPersonId: row.related_person_id ?? undefined,
  relatedCompanyId: row.related_company_id ?? undefined,
  relationshipType: row.relationship_type as 'colleague' | 'schoolmate' | 'industry_partner' | 'business_contact' | 'supplier' | 'customer' | 'superior' | 'subordinate',
  strength: row.strength ?? 0.5,
  description: row.description ?? '',
  createdAt: new Date(row.created_at ?? Date.now()),
  updatedAt: new Date(row.updated_at ?? Date.now()),
})

const mapAppRelationshipToDb = (rel: RelationshipData): DbRelationship => ({
  id: rel.id,
  person_id: rel.personId,
  related_person_id: rel.relatedPersonId ?? null,
  related_company_id: rel.relatedCompanyId ?? null,
  relationship_type: rel.relationshipType,
  strength: rel.strength,
  description: rel.description,
})

// 从云端加载所有关系数据
export async function listRelationshipsFromCloud(): Promise<RelationshipData[]> {
  if (!isSupabaseReady) return []
  const { data, error } = await supabase
    .from('relationships')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[CloudStore] 加载关系数据失败:', error)
    throw error
  }
  return (data as DbRelationship[]).map(mapDbRelationshipToApp)
}

// 上传单个关系到云端
export async function upsertRelationshipToCloud(relationship: RelationshipData): Promise<void> {
  if (!isSupabaseReady) {
    console.warn('[CloudStore] Supabase未配置，跳过关系数据云端同步')
    return
  }
  
  console.log('[CloudStore] 准备同步关系到云端:', {
    id: relationship.id,
    personId: relationship.personId,
    relatedPersonId: relationship.relatedPersonId,
    type: relationship.relationshipType
  })
  
  const row = mapAppRelationshipToDb(relationship)
  
  try {
    const { data, error } = await supabase
      .from('relationships')
      .upsert(row, { 
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
    
    if (error) {
      console.error('[CloudStore] Supabase关系数据upsert失败:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        rowId: row.id
      })
      throw error
    }
    
    console.log('[CloudStore] 成功同步关系到云端:', data)
  } catch (err) {
    console.error('[CloudStore] 关系数据同步异常:', err)
    throw err
  }
}

// 批量上传关系数据到云端
export async function batchUpsertRelationshipsToCloud(relationships: RelationshipData[]): Promise<void> {
  if (!isSupabaseReady) {
    console.warn('[CloudStore] Supabase未配置，跳过批量关系数据同步')
    return
  }
  
  if (relationships.length === 0) {
    console.log('[CloudStore] 没有关系数据需要同步')
    return
  }
  
  console.log('[CloudStore] 批量同步关系数据到云端:', relationships.length, '条')
  
  const rows = relationships.map(mapAppRelationshipToDb)
  
  try {
    // 分批上传，每次50条
    const batchSize = 50
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize)
      const { error } = await supabase
        .from('relationships')
        .upsert(batch, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
      
      if (error) {
        console.error('[CloudStore] 批量同步失败 (batch', Math.floor(i / batchSize) + 1, '):', error)
        throw error
      }
      
      console.log('[CloudStore] 成功同步批次', Math.floor(i / batchSize) + 1, '/', Math.ceil(rows.length / batchSize))
    }
    
    console.log('[CloudStore] 所有关系数据同步完成')
  } catch (err) {
    console.error('[CloudStore] 批量关系数据同步异常:', err)
    throw err
  }
}

// 删除云端关系数据
export async function deleteRelationshipFromCloud(id: string): Promise<void> {
  if (!isSupabaseReady) return
  const { error } = await supabase.from('relationships').delete().eq('id', id)
  if (error) throw error
}


