import pool, { isDbReady } from './db'
import type { Project, ProjectMilestone, ProjectLog, ProjectFile, ProjectReview } from './projectTypes'

export * from './projectTypes'

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function listProjects(personId: string): Promise<Project[]> {
  if (!isDbReady) return []
  const { rows } = await pool.query(
    'SELECT * FROM public.projects WHERE creator_person_id=$1 OR partner_person_id=$1 ORDER BY updated_at DESC',
    [personId]
  )
  return rows as Project[]
}

export async function getProject(id: string): Promise<Project | null> {
  if (!isDbReady) return null
  const { rows } = await pool.query('SELECT * FROM public.projects WHERE id=$1', [id])
  return (rows[0] as Project) ?? null
}

export async function createProject(
  payload: Omit<Project, 'id' | 'created_at' | 'updated_at'>
): Promise<Project | null> {
  if (!isDbReady) return null
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
  if (!isDbReady) return false
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
  if (!isDbReady) return false
  await pool.query('DELETE FROM public.projects WHERE id=$1', [id])
  return true
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export async function listMilestones(projectId: string): Promise<ProjectMilestone[]> {
  if (!isDbReady) return []
  const { rows } = await pool.query(
    'SELECT * FROM public.project_milestones WHERE project_id=$1 ORDER BY planned_date ASC',
    [projectId]
  )
  return rows as ProjectMilestone[]
}

export async function upsertMilestone(
  milestone: Omit<ProjectMilestone, 'id' | 'created_at'> & { id?: string }
): Promise<boolean> {
  if (!isDbReady) return false
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
  if (!isDbReady || milestones.length === 0) return true
  for (const m of milestones) await upsertMilestone(m)
  return true
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export async function listLogs(projectId: string): Promise<ProjectLog[]> {
  if (!isDbReady) return []
  const { rows } = await pool.query(
    'SELECT * FROM public.project_logs WHERE project_id=$1 ORDER BY created_at ASC',
    [projectId]
  )
  return rows as ProjectLog[]
}

export async function addLog(
  log: Omit<ProjectLog, 'id' | 'created_at'>
): Promise<ProjectLog | null> {
  if (!isDbReady) return null
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
  if (!isDbReady) return []
  const { rows } = await pool.query(
    'SELECT * FROM public.project_files WHERE project_id=$1 ORDER BY created_at DESC',
    [projectId]
  )
  return rows as ProjectFile[]
}

export async function addFile(
  file: Omit<ProjectFile, 'id' | 'created_at'>
): Promise<ProjectFile | null> {
  if (!isDbReady) return null
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
  if (!isDbReady) return false
  await pool.query('DELETE FROM public.project_files WHERE id=$1', [id])
  return true
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export async function listReviews(projectId: string): Promise<ProjectReview[]> {
  if (!isDbReady) return []
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
  if (!isDbReady) return null
  const { rows } = await pool.query(
    'SELECT * FROM public.project_reviews WHERE project_id=$1 AND reviewer_person_id=$2',
    [projectId, reviewerPersonId]
  )
  return (rows[0] as ProjectReview) ?? null
}

export async function addReview(
  review: Omit<ProjectReview, 'id' | 'created_at'>
): Promise<ProjectReview | null> {
  if (!isDbReady) return null
  const id = crypto.randomUUID()
  const { rows } = await pool.query(
    `INSERT INTO public.project_reviews (id, project_id, reviewer_person_id, reviewee_person_id, tags, comment)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [id, review.project_id, review.reviewer_person_id, review.reviewee_person_id,
     review.tags, review.comment ?? null]
  )
  return (rows[0] as ProjectReview) ?? null
}
