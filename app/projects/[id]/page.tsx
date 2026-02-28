'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  Loader2,
  Paperclip,
  Upload,
  Trash2,
  FileText,
  Star,
  XCircle,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import {
  Project,
  ProjectLog,
  ProjectFile,
  ProjectReview,
  ProjectMilestone,
  STAGE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  ProjectStage,
  ProjectStatus,
  updateProject,
  listMilestones,
} from '@/lib/projectStore'
import { getCurrentUser } from '@/lib/userStore'
import { listPeopleFromCloud } from '@/lib/cloudStore'
import { PersonData } from '@/lib/dataStore'
import { isManager } from '@/lib/userRole'
import { getUserRole } from '@/lib/userRole'
import { deterministicAliasName } from '@/lib/deterministicNameAlias'
import StageProgress from '@/components/projects/StageProgress'
import ProjectTimeline from '@/components/projects/ProjectTimeline'
import AiPanel from '@/components/projects/AiPanel'
import ReviewModal from '@/components/projects/ReviewModal'

const TERMINATION_CATEGORIES = ['价格谈不拢', '需求不匹配', '时机不成熟', '对方失联', '内部原因', '其他']

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [logs, setLogs] = useState<ProjectLog[]>([])
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [reviews, setReviews] = useState<ProjectReview[]>([])
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([])
  const [people, setPeople] = useState<PersonData[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPersonId, setCurrentPersonId] = useState<string | null>(null)
  const [currentPersonName, setCurrentPersonName] = useState('')
  const [userRole, setUserRole] = useState('member')

  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [hasReviewed, setHasReviewed] = useState(false)

  const [showTerminatePanel, setShowTerminatePanel] = useState(false)
  const [terminateCategory, setTerminateCategory] = useState('')
  const [terminateReason, setTerminateReason] = useState('')
  const [terminating, setTerminating] = useState(false)

  const [activeTab, setActiveTab] = useState<'timeline' | 'files' | 'milestones'>('timeline')

  const displayName = useCallback(
    (person: PersonData) => {
      if (isManager()) return person.name
      return deterministicAliasName(person.name)
    },
    []
  )

  const getPersonById = useCallback(
    (id: string) => people.find(p => p.id === id),
    [people]
  )

  const loadProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}`)
    if (!res.ok) { router.push('/projects'); return }
    const { project: data } = await res.json()
    setProject(data)
  }, [projectId, router])

  const loadLogs = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/logs`)
    const { logs: data } = await res.json()
    setLogs(data ?? [])
  }, [projectId])

  const loadFiles = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/files`)
    const { files: data } = await res.json()
    setFiles(data ?? [])
  }, [projectId])

  const loadReviews = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/reviews`)
    const { reviews: data } = await res.json()
    setReviews(data ?? [])
  }, [projectId])

  const loadMilestones = useCallback(async () => {
    const data = await listMilestones(projectId)
    setMilestones(data)
  }, [projectId])

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) { router.push('/'); return }
    const role = getUserRole() ?? 'member'
    setUserRole(role)

    const init = async () => {
      setLoading(true)
      const allPeople = await listPeopleFromCloud()
      setPeople(allPeople)
      const me = allPeople.find(p => p.name === currentUser.personName)
      if (me) {
        setCurrentPersonId(me.id)
        setCurrentPersonName(isManager() ? me.name : deterministicAliasName(me.name))
      }
      await Promise.all([loadProject(), loadLogs(), loadFiles(), loadReviews(), loadMilestones()])
      setLoading(false)
    }
    init()
  }, [loadFiles, loadLogs, loadMilestones, loadProject, loadReviews, router])

  useEffect(() => {
    if (currentPersonId) {
      fetch(`/api/projects/${projectId}/reviews?reviewerPersonId=${currentPersonId}`)
        .then(r => r.json())
        .then(({ review }) => setHasReviewed(!!review))
    }
  }, [currentPersonId, projectId])

  const handleSendMessage = async (content: string) => {
    if (!currentPersonId) return
    await fetch(`/api/projects/${projectId}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log_type: 'message', content, author_person_id: currentPersonId }),
    })
    await loadLogs()
  }

  const handleStageChange = async (newStage: ProjectStage, note: string) => {
    if (!project) return
    const oldLabel = STAGE_LABELS[project.current_stage as ProjectStage]
    const newLabel = STAGE_LABELS[newStage]

    await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_stage: newStage }),
    })
    await fetch(`/api/projects/${projectId}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        log_type: 'stage_change',
        content: `阶段从「${oldLabel}」推进到「${newLabel}」${note ? `。备注：${note}` : ''}`,
        author_person_id: currentPersonId ?? undefined,
      }),
    })
    await Promise.all([loadProject(), loadLogs()])
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await fetch(`/api/projects/${projectId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_name: file.name,
        file_type: file.type,
        uploaded_by_person_id: currentPersonId ?? undefined,
      }),
    })
    await fetch(`/api/projects/${projectId}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        log_type: 'file',
        content: `上传了文件：${file.name}`,
        author_person_id: currentPersonId ?? undefined,
      }),
    })
    await Promise.all([loadFiles(), loadLogs()])
    e.target.value = ''
  }

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!confirm(`确认删除文件「${fileName}」？`)) return
    await fetch(`/api/projects/${projectId}/files?fileId=${fileId}`, { method: 'DELETE' })
    await loadFiles()
  }

  const handleSubmitReview = async (tags: string[], comment: string) => {
    if (!project || !currentPersonId) return
    setReviewSubmitting(true)
    const partnerId =
      project.creator_person_id === currentPersonId
        ? project.partner_person_id
        : project.creator_person_id
    await fetch(`/api/projects/${projectId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviewer_person_id: currentPersonId,
        reviewee_person_id: partnerId,
        tags,
        comment,
      }),
    })
    setReviewSubmitting(false)
    setShowReviewModal(false)
    setHasReviewed(true)
    await loadReviews()
  }

  const handleTerminate = async () => {
    if (!terminateCategory) { alert('请选择终止原因类别'); return }
    setTerminating(true)
    await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'terminated',
        current_stage: 'deal_or_terminate',
        termination_category: terminateCategory,
        termination_reason: terminateReason || undefined,
      }),
    })
    await fetch(`/api/projects/${projectId}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        log_type: 'stage_change',
        content: `项目已终止。原因类别：${terminateCategory}${terminateReason ? `。说明：${terminateReason}` : ''}`,
        author_person_id: currentPersonId ?? undefined,
      }),
    })
    setTerminating(false)
    setShowTerminatePanel(false)
    await Promise.all([loadProject(), loadLogs()])
  }

  const handleComplete = async () => {
    if (!confirm('确认将项目标记为已完成？')) return
    await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', current_stage: 'review_archive' }),
    })
    await fetch(`/api/projects/${projectId}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        log_type: 'stage_change',
        content: '项目已完成，进入点评归档阶段。',
        author_person_id: currentPersonId ?? undefined,
      }),
    })
    await Promise.all([loadProject(), loadLogs()])
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!project) return null

  const partnerId =
    project.creator_person_id === currentPersonId
      ? project.partner_person_id
      : project.creator_person_id
  const partner = getPersonById(partnerId)
  const partnerDisplayName = partner ? displayName(partner) : '对方'
  const lastActivity = logs[logs.length - 1]?.created_at ?? project.created_at
  const isArchived = project.status === 'completed' || project.status === 'terminated'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/projects" className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-bold text-gray-900 text-lg truncate">{project.name}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[project.status]}`}>
                  {STATUS_LABELS[project.status]}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                合作对象：<span className="font-medium text-gray-700">{partnerDisplayName}</span>
                {partner?.company && <span className="text-gray-400"> · {partner.company}</span>}
              </p>
            </div>

            {/* 操作按钮 */}
            {!isArchived && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleComplete}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> 完成
                </button>
                <button
                  onClick={() => setShowTerminatePanel(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" /> 终止
                </button>
              </div>
            )}

            {isArchived && !hasReviewed && (
              <button
                onClick={() => setShowReviewModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-medium hover:bg-yellow-600 transition-colors shrink-0"
              >
                <Star className="w-3.5 h-3.5" /> 评价
              </button>
            )}
          </div>

          {/* 阶段进度条 */}
          <div className="overflow-x-auto pb-1">
            <StageProgress
              currentStage={project.current_stage as ProjectStage}
              onStageChange={isArchived ? undefined : handleStageChange}
              readonly={isArchived}
            />
          </div>
        </div>
      </header>

      {/* 终止面板 */}
      {showTerminatePanel && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="font-semibold text-red-800">终止项目</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">终止原因类别 *</label>
                <select
                  value={terminateCategory}
                  onChange={e => setTerminateCategory(e.target.value)}
                  className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-300"
                >
                  <option value="">请选择...</option>
                  {TERMINATION_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">补充说明（选填）</label>
                <input
                  type="text"
                  value={terminateReason}
                  onChange={e => setTerminateReason(e.target.value)}
                  placeholder="更多说明..."
                  className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-300"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleTerminate}
                disabled={terminating}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {terminating ? '终止中...' : '确认终止'}
              </button>
              <button
                onClick={() => setShowTerminatePanel(false)}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <main className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex gap-4">
          {/* 左侧主区 */}
          <div className="flex-1 min-w-0">
            {/* Tab 切换 */}
            <div className="flex gap-1 mb-4 bg-white border border-gray-100 rounded-xl p-1 shadow-sm">
              {(['timeline', 'files', 'milestones'] as const).map(tab => {
                const labels = { timeline: '沟通记录', files: '文件管理', milestones: '时间节点' }
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {labels[tab]}
                  </button>
                )
              })}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              {/* 沟通记录 */}
              {activeTab === 'timeline' && (
                <div style={{ height: 'calc(100vh - 320px)', minHeight: '400px' }}>
                  <ProjectTimeline
                    logs={logs}
                    currentPersonId={currentPersonId ?? ''}
                    currentPersonName={currentPersonName}
                    onSendMessage={handleSendMessage}
                  />
                </div>
              )}

              {/* 文件管理 */}
              {activeTab === 'files' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800 text-sm">项目文件</h3>
                    {!isArchived && (
                      <label className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs cursor-pointer hover:bg-blue-700 transition-colors">
                        <Upload className="w-3.5 h-3.5" /> 上传文件
                        <input type="file" className="hidden" onChange={handleFileUpload} />
                      </label>
                    )}
                  </div>

                  {files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <Paperclip className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-sm">暂无文件</p>
                      {!isArchived && <p className="text-xs mt-1">点击上传按钮添加合同、报价单等文件</p>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {files.map(file => {
                        const uploader = getPersonById(file.uploaded_by_person_id ?? '')
                        return (
                          <div
                            key={file.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 group"
                          >
                            <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{file.file_name}</p>
                              <p className="text-xs text-gray-400">
                                {uploader ? displayName(uploader) : '未知'} ·{' '}
                                {new Date(file.created_at).toLocaleDateString('zh-CN')}
                              </p>
                            </div>
                            {file.file_url && (
                              <a
                                href={file.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-600 hover:underline shrink-0"
                              >
                                查看
                              </a>
                            )}
                            {!isArchived && (
                              <button
                                onClick={() => handleDeleteFile(file.id, file.file_name)}
                                className="p-1 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 时间节点 */}
              {activeTab === 'milestones' && (
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm mb-4">时间节点一览</h3>
                  {milestones.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <p className="text-sm">创建项目时未设定时间节点</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {milestones.map(m => {
                        const planned = m.planned_date ? new Date(m.planned_date) : null
                        const isOverdue = planned && planned < new Date() && !m.completed_date
                        const isDone = !!m.completed_date
                        return (
                          <div
                            key={m.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border ${
                              isDone
                                ? 'bg-green-50 border-green-100'
                                : isOverdue
                                ? 'bg-red-50 border-red-100'
                                : 'bg-gray-50 border-gray-100'
                            }`}
                          >
                            {isDone ? (
                              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                            ) : isOverdue ? (
                              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800">
                                {STAGE_LABELS[m.stage as ProjectStage] ?? m.stage}
                              </p>
                              {planned && (
                                <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                                  计划：{planned.toLocaleDateString('zh-CN')}
                                  {isOverdue && ' (已逾期)'}
                                </p>
                              )}
                              {m.notes && <p className="text-xs text-gray-400 mt-0.5">{m.notes}</p>}
                            </div>
                            {m.reminder_days && m.reminder_days > 0 && (
                              <span className="text-xs text-gray-400 shrink-0">提前{m.reminder_days}天提醒</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 评价展示 */}
            {reviews.length > 0 && (
              <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h3 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-yellow-500" /> 项目评价
                </h3>
                <div className="space-y-3">
                  {reviews.map(review => {
                    const reviewer = getPersonById(review.reviewer_person_id)
                    return (
                      <div key={review.id} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500 mb-2">
                          {reviewer ? displayName(reviewer) : '用户'} 的评价
                        </p>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {review.tags.map(tag => (
                            <span
                              key={tag}
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                ['合作愉快', '响应及时', '专业可靠', '信守承诺', '高效执行', '沟通顺畅'].includes(tag)
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-600'
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        {review.comment && <p className="text-sm text-gray-600">{review.comment}</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 右侧 AI 面板 */}
          <div className="w-72 shrink-0 space-y-4">
            <AiPanel
              project={project}
              lastActivityDate={lastActivity}
              userRole={userRole}
            />

            {/* 项目简介 */}
            {project.description && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h3 className="font-semibold text-gray-800 text-sm mb-2">合作意向</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{project.description}</p>
              </div>
            )}

            {/* 终止原因（已终止时显示） */}
            {project.status === 'terminated' && project.termination_category && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <h3 className="font-semibold text-red-700 text-sm mb-1">终止信息</h3>
                <p className="text-sm text-red-600">原因：{project.termination_category}</p>
                {project.termination_reason && (
                  <p className="text-sm text-red-500 mt-1">{project.termination_reason}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 评价弹窗 */}
      {showReviewModal && partner && (
        <ReviewModal
          projectName={project.name}
          revieweeName={partnerDisplayName}
          onSubmit={handleSubmitReview}
          onClose={() => setShowReviewModal(false)}
          loading={reviewSubmitting}
        />
      )}
    </div>
  )
}
