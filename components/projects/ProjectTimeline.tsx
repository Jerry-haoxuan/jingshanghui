'use client'

import { useRef, useEffect } from 'react'
import { Send, Bot, User, AlertCircle, Upload, RefreshCw } from 'lucide-react'
import { ProjectLog, LogType } from '@/lib/projectStore'

interface ProjectTimelineProps {
  logs: ProjectLog[]
  currentPersonId: string
  currentPersonName: string
  onSendMessage: (content: string) => void
  loading?: boolean
}

const LOG_TYPE_ICONS: Record<LogType, React.ReactNode> = {
  system: <AlertCircle className="w-3.5 h-3.5 text-gray-400" />,
  stage_change: <RefreshCw className="w-3.5 h-3.5 text-blue-400" />,
  file: <Upload className="w-3.5 h-3.5 text-purple-400" />,
  ai: <Bot className="w-3.5 h-3.5 text-green-500" />,
  message: <User className="w-3.5 h-3.5 text-blue-500" />,
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ProjectTimeline({
  logs,
  currentPersonId,
  currentPersonName,
  onSendMessage,
  loading = false,
}: ProjectTimelineProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const value = (e.target as HTMLTextAreaElement).value.trim()
      if (value) {
        onSendMessage(value);
        (e.target as HTMLTextAreaElement).value = ''
      }
    }
  }

  const handleSend = () => {
    const value = inputRef.current?.value.trim()
    if (value) {
      onSendMessage(value)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 时间轴 */}
      <div className="flex-1 overflow-y-auto space-y-3 px-1 py-2">
        {logs.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            暂无记录，开始你的第一条消息吧
          </div>
        )}

        {logs.map(log => {
          const isOwnMessage = log.log_type === 'message' && log.author_person_id === currentPersonId
          const isSystemLog = log.log_type !== 'message'

          if (isSystemLog) {
            return (
              <div key={log.id} className="flex items-start gap-2 py-1">
                <div className="mt-0.5 shrink-0">
                  {LOG_TYPE_ICONS[log.log_type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs leading-relaxed ${
                      log.log_type === 'stage_change'
                        ? 'text-blue-600 font-medium'
                        : log.log_type === 'ai'
                        ? 'text-green-700'
                        : 'text-gray-500'
                    }`}
                  >
                    {log.content}
                  </p>
                  <span className="text-xs text-gray-300 mt-0.5 block">{formatTime(log.created_at)}</span>
                </div>
              </div>
            )
          }

          // 人工消息：气泡样式
          return (
            <div
              key={log.id}
              className={`flex items-end gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                  isOwnMessage ? 'bg-blue-500' : 'bg-indigo-400'
                }`}
              >
                {(isOwnMessage ? currentPersonName : '对方').slice(0, 1)}
              </div>
              <div className={`max-w-[72%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                <div
                  className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                    isOwnMessage
                      ? 'bg-blue-500 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {log.content}
                </div>
                <span className="text-xs text-gray-300">{formatTime(log.created_at)}</span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 输入区 */}
      <div className="border-t border-gray-100 pt-3 flex gap-2 items-end">
        <textarea
          ref={inputRef}
          onKeyDown={handleKeyDown}
          placeholder="发送消息... (Enter 发送，Shift+Enter 换行)"
          className="flex-1 text-sm border border-gray-200 rounded-xl p-2.5 resize-none h-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
