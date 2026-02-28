'use client'

import { useState, useEffect } from 'react'
import { Bot, Lightbulb, AlertTriangle, RefreshCw } from 'lucide-react'
import { Project, STAGE_LABELS, ProjectStage } from '@/lib/projectStore'

interface AiPanelProps {
  project: Project
  lastActivityDate: string
  userRole: string
}

export default function AiPanel({ project, lastActivityDate, userRole }: AiPanelProps) {
  const [suggestion, setSuggestion] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const daysSinceActivity = Math.floor(
    (Date.now() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24)
  )
  const isStagnant = daysSinceActivity >= 7

  const stageLabel = STAGE_LABELS[project.current_stage as ProjectStage] ?? project.current_stage

  const getAiSuggestion = async () => {
    setLoading(true)
    setSuggestion('')
    try {
      const prompt = `你是精尚慧平台商业合作助理。请根据以下项目信息，给出简短、具体、可执行的下一步行动建议（不超过150字，不需要开场白）：

项目名称：${project.name}
项目描述：${project.description || '无'}
当前阶段：${stageLabel}
项目状态：${project.status}
距上次活动：${daysSinceActivity}天
${isStagnant ? '⚠️ 项目已停滞超过7天，请特别关注如何重新激活合作。' : ''}

请直接给出建议，格式：
1. 立即行动：...
2. 本周重点：...
3. 风险提示：...`

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          history: [],
          people: [],
          companies: [],
          role: userRole,
        }),
      })
      const data = await res.json()
      setSuggestion(data.response ?? '暂无建议')
    } catch {
      setSuggestion('AI 建议加载失败，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getAiSuggestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, project.current_stage])

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-green-600" />
          <span className="font-semibold text-green-800 text-sm">慧慧 AI 助手</span>
        </div>
        <button
          onClick={getAiSuggestion}
          disabled={loading}
          className="p-1.5 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
          title="刷新建议"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-green-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 停滞警告 */}
      {isStagnant && (
        <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 mb-3">
          <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700">
            项目已 <strong>{daysSinceActivity} 天</strong>未更新，建议尽快推进或评估终止。
          </p>
        </div>
      )}

      {/* 当前阶段提示 */}
      <div className="flex items-center gap-1.5 mb-3">
        <Lightbulb className="w-4 h-4 text-green-500 shrink-0" />
        <span className="text-xs text-green-700">
          当前阶段：<strong>{stageLabel}</strong>
        </span>
      </div>

      {/* AI 建议 */}
      <div className="bg-white rounded-lg p-3 min-h-[80px]">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-4 h-4 border-2 border-green-300 border-t-green-600 rounded-full animate-spin" />
            AI 正在分析项目...
          </div>
        ) : (
          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{suggestion}</p>
        )}
      </div>
    </div>
  )
}
