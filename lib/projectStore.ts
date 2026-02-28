import { supabase, isSupabaseReady } from './supabaseClient'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProjectStatus = 'in_progress' | 'pending' | 'completed' | 'terminated'

export type ProjectStage =
  | 'initiation'
  | 'first_visit'
  | 'negotiation'
  | 'deal_or_terminate'
  | 'contract'
  | 'payment'
  | 'review_archive'

export type LogType = 'system' | 'message' | 'stage_change' | 'file' | 'ai'

export interface Project {
  id: string
  name: string
  description?: string
  status: ProjectStatus
  current_stage: ProjectStage
  creator_person_id: string
  partner_person_id: string
  termination_category?: string
  termination_reason?: string
  created_at: string
  updated_at: string
}

export interface ProjectMilestone {
  id: string
  project_id: string
  stage: string
  planned_date?: string
  completed_date?: string
  reminder_days?: number
  notes?: string
  created_at: string
}

export interface ProjectLog {
  id: string
  project_id: string
  log_type: LogType
  content: string
  author_person_id?: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface ProjectFile {
  id: string
  project_id: string
  file_name: string
  file_url?: string
  file_type?: string
  uploaded_by_person_id?: string
  created_at: string
}

export interface ProjectReview {
  id: string
  project_id: string
  reviewer_person_id: string
  reviewee_person_id: string
  tags: string[]
  comment?: string
  created_at: string
}

// ─── Stage labels ─────────────────────────────────────────────────────────────

export const STAGE_LABELS: Record<ProjectStage, string> = {
  initiation: '立项',
  first_visit: '初次访问',
  negotiation: '谈判中',
  deal_or_terminate: '成交/终止',
  contract: '合同签订',
  payment: '收款',
  review_archive: '点评归档',
}

export const STAGE_ORDER: ProjectStage[] = [
  'initiation',
  'first_visit',
  'negotiation',
  'deal_or_terminate',
  'contract',
  'payment',
  'review_archive',
]

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  in_progress: '进行中',
  pending: '待定',
  completed: '已完成',
  terminated: '已终止',
}

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  in_progress: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  terminated: 'bg-red-100 text-red-700',
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function listProjects(personId: string): Promise<Project[]> {
  if (!isSupabaseReady) return []
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .or(`creator_person_id.eq.${personId},partner_person_id.eq.${personId}`)
    .order('updated_at', { ascending: false })
  if (error) {
    console.error('[projectStore] listProjects error:', error)
    return []
  }
  return (data ?? []) as Project[]
}

export async function getProject(id: string): Promise<Project | null> {
  if (!isSupabaseReady) return null
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()
  if (error) {
    console.error('[projectStore] getProject error:', error)
    return null
  }
  return data as Project
}

export async function createProject(
  payload: Omit<Project, 'id' | 'created_at' | 'updated_at'>
): Promise<Project | null> {
  if (!isSupabaseReady) return null
  const { data, error } = await supabase
    .from('projects')
    .insert([{ ...payload, updated_at: new Date().toISOString() }])
    .select()
    .single()
  if (error) {
    console.error('[projectStore] createProject error:', error)
    return null
  }
  return data as Project
}

export async function updateProject(
  id: string,
  payload: Partial<Omit<Project, 'id' | 'created_at'>>
): Promise<boolean> {
  if (!isSupabaseReady) return false
  const { error } = await supabase
    .from('projects')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) {
    console.error('[projectStore] updateProject error:', error)
    return false
  }
  return true
}

export async function deleteProject(id: string): Promise<boolean> {
  if (!isSupabaseReady) return false
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) {
    console.error('[projectStore] deleteProject error:', error)
    return false
  }
  return true
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export async function listMilestones(projectId: string): Promise<ProjectMilestone[]> {
  if (!isSupabaseReady) return []
  const { data, error } = await supabase
    .from('project_milestones')
    .select('*')
    .eq('project_id', projectId)
    .order('planned_date', { ascending: true })
  if (error) {
    console.error('[projectStore] listMilestones error:', error)
    return []
  }
  return (data ?? []) as ProjectMilestone[]
}

export async function upsertMilestone(
  milestone: Omit<ProjectMilestone, 'id' | 'created_at'> & { id?: string }
): Promise<boolean> {
  if (!isSupabaseReady) return false
  const { error } = await supabase.from('project_milestones').upsert([milestone])
  if (error) {
    console.error('[projectStore] upsertMilestone error:', error)
    return false
  }
  return true
}

export async function batchUpsertMilestones(
  milestones: (Omit<ProjectMilestone, 'id' | 'created_at'> & { id?: string })[]
): Promise<boolean> {
  if (!isSupabaseReady || milestones.length === 0) return true
  const { error } = await supabase.from('project_milestones').upsert(milestones)
  if (error) {
    console.error('[projectStore] batchUpsertMilestones error:', error)
    return false
  }
  return true
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export async function listLogs(projectId: string): Promise<ProjectLog[]> {
  if (!isSupabaseReady) return []
  const { data, error } = await supabase
    .from('project_logs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (error) {
    console.error('[projectStore] listLogs error:', error)
    return []
  }
  return (data ?? []) as ProjectLog[]
}

export async function addLog(
  log: Omit<ProjectLog, 'id' | 'created_at'>
): Promise<ProjectLog | null> {
  if (!isSupabaseReady) return null
  const { data, error } = await supabase
    .from('project_logs')
    .insert([log])
    .select()
    .single()
  if (error) {
    console.error('[projectStore] addLog error:', error)
    return null
  }
  return data as ProjectLog
}

// ─── Files ────────────────────────────────────────────────────────────────────

export async function listFiles(projectId: string): Promise<ProjectFile[]> {
  if (!isSupabaseReady) return []
  const { data, error } = await supabase
    .from('project_files')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[projectStore] listFiles error:', error)
    return []
  }
  return (data ?? []) as ProjectFile[]
}

export async function addFile(
  file: Omit<ProjectFile, 'id' | 'created_at'>
): Promise<ProjectFile | null> {
  if (!isSupabaseReady) return null
  const { data, error } = await supabase
    .from('project_files')
    .insert([file])
    .select()
    .single()
  if (error) {
    console.error('[projectStore] addFile error:', error)
    return null
  }
  return data as ProjectFile
}

export async function deleteFile(id: string): Promise<boolean> {
  if (!isSupabaseReady) return false
  const { error } = await supabase.from('project_files').delete().eq('id', id)
  if (error) {
    console.error('[projectStore] deleteFile error:', error)
    return false
  }
  return true
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export async function listReviews(projectId: string): Promise<ProjectReview[]> {
  if (!isSupabaseReady) return []
  const { data, error } = await supabase
    .from('project_reviews')
    .select('*')
    .eq('project_id', projectId)
  if (error) {
    console.error('[projectStore] listReviews error:', error)
    return []
  }
  return (data ?? []) as ProjectReview[]
}

export async function getReview(
  projectId: string,
  reviewerPersonId: string
): Promise<ProjectReview | null> {
  if (!isSupabaseReady) return null
  const { data, error } = await supabase
    .from('project_reviews')
    .select('*')
    .eq('project_id', projectId)
    .eq('reviewer_person_id', reviewerPersonId)
    .single()
  if (error) return null
  return data as ProjectReview
}

export async function addReview(
  review: Omit<ProjectReview, 'id' | 'created_at'>
): Promise<ProjectReview | null> {
  if (!isSupabaseReady) return null
  const { data, error } = await supabase
    .from('project_reviews')
    .insert([review])
    .select()
    .single()
  if (error) {
    console.error('[projectStore] addReview error:', error)
    return null
  }
  return data as ProjectReview
}
