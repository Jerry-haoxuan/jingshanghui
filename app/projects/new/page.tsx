'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Search,
  Loader2,
  FolderOpen,
} from 'lucide-react'
import { getCurrentUser } from '@/lib/userStore'
import { listPeopleFromCloud } from '@/lib/cloudStore'
import { PersonData } from '@/lib/dataStore'
import { isManager } from '@/lib/userRole'
import { deterministicAliasName } from '@/lib/deterministicNameAlias'
import { batchUpsertMilestones } from '@/lib/projectStore'
import MilestoneForm, { MilestoneInput } from '@/components/projects/MilestoneForm'

const STEPS = ['项目命名', '邀请企业家', '时间节点']

export default function NewProjectPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // Step 1
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // Step 2
  const [people, setPeople] = useState<PersonData[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPartner, setSelectedPartner] = useState<PersonData | null>(null)
  const [loadingPeople, setLoadingPeople] = useState(false)
  const [currentPersonId, setCurrentPersonId] = useState<string | null>(null)
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())

  // Step 3
  const [milestones, setMilestones] = useState<MilestoneInput[]>([])

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) { router.push('/'); return }

    setLoadingPeople(true)
    listPeopleFromCloud().then(async allPeople => {
      const me = allPeople.find(p => p.name === currentUser.personName)
      if (me) {
        setCurrentPersonId(me.id)
        // 加载好友列表
        try {
          const res = await fetch(`/api/friendships?personId=${me.id}`)
          const { friends } = await res.json()
          setFriendIds(new Set(friends ?? []))
        } catch {
          setFriendIds(new Set())
        }
      }
      // 排除自己
      setPeople(allPeople.filter(p => p.id !== me?.id))
      setLoadingPeople(false)
    })
  }, [router])

  const displayName = (person: PersonData) => {
    if (isManager()) return `${person.name}（${deterministicAliasName(person.name)}）`
    return deterministicAliasName(person.name)
  }

  // 只显示商圈好友；若无好友则显示全部并提示
  const friendPeople = people.filter(p => friendIds.has(p.id))
  const hasFriends = friendPeople.length > 0

  const filteredPeople = (hasFriends ? friendPeople : people).filter(p => {
    const q = searchQuery.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      deterministicAliasName(p.name).toLowerCase().includes(q) ||
      p.company.toLowerCase().includes(q) ||
      (p.industry ?? '').toLowerCase().includes(q)
    )
  })

  const canNext = () => {
    if (step === 0) return name.trim().length > 0
    if (step === 1) return selectedPartner !== null
    return true
  }

  const handleFinish = async () => {
    if (!currentPersonId || !selectedPartner) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          creator_person_id: currentPersonId,
          partner_person_id: selectedPartner.id,
        }),
      })
      const { project, error } = await res.json()
      if (error || !project) {
        alert('创建项目失败：' + (error ?? '未知错误'))
        setSubmitting(false)
        return
      }

      // 保存里程碑
      const validMilestones = milestones.filter(m => m.planned_date)
      if (validMilestones.length > 0) {
        await batchUpsertMilestones(
          validMilestones.map(m => ({
            project_id: project.id,
            stage: m.stage,
            planned_date: m.planned_date,
            reminder_days: m.reminder_days,
            notes: m.notes || undefined,
          }))
        )
      }

      // 写一条系统日志
      await fetch(`/api/projects/${project.id}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'system',
          content: `项目「${project.name}」正式立项，合作对象：${selectedPartner.name}。`,
        }),
      })

      router.push(`/projects/${project.id}`)
    } catch {
      alert('创建失败，请检查网络')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/projects" className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-600" />
            <h1 className="font-bold text-gray-900">建立新项目</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* 步骤指示器 */}
        <div className="flex items-center mb-8">
          {STEPS.map((label, index) => {
            const isCompleted = index < step
            const isCurrent = index === step
            const isLast = index === STEPS.length - 1
            return (
              <div key={label} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      isCompleted
                        ? 'bg-blue-500 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                  </div>
                  <span
                    className={`mt-1 text-xs whitespace-nowrap ${
                      isCurrent ? 'text-blue-600 font-semibold' : isCompleted ? 'text-blue-400' : 'text-gray-400'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={`flex-1 h-0.5 mx-2 mt-[-18px] ${
                      index < step ? 'bg-blue-400' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* 步骤内容 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Step 1: 项目命名 */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">项目命名</h2>
                <p className="text-sm text-gray-500">为这次合作取一个简洁明了的名字</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  项目名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="例如：与李总的新能源采购合作"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  合作意向 <span className="text-gray-400 font-normal">（选填）</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="简单描述这次合作的目的和预期..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none h-24"
                />
              </div>
            </div>
          )}

          {/* Step 2: 邀请企业家 */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">选择合作企业家</h2>
                <p className="text-sm text-gray-500">从商圈好友中选择合作对象</p>
              </div>

              {/* 无好友提示 */}
              {!loadingPeople && !hasFriends && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <span className="text-amber-500 text-lg shrink-0">⚠️</span>
                  <div>
                    <p className="text-sm text-amber-800 font-medium">你的商圈暂无好友</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      只有商圈好友才能互相建立项目。以下显示全部企业家供参考，
                      建议先前往{' '}
                      <a href="/business-circle" className="underline font-medium" target="_blank">我的商圈</a>
                      {' '}添加好友后再立项。
                    </p>
                  </div>
                </div>
              )}
              {!loadingPeople && hasFriends && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-sm text-green-700">
                  显示你的商圈好友（共 {friendPeople.length} 人）
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="搜索姓名、公司、行业..."
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              {selectedPartner && (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold shrink-0">
                    {displayName(selectedPartner).slice(0, 1)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-800">{displayName(selectedPartner)}</p>
                    <p className="text-xs text-blue-600">
                      {selectedPartner.position} @ {selectedPartner.company}
                    </p>
                  </div>
                  <span className="ml-auto text-xs bg-blue-600 text-white px-2 py-1 rounded-full">已选择</span>
                </div>
              )}

              <div className="max-h-72 overflow-y-auto space-y-2">
                {loadingPeople ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  </div>
                ) : filteredPeople.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">未找到匹配的企业家</p>
                ) : (
                  filteredPeople.map(person => (
                    <div
                      key={person.id}
                      onClick={() => setSelectedPartner(person)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedPartner?.id === person.id
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-gray-50 border-gray-100 hover:bg-blue-50 hover:border-blue-200'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {displayName(person).slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{displayName(person)}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {person.position} @ {person.company}
                        </p>
                        {person.industry && (
                          <span className="text-xs text-gray-400">{person.industry}</span>
                        )}
                      </div>
                      {selectedPartner?.id === person.id && (
                        <Check className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Step 3: 时间节点 */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">设定时间节点</h2>
                <p className="text-sm text-gray-500">为各关键阶段设定预计完成时间（可跳过，后续在项目中补充）</p>
              </div>
              <MilestoneForm onChange={setMilestones} />
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1 px-5 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> 上一步
            </button>
          )}
          <div className="flex-1" />
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex items-center gap-1 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              下一步 <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 创建中...</>
              ) : (
                <><Check className="w-4 h-4" /> 完成创建</>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
