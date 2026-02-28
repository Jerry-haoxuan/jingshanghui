'use client'

import { useRouter } from 'next/navigation'
import { Clock, ArrowRight } from 'lucide-react'
import {
  Project,
  STAGE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  ProjectStage,
} from '@/lib/projectStore'

interface ProjectCardProps {
  project: Project
  partnerName: string
  partnerCompany?: string
}

export default function ProjectCard({ project, partnerName, partnerCompany }: ProjectCardProps) {
  const router = useRouter()

  const updatedAt = new Date(project.updated_at).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const stageLabel = STAGE_LABELS[project.current_stage as ProjectStage] ?? project.current_stage
  const statusLabel = STATUS_LABELS[project.status]
  const statusColor = STATUS_COLORS[project.status]

  return (
    <div
      onClick={() => router.push(`/projects/${project.id}`)}
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer p-5 group"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-900 text-base group-hover:text-blue-600 transition-colors line-clamp-1">
          {project.name}
        </h3>
        <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ml-2 ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {project.description && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{project.description}</p>
      )}

      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-medium shrink-0">
          {partnerName.slice(0, 1)}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">{partnerName}</p>
          {partnerCompany && (
            <p className="text-xs text-gray-400">{partnerCompany}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md font-medium">
          {stageLabel}
        </span>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          <span>{updatedAt}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-end">
        <span className="text-xs text-gray-400 group-hover:text-blue-500 flex items-center gap-1 transition-colors">
          查看详情 <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  )
}
