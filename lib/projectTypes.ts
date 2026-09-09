// 项目（商机）模块的类型与展示常量。与 projectStore.ts 分离是为了让客户端组件
// 只引入纯类型/常量，不把 pg 数据库驱动一并打进浏览器 bundle。

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
