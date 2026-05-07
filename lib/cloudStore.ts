import pool from './db'
import type { PersonData, CompanyData } from './dataStore'

export const isSupabaseReady = Boolean(process.env.DATABASE_URL)

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
  const { rows } = await pool.query('SELECT * FROM public.people ORDER BY created_at DESC')
  return (rows as DbPerson[]).map(mapDbPersonToApp)
}

export async function upsertPersonToCloud(person: PersonData): Promise<void> {
  if (!isSupabaseReady) return
  const row = mapAppPersonToDb(person)
  await pool.query(
    `INSERT INTO public.people (id, name, company, position, tags, current_city, hometown, home_address, company_address, industry, is_followed, phone, phones, email, political_party, social_organizations, hobbies, skills, expectations, educations, work_history, additional_info, all_companies, birth_date, school, products)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
     ON CONFLICT (id) DO UPDATE SET
       name=EXCLUDED.name, company=EXCLUDED.company, position=EXCLUDED.position, tags=EXCLUDED.tags,
       current_city=EXCLUDED.current_city, hometown=EXCLUDED.hometown, home_address=EXCLUDED.home_address,
       company_address=EXCLUDED.company_address, industry=EXCLUDED.industry, is_followed=EXCLUDED.is_followed,
       phone=EXCLUDED.phone, phones=EXCLUDED.phones, email=EXCLUDED.email, political_party=EXCLUDED.political_party,
       social_organizations=EXCLUDED.social_organizations, hobbies=EXCLUDED.hobbies, skills=EXCLUDED.skills,
       expectations=EXCLUDED.expectations, educations=EXCLUDED.educations, work_history=EXCLUDED.work_history,
       additional_info=EXCLUDED.additional_info, all_companies=EXCLUDED.all_companies, birth_date=EXCLUDED.birth_date,
       school=EXCLUDED.school, products=EXCLUDED.products`,
    [row.id, row.name, row.company, row.position, row.tags, row.current_city, row.hometown,
     row.home_address, row.company_address, row.industry, row.is_followed, row.phone,
     row.phones ? JSON.stringify(row.phones) : null, row.email, row.political_party,
     row.social_organizations ? JSON.stringify(row.social_organizations) : null,
     row.hobbies, row.skills, row.expectations,
     row.educations ? JSON.stringify(row.educations) : null,
     row.work_history, row.additional_info,
     row.all_companies ? JSON.stringify(row.all_companies) : null,
     row.birth_date, row.school, row.products]
  )
}

export async function deletePersonFromCloud(id: string): Promise<void> {
  if (!isSupabaseReady) return
  await pool.query('DELETE FROM public.people WHERE id = $1', [id])
}

export async function setPersonFollowInCloud(id: string, isFollowed: boolean): Promise<void> {
  if (!isSupabaseReady) return
  await pool.query('UPDATE public.people SET is_followed = $1 WHERE id = $2', [isFollowed, id])
}

export async function listCompaniesFromCloud(): Promise<CompanyData[]> {
  if (!isSupabaseReady) return []
  const { rows } = await pool.query('SELECT * FROM public.companies ORDER BY created_at DESC')
  return (rows as DbCompany[]).map(mapDbCompanyToApp)
}

export async function upsertCompanyToCloud(company: CompanyData): Promise<void> {
  if (!isSupabaseReady) return
  const row = mapAppCompanyToDb(company)
  const { rows: existing } = await pool.query(
    'SELECT id FROM public.companies WHERE name = $1 LIMIT 1', [company.name]
  )
  if (existing.length > 0) {
    await pool.query(
      `UPDATE public.companies SET industry=$1, scale=$2, products=$3, is_followed=$4, additional_info=$5,
       positioning=$6, value=$7, achievements=$8, suppliers=$9, customers=$10,
       supplier_infos=$11, customer_infos=$12, demands=$13 WHERE id=$14`,
      [row.industry, row.scale, row.products, row.is_followed, row.additional_info,
       row.positioning, row.value, row.achievements, row.suppliers, row.customers,
       row.supplier_infos ? JSON.stringify(row.supplier_infos) : null,
       row.customer_infos ? JSON.stringify(row.customer_infos) : null,
       row.demands, existing[0].id]
    )
  } else {
    await pool.query(
      `INSERT INTO public.companies (id, name, industry, scale, products, is_followed, additional_info, positioning, value, achievements, suppliers, customers, supplier_infos, customer_infos, demands)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [row.id, row.name, row.industry, row.scale, row.products, row.is_followed, row.additional_info,
       row.positioning, row.value, row.achievements, row.suppliers, row.customers,
       row.supplier_infos ? JSON.stringify(row.supplier_infos) : null,
       row.customer_infos ? JSON.stringify(row.customer_infos) : null,
       row.demands]
    )
  }
}

export async function deleteCompanyFromCloud(id: string): Promise<void> {
  if (!isSupabaseReady) return
  await pool.query('DELETE FROM public.companies WHERE id = $1', [id])
}

export async function setCompanyFollowInCloud(id: string, isFollowed: boolean): Promise<void> {
  if (!isSupabaseReady) return
  await pool.query('UPDATE public.companies SET is_followed = $1 WHERE id = $2', [isFollowed, id])
}

export function subscribeCloud(_table: 'people' | 'companies', _onChange: () => void) {
  return { unsubscribe: () => {} }
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

export async function listRelationshipsFromCloud(): Promise<RelationshipData[]> {
  if (!isSupabaseReady) return []
  const { rows } = await pool.query('SELECT * FROM public.relationships ORDER BY created_at DESC')
  return (rows as DbRelationship[]).map(mapDbRelationshipToApp)
}

export async function upsertRelationshipToCloud(relationship: RelationshipData): Promise<void> {
  if (!isSupabaseReady) return
  const row = mapAppRelationshipToDb(relationship)
  await pool.query(
    `INSERT INTO public.relationships (id, person_id, related_person_id, related_company_id, relationship_type, strength, description)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (id) DO UPDATE SET
       person_id=EXCLUDED.person_id, related_person_id=EXCLUDED.related_person_id,
       related_company_id=EXCLUDED.related_company_id, relationship_type=EXCLUDED.relationship_type,
       strength=EXCLUDED.strength, description=EXCLUDED.description, updated_at=now()`,
    [row.id, row.person_id, row.related_person_id, row.related_company_id,
     row.relationship_type, row.strength, row.description]
  )
}

export async function batchUpsertRelationshipsToCloud(relationships: RelationshipData[]): Promise<void> {
  if (!isSupabaseReady || relationships.length === 0) return
  for (const rel of relationships) {
    await upsertRelationshipToCloud(rel)
  }
}

export async function deleteRelationshipFromCloud(id: string): Promise<void> {
  if (!isSupabaseReady) return
  await pool.query('DELETE FROM public.relationships WHERE id = $1', [id])
}
