'use client'

import { useState } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { STAGE_LABELS, STAGE_ORDER, ProjectStage } from '@/lib/projectStore'

interface StageProgressProps {
  currentStage: ProjectStage
  onStageChange?: (stage: ProjectStage, note: string) => void
  readonly?: boolean
}

export default function StageProgress({ currentStage, onStageChange, readonly = false }: StageProgressProps) {
  const [pendingStage, setPendingStage] = useState<ProjectStage | null>(null)
  const [note, setNote] = useState('')
  const currentIndex = STAGE_ORDER.indexOf(currentStage)

  const handleClick = (stage: ProjectStage) => {
    if (readonly || !onStageChange) return
    if (stage === currentStage) return
    setPendingStage(stage)
    setNote('')
  }

  const confirmChange = () => {
    if (!pendingStage || !onStageChange) return
    onStageChange(pendingStage, note)
    setPendingStage(null)
    setNote('')
  }

  return (
    <div>
      {/* 进度条 */}
      <div className="flex items-center gap-0">
        {STAGE_ORDER.map((stage, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex
          const isLast = index === STAGE_ORDER.length - 1

          return (
            <div key={stage} className="flex items-center flex-1 min-w-0">
              <div
                onClick={() => handleClick(stage)}
                className={`flex flex-col items-center cursor-default ${!readonly && stage !== currentStage ? 'cursor-pointer' : ''}`}
                title={!readonly ? (stage !== currentStage ? `切换到：${STAGE_LABELS[stage]}` : '当前阶段') : ''}
              >
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${isCompleted ? 'bg-blue-500 text-white' : ''}
                    ${isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-110' : ''}
                    ${!isCompleted && !isCurrent ? 'bg-gray-100 text-gray-400' : ''}
                    ${!readonly && stage !== currentStage ? 'hover:ring-2 hover:ring-blue-300' : ''}
                  `}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <span
                  className={`mt-1 text-xs text-center leading-tight whitespace-nowrap ${
                    isCurrent ? 'text-blue-600 font-semibold' : isCompleted ? 'text-blue-400' : 'text-gray-400'
                  }`}
                >
                  {STAGE_LABELS[stage]}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`flex-1 h-0.5 mx-1 mt-[-18px] ${
                    index < currentIndex ? 'bg-blue-400' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* 阶段变更确认弹窗 */}
      {pendingStage && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-800 mb-2">
            确认将阶段切换为「{STAGE_LABELS[pendingStage]}」？
          </p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="请填写备注说明（选填）"
            className="w-full text-sm border border-blue-200 rounded-lg p-2 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={confirmChange}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              确认切换
            </button>
            <button
              onClick={() => setPendingStage(null)}
              className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
