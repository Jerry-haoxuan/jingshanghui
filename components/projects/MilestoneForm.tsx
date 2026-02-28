'use client'

import { useState } from 'react'
import { Calendar, Bell } from 'lucide-react'

export interface MilestoneInput {
  stage: string
  label: string
  planned_date: string
  reminder_days: number
  notes: string
}

const DEFAULT_MILESTONES: MilestoneInput[] = [
  { stage: 'first_visit', label: '初次访问（计划沟通时间）', planned_date: '', reminder_days: 1, notes: '' },
  { stage: 'decision_deadline', label: '决策期截止（成交/终止 deadline）', planned_date: '', reminder_days: 3, notes: '' },
  { stage: 'contract', label: '合同签订时间', planned_date: '', reminder_days: 1, notes: '' },
  { stage: 'payment_1', label: '收款节点一', planned_date: '', reminder_days: 3, notes: '' },
  { stage: 'payment_2', label: '收款节点二（可选）', planned_date: '', reminder_days: 3, notes: '' },
  { stage: 'delivery', label: '项目交付 / 结束时间', planned_date: '', reminder_days: 1, notes: '' },
]

interface MilestoneFormProps {
  onChange: (milestones: MilestoneInput[]) => void
}

export default function MilestoneForm({ onChange }: MilestoneFormProps) {
  const [milestones, setMilestones] = useState<MilestoneInput[]>(DEFAULT_MILESTONES)

  const update = (index: number, field: keyof MilestoneInput, value: string | number) => {
    const updated = milestones.map((m, i) =>
      i === index ? { ...m, [field]: value } : m
    )
    setMilestones(updated)
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      {milestones.map((m, i) => (
        <div key={m.stage} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            {m.label}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">预计日期</label>
              <input
                type="date"
                value={m.planned_date}
                onChange={e => update(i, 'planned_date', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Bell className="w-3 h-3" /> 提前提醒（天）
              </label>
              <select
                value={m.reminder_days}
                onChange={e => update(i, 'reminder_days', Number(e.target.value))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              >
                <option value={0}>不提醒</option>
                <option value={1}>提前 1 天</option>
                <option value={2}>提前 2 天</option>
                <option value={3}>提前 3 天</option>
                <option value={7}>提前 1 周</option>
              </select>
            </div>
          </div>
          <div className="mt-2">
            <label className="text-xs text-gray-500 mb-1 block">备注（选填）</label>
            <input
              type="text"
              value={m.notes}
              onChange={e => update(i, 'notes', e.target.value)}
              placeholder="可填写备注或说明"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
            />
          </div>
        </div>
      ))}
    </div>
  )
}
