'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, FolderOpen, ChevronLeft, Loader2, Trash2 } from 'lucide-react'
import { Project, ProjectStatus, STATUS_LABELS } from '@/lib/projectStore'
import { getCurrentUser } from '@/lib/userStore'
import { listPeopleFromCloud } from '@/lib/cloudStore'
import { PersonData } from '@/lib/dataStore'
import { isManager } from '@/lib/userRole'
import { deterministicAliasName } from '@/lib/deterministicNameAlias'
import ProjectCard from '@/components/projects/ProjectCard'

const STATUS_FILTERS: { key: 'all' | ProjectStatus; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'in_progress', label: '进行中' },
  { key: 'pending', label: '待定' },
  { key: 'completed', label: '已完成' },
  { key: 'terminated', label: '已终止' },
]

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [people, setPeople] = useState<PersonData[]>([])
  const [filter, setFilter] = useState<'all' | ProjectStatus>('all')
  const [loading, setLoading] = useState(true)
  const [currentPersonId, setCurrentPersonId] = useState<string | null>(null)

  const loadData = useCallback(async (personId: string) => {
    setLoading(true)
    try {
      const [projectsRes, peopleData] = await Promise.all([
        fetch(`/api/projects?personId=${personId}`),
        listPeopleFromCloud(),
      ])
      const { projects: data } = await projectsRes.json()
      setProjects(data ?? [])
      setPeople(peopleData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      router.push('/')
      return
    }
    listPeopleFromCloud().then(allPeople => {
      const me = allPeople.find(p => p.name === currentUser.personName)
      if (me) {
        setCurrentPersonId(me.id)
        loadData(me.id)
        setPeople(allPeople)
      } else {
        setLoading(false)
      }
    })
  }, [loadData, router])

  const getPersonById = (id: string) => people.find(p => p.id === id)

  const displayName = (person: PersonData) => {
    if (isManager()) return person.name
    return deterministicAliasName(person.name)
  }

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter)

  const handleDeleteProject = async (projectId: string, projectName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`确认删除项目「${projectName}」？此操作不可恢复。`)) return
    await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
    setProjects(prev => prev.filter(p => p.id !== projectId))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-600" />
              <h1 className="font-bold text-gray-900 text-lg">My Project</h1>
            </div>
          </div>
          <Link
            href="/projects/new"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            建立新项目
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* 状态筛选 Tab */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === f.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-blue-300'
              }`}
            >
              {f.label}
              {f.key !== 'all' && (
                <span className="ml-1 text-xs opacity-70">
                  ({projects.filter(p => p.status === f.key).length})
                </span>
              )}
              {f.key === 'all' && (
                <span className="ml-1 text-xs opacity-70">({projects.length})</span>
              )}
            </button>
          ))}
        </div>

        {/* 内容区 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <FolderOpen className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">
              {filter === 'all' ? '还没有项目，点击右上角建立第一个合作项目吧！' : `暂无「${STATUS_LABELS[filter as ProjectStatus]}」的项目`}
            </p>
            {filter === 'all' && (
              <Link
                href="/projects/new"
                className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                建立新项目
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(project => {
              const partnerId =
                project.creator_person_id === currentPersonId
                  ? project.partner_person_id
                  : project.creator_person_id
              const partner = getPersonById(partnerId)
              const isArchived = project.status === 'completed' || project.status === 'terminated'
              return (
                <div key={project.id} className="relative group">
                  <ProjectCard
                    project={project}
                    partnerName={partner ? displayName(partner) : '对方'}
                    partnerCompany={partner?.company}
                  />
                  {/* 已归档项目显示删除按钮 */}
                  {isArchived && (
                    <button
                      onClick={e => handleDeleteProject(project.id, project.name, e)}
                      className="absolute top-3 right-3 p-1.5 bg-white border border-gray-200 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:border-red-200 shadow-sm z-10"
                      title="删除项目"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
