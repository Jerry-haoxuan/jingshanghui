import pool from './db'

const isReady = Boolean(process.env.DATABASE_URL)

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
  if (!isReady) return []
  const { rows } = await pool.query(
    'SELECT * FROM public.projects WHERE creator_person_id=$1 OR partner_person_id=$1 ORDER BY updated_at DESC',
    [personId]
  )
  return rows as Project[]
}

export async function getProject(id: string): Promise<Project | null> {
  if (!isReady) return null
  const { rows } = await pool.query('SELECT * FROM public.projects WHERE id=$1', [id])
  return (rows[0] as Project) ?? null
}

export async function createProject(
  payload: Omit<Project, 'id' | 'created_at' | 'updated_at'>
): Promise<Project | null> {
  if (!isReady) return null
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  const { rows } = await pool.query(
    `INSERT INTO public.projects (id, name, description, status, current_stage, creator_person_id, partner_person_id, termination_category, termination_reason, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [id, payload.name, payload.description ?? null, payload.status, payload.current_stage,
     payload.creator_person_id, payload.partner_person_id,
     payload.termination_category ?? null, payload.termination_reason ?? null, now, now]
  )
  return (rows[0] as Project) ?? null
}

export async function updateProject(
  id: string,
  payload: Partial<Omit<Project, 'id' | 'created_at'>>
): Promise<boolean> {
  if (!isReady) return false
  const fields = Object.keys(payload).filter(k => k !== 'id' && k !== 'created_at')
  if (fields.length === 0) return true
  const sets = fields.map((f, i) => `${f}=$${i + 2}`).join(', ')
  const values = fields.map(f => (payload as any)[f])
  await pool.query(
    `UPDATE public.projects SET ${sets}, updated_at=now() WHERE id=$1`,
    [id, ...values]
  )
  return true
}

export async function deleteProject(id: string): Promise<boolean> {
  if (!isReady) return false
  await pool.query('DELETE FROM public.projects WHERE id=$1', [id])
  return true
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export async function listMilestones(projectId: string): Promise<ProjectMilestone[]> {
  if (!isReady) return []
  const { rows } = await pool.query(
    'SELECT * FROM public.project_milestones WHERE project_id=$1 ORDER BY planned_date ASC',
    [projectId]
  )
  return rows as ProjectMilestone[]
}

export async function upsertMilestone(
  milestone: Omit<ProjectMilestone, 'id' | 'created_at'> & { id?: string }
): Promise<boolean> {
  if (!isReady) return false
  const id = milestone.id ?? crypto.randomUUID()
  await pool.query(
    `INSERT INTO public.project_milestones (id, project_id, stage, planned_date, completed_date, reminder_days, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (id) DO UPDATE SET stage=EXCLUDED.stage, planned_date=EXCLUDED.planned_date,
       completed_date=EXCLUDED.completed_date, reminder_days=EXCLUDED.reminder_days, notes=EXCLUDED.notes`,
    [id, milestone.project_id, milestone.stage, milestone.planned_date ?? null,
     milestone.completed_date ?? null, milestone.reminder_days ?? null, milestone.notes ?? null]
  )
  return true
}

export async function batchUpsertMilestones(
  milestones: (Omit<ProjectMilestone, 'id' | 'created_at'> & { id?: string })[]
): Promise<boolean> {
  if (!isReady || milestones.length === 0) return true
  for (const m of milestones) await upsertMilestone(m)
  return true
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export async function listLogs(projectId: string): Promise<ProjectLog[]> {
  if (!isReady) return []
  const { rows } = await pool.query(
    'SELECT * FROM public.project_logs WHERE project_id=$1 ORDER BY created_at ASC',
    [projectId]
  )
  return rows as ProjectLog[]
}

export async function addLog(
  log: Omit<ProjectLog, 'id' | 'created_at'>
): Promise<ProjectLog | null> {
  if (!isReady) return null
  const id = crypto.randomUUID()
  const { rows } = await pool.query(
    `INSERT INTO public.project_logs (id, project_id, log_type, content, author_person_id, metadata)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [id, log.project_id, log.log_type, log.content, log.author_person_id ?? null,
     log.metadata ? JSON.stringify(log.metadata) : null]
  )
  return (rows[0] as ProjectLog) ?? null
}

// ─── Files ────────────────────────────────────────────────────────────────────

export async function listFiles(projectId: string): Promise<ProjectFile[]> {
  if (!isReady) return []
  const { rows } = await pool.query(
    'SELECT * FROM public.project_files WHERE project_id=$1 ORDER BY created_at DESC',
    [projectId]
  )
  return rows as ProjectFile[]
}

export async function addFile(
  file: Omit<ProjectFile, 'id' | 'created_at'>
): Promise<ProjectFile | null> {
  if (!isReady) return null
  const id = crypto.randomUUID()
  const { rows } = await pool.query(
    `INSERT INTO public.project_files (id, project_id, file_name, file_url, file_type, uploaded_by_person_id)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [id, file.project_id, file.file_name, file.file_url ?? null,
     file.file_type ?? null, file.uploaded_by_person_id ?? null]
  )
  return (rows[0] as ProjectFile) ?? null
}

export async function deleteFile(id: string): Promise<boolean> {
  if (!isReady) return false
  await pool.query('DELETE FROM public.project_files WHERE id=$1', [id])
  return true
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export async function listReviews(projectId: string): Promise<ProjectReview[]> {
  if (!isReady) return []
  const { rows } = await pool.query(
    'SELECT * FROM public.project_reviews WHERE project_id=$1',
    [projectId]
  )
  return rows as ProjectReview[]
}

export async function getReview(
  projectId: string,
  reviewerPersonId: string
): Promise<ProjectReview | null> {
  if (!isReady) return null
  const { rows } = await pool.query(
    'SELECT * FROM public.project_reviews WHERE project_id=$1 AND reviewer_person_id=$2',
    [projectId, reviewerPersonId]
  )
  return (rows[0] as ProjectReview) ?? null
}

export async function addReview(
  review: Omit<ProjectReview, 'id' | 'created_at'>
): Promise<ProjectReview | null> {
  if (!isReady) return null
  const id = crypto.randomUUID()
  const { rows } = await pool.query(
    `INSERT INTO public.project_reviews (id, project_id, reviewer_person_id, reviewee_person_id, tags, comment)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [id, review.project_id, review.reviewer_person_id, review.reviewee_person_id,
     review.tags, review.comment ?? null]
  )
  return (rows[0] as ProjectReview) ?? null
}
