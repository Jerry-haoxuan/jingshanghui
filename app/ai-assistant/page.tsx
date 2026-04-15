'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Network, MessageSquare, Send, Bot, Edit, Users, FolderOpen, Brain, ChevronDown, ChevronUp, Sparkles, Globe, ExternalLink, Plus, Trash2, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getPeople, getCompanies, loadPeopleFromCloudIfAvailable, loadCompaniesFromCloudIfAvailable, PersonData, savePeople, getMyCards } from '@/lib/dataStore'
import { getUserRole, UserRole, isManager, isMember } from '@/lib/userRole'
import PersonEditModal from '@/components/PersonEditModal'
import { getCurrentUser } from '@/lib/userStore'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  thinkingContent?: string
  isDeepThinking?: boolean
  webSearch?: boolean
  webSources?: string[]
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

const SESSION_KEY = 'huihui_chat_sessions'
const MAX_SESSIONS = 50

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveSessions(sessions: ChatSession[]) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)))
  } catch {}
}

function groupSessionsByDate(sessions: ChatSession[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const last7 = new Date(today.getTime() - 7 * 86400000)

  const groups: { label: string; items: ChatSession[] }[] = [
    { label: '今天', items: [] },
    { label: '昨天', items: [] },
    { label: '最近7天', items: [] },
    { label: '更早', items: [] },
  ]

  sessions.forEach(s => {
    const d = new Date(s.updatedAt)
    if (d >= today) groups[0].items.push(s)
    else if (d >= yesterday) groups[1].items.push(s)
    else if (d >= last7) groups[2].items.push(s)
    else groups[3].items.push(s)
  })

  return groups.filter(g => g.items.length > 0)
}

// Markdown 渲染
function renderMarkdown(text: string): React.ReactNode {
  if (!text) return text
  const lines = text.split('\n')
  return lines.map((line, lineIndex) => {
    const parts: React.ReactNode[] = []
    let remaining = line
    let partIndex = 0
    while (remaining.includes('**')) {
      const startIdx = remaining.indexOf('**')
      const endIdx = remaining.indexOf('**', startIdx + 2)
      if (endIdx === -1) break
      if (startIdx > 0) parts.push(<span key={`${lineIndex}-${partIndex++}`}>{remaining.slice(0, startIdx)}</span>)
      parts.push(<strong key={`${lineIndex}-${partIndex++}`} className="font-semibold">{remaining.slice(startIdx + 2, endIdx)}</strong>)
      remaining = remaining.slice(endIdx + 2)
    }
    while (remaining.includes('*')) {
      const startIdx = remaining.indexOf('*')
      const endIdx = remaining.indexOf('*', startIdx + 1)
      if (endIdx === -1) break
      if (startIdx > 0) parts.push(<span key={`${lineIndex}-${partIndex++}`}>{remaining.slice(0, startIdx)}</span>)
      parts.push(<em key={`${lineIndex}-${partIndex++}`} className="italic">{remaining.slice(startIdx + 1, endIdx)}</em>)
      remaining = remaining.slice(endIdx + 1)
    }
    if (remaining) parts.push(<span key={`${lineIndex}-${partIndex++}`}>{remaining}</span>)
    if (parts.length === 0) parts.push(<span key={`${lineIndex}-0`}>{line}</span>)
    if (lineIndex < lines.length - 1) parts.push(<br key={`${lineIndex}-br`} />)
    return <span key={lineIndex}>{parts}</span>
  })
}

export default function AIAssistant() {
  const router = useRouter()
  const [navCollapsed, setNavCollapsed] = useState(false)        // 左侧应用导航栏
  const [historyCollapsed, setHistoryCollapsed] = useState(false) // 对话历史侧栏
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingPerson, setEditingPerson] = useState<PersonData | null>(null)
  const [myCards, setMyCards] = useState<PersonData[]>([])
  const [deepThinking, setDeepThinking] = useState(true)
  const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set())

  // 对话历史
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null)

  // 生成欢迎词
  const getWelcomeMessage = (role: UserRole | null): Message => ({
    id: '1',
    role: 'assistant',
    content: role === UserRole.MANAGER
      ? '你好，我是你的AI助理慧慧，请问有什么需要我帮助的吗？我可以帮助你找到想联系的人，并为你展示他们的详细信息。'
      : '精尚慧的会员，你好呀，我是你的AI助理慧慧，请问有什么需要我帮助的吗？我可以帮助你找到想联系的人，只要你告诉我他的名字，我就会在我的信息库帮你寻找与他相关的人。',
    timestamp: new Date(),
  })

  // 创建新会话
  const createNewSession = (role: UserRole | null): ChatSession => {
    const welcome = getWelcomeMessage(role)
    const now = new Date().toISOString()
    return {
      id: Date.now().toString(),
      title: '新对话',
      messages: [welcome],
      createdAt: now,
      updatedAt: now,
    }
  }

  // 初始化
  useEffect(() => {
    const role = getUserRole()
    setCurrentRole(role)
    loadMyCards()

    const saved = loadSessions()
    if (saved.length > 0) {
      setSessions(saved)
      const latest = saved[0]
      setCurrentSessionId(latest.id)
      setMessages(latest.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })))
    } else {
      const newSession = createNewSession(role)
      setSessions([newSession])
      setCurrentSessionId(newSession.id)
      setMessages(newSession.messages)
      saveSessions([newSession])
    }
  }, [])

  // 消息变更时自动保存到当前会话
  useEffect(() => {
    if (!currentSessionId || messages.length === 0) return
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id !== currentSessionId) return s
        const firstUserMsg = messages.find(m => m.role === 'user')
        const title = firstUserMsg
          ? firstUserMsg.content.slice(0, 24) + (firstUserMsg.content.length > 24 ? '…' : '')
          : '新对话'
        return { ...s, title, messages, updatedAt: new Date().toISOString() }
      })
      saveSessions(updated)
      return updated
    })
  }, [messages])

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 切换会话
  const switchSession = (sessionId: string) => {
    const target = sessions.find(s => s.id === sessionId)
    if (!target) return
    setCurrentSessionId(sessionId)
    setMessages(target.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })))
  }

  // 新建对话
  const handleNewChat = () => {
    const newSession = createNewSession(currentRole)
    setSessions(prev => {
      const updated = [newSession, ...prev]
      saveSessions(updated)
      return updated
    })
    setCurrentSessionId(newSession.id)
    setMessages(newSession.messages)
  }

  // 删除会话
  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId)
      saveSessions(updated)
      if (sessionId === currentSessionId) {
        if (updated.length > 0) {
          setCurrentSessionId(updated[0].id)
          setMessages(updated[0].messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })))
        } else {
          const newSession = createNewSession(currentRole)
          saveSessions([newSession])
          setCurrentSessionId(newSession.id)
          setMessages(newSession.messages)
          return [newSession]
        }
      }
      return updated
    })
  }

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      let people = getPeople()
      let companies = getCompanies()
      try {
        const [cloudPeople, cloudCompanies] = await Promise.all([
          loadPeopleFromCloudIfAvailable(),
          loadCompaniesFromCloudIfAvailable(),
        ])
        if (Array.isArray(cloudPeople) && cloudPeople.length > 0) people = cloudPeople
        if (Array.isArray(cloudCompanies) && cloudCompanies.length > 0) companies = cloudCompanies
      } catch (_) {}

      const role = currentRole || UserRole.MEMBER
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputValue,
          history: messages,
          people,
          companies,
          role,
          deepThinking,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          thinkingContent: data.reasoning || undefined,
          isDeepThinking: deepThinking && !!data.reasoning,
          webSearch: data.webSearch || false,
          webSources: data.webSources || undefined,
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error('API调用失败')
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，我遇到了一些问题，请稍后再试。',
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const loadMyCards = async () => {
    try {
      await loadPeopleFromCloudIfAvailable().catch(() => {})
      if (isMember()) {
        const people = getPeople()
        const currentUser = getCurrentUser()
        const myPerson = currentUser?.personName
          ? people.find(p => p.name === currentUser.personName) ?? null
          : null
        setMyCards(myPerson ? [myPerson] : [])
      } else {
        setMyCards(getMyCards())
      }
    } catch {
      setMyCards([])
    }
  }

  const handleEditSave = async (updatedPerson: PersonData) => {
    try {
      const people = getPeople()
      const index = people.findIndex(p => p.id === updatedPerson.id)
      if (index !== -1) {
        people[index] = updatedPerson
        savePeople(people)
        loadMyCards()
      }
    } catch {}
  }

  const sessionGroups = groupSessionsByDate(sessions)

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ===== 左侧应用导航栏 ===== */}
      <div className={`${navCollapsed ? 'w-14' : 'w-52'} bg-white border-r border-gray-100 flex flex-col transition-all duration-300 shrink-0`}>
        <div className="p-3 flex items-center justify-between border-b border-gray-100">
          {!navCollapsed && (
            <Link href="/" className="text-lg font-bold text-blue-600 truncate">精尚慧</Link>
          )}
          <button onClick={() => setNavCollapsed(!navCollapsed)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            {navCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <Link href="/dashboard" className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-gray-100 rounded-lg text-sm text-gray-700">
            <Network className="h-4 w-4 shrink-0" />
            {!navCollapsed && <span>生态商圈</span>}
          </Link>
          <button
            onClick={() => myCards.length > 0 ? router.push(`/person/${myCards[0].id}`) : router.push('/data-input')}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 hover:bg-gray-100 rounded-lg text-sm text-gray-700 text-left"
          >
            <Edit className="h-4 w-4 shrink-0" />
            {!navCollapsed && <span>我的</span>}
          </button>
          <Link href="/business-circle" className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-gray-100 rounded-lg text-sm text-gray-700">
            <Users className="h-4 w-4 shrink-0" />
            {!navCollapsed && <span>我的商圈</span>}
          </Link>
          <Link href="/projects" className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-gray-100 rounded-lg text-sm text-gray-700">
            <FolderOpen className="h-4 w-4 shrink-0" />
            {!navCollapsed && <span>My Project</span>}
          </Link>
          <Link href="/ai-assistant" className="flex items-center gap-2.5 px-2.5 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium">
            <MessageSquare className="h-4 w-4 shrink-0" />
            {!navCollapsed && <span>慧慧AI助理</span>}
          </Link>
        </nav>
      </div>

      {/* ===== 对话历史侧栏（DeepSeek 风格）===== */}
      <div className={`${historyCollapsed ? 'w-0 overflow-hidden' : 'w-56'} bg-white border-r border-gray-100 flex flex-col transition-all duration-300 shrink-0`}>
        {!historyCollapsed && (
          <>
            {/* 新建对话按钮 */}
            <div className="p-3 border-b border-gray-100">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                新建对话
              </button>
            </div>

            {/* 历史会话列表 */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {sessionGroups.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-6">暂无历史对话</p>
              )}
              {sessionGroups.map(group => (
                <div key={group.label}>
                  <p className="text-xs text-gray-400 font-medium px-2 py-1">{group.label}</p>
                  <div className="space-y-0.5">
                    {group.items.map(session => (
                      <div
                        key={session.id}
                        onClick={() => switchSession(session.id)}
                        onMouseEnter={() => setHoveredSessionId(session.id)}
                        onMouseLeave={() => setHoveredSessionId(null)}
                        className={`group relative flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                          session.id === currentSessionId
                            ? 'bg-blue-50 text-blue-700'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                        <span className="text-xs truncate flex-1">{session.title}</span>
                        {(hoveredSessionId === session.id || session.id === currentSessionId) && (
                          <button
                            onClick={(e) => handleDeleteSession(e, session.id)}
                            className="shrink-0 p-0.5 rounded hover:bg-red-100 hover:text-red-500 text-gray-400 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ===== 主对话区 ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶栏 */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shrink-0">
          {/* 切换历史侧栏按钮 */}
          <button
            onClick={() => setHistoryCollapsed(!historyCollapsed)}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
            title={historyCollapsed ? '展开历史记录' : '折叠历史记录'}
          >
            {historyCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>

          <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shrink-0">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold leading-tight">
              {currentRole === UserRole.MANAGER ? '慧慧AI助理' : '慧慧AI助理会员版'}
            </h1>
            <p className="text-xs text-gray-400">基于永鑫方舟投资圈 · 智能分析</p>
          </div>

          {/* 右侧新建对话快捷键 */}
          <button
            onClick={handleNewChat}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200"
          >
            <Plus className="h-3.5 w-3.5" />
            新建对话
          </button>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-2xl mx-auto space-y-5">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[80%] flex flex-col gap-2">
                  {/* 深度思考折叠块 */}
                  {message.thinkingContent && (
                    <div className="rounded-lg border border-purple-200 bg-purple-50 overflow-hidden">
                      <button
                        onClick={() => setExpandedThinking(prev => {
                          const next = new Set(prev)
                          next.has(message.id) ? next.delete(message.id) : next.add(message.id)
                          return next
                        })}
                        className="w-full flex items-center justify-between px-3 py-2 text-purple-700 hover:bg-purple-100 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <Brain className="h-3.5 w-3.5" />
                          <span>深度思考过程</span>
                        </div>
                        {expandedThinking.has(message.id) ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                      {expandedThinking.has(message.id) && (
                        <div className="px-3 pb-3 text-xs text-purple-600 leading-relaxed whitespace-pre-wrap border-t border-purple-200 pt-2">
                          {message.thinkingContent}
                        </div>
                      )}
                    </div>
                  )}
                  {/* 气泡 */}
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : message.isDeepThinking
                        ? 'bg-white border border-purple-200 text-gray-800 shadow-sm rounded-tl-sm'
                        : 'bg-white border border-gray-100 text-gray-800 shadow-sm rounded-tl-sm'
                  }`}>
                    {message.isDeepThinking && (
                      <div className="flex items-center gap-1 text-xs text-purple-500 mb-1.5 font-medium">
                        <Sparkles className="h-3 w-3" />
                        <span>深度思考</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{renderMarkdown(message.content)}</div>
                    {/* 联网搜索标记 */}
                    {message.webSearch && message.role === 'assistant' && (
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100">
                        <Globe className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-green-600 font-medium">已联网搜索</span>
                        {message.webSources?.map((src, i) => (
                          <a key={i} href={src} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-xs text-blue-400 hover:text-blue-600 ml-1">
                            来源{i + 1}<ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ))}
                      </div>
                    )}
                    <p className={`text-xs mt-1.5 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-300'}`}>
                      {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className={`rounded-2xl rounded-tl-sm px-4 py-3 border shadow-sm text-sm ${
                  deepThinking ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-100'
                }`}>
                  <div className="flex items-center gap-2">
                    {deepThinking ? (
                      <>
                        <Brain className="w-4 h-4 text-purple-500 animate-pulse" />
                        <span className="text-purple-600 text-sm">慧慧正在深度思考中，请稍候...</span>
                      </>
                    ) : (
                      <>
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-gray-500 text-sm">慧慧正在搜索并联网查询...</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 输入区域 */}
        <div className="bg-white border-t border-gray-100 px-4 py-3 shrink-0">
          <div className="max-w-2xl mx-auto space-y-2">
            {/* 深度思考开关 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDeepThinking(!deepThinking)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  deepThinking
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-purple-400 hover:text-purple-500'
                }`}
              >
                <Brain className="h-3.5 w-3.5" />
                <span>深度思考</span>
                {deepThinking && <Sparkles className="h-3 w-3 animate-pulse" />}
              </button>
              {deepThinking && (
                <span className="text-xs text-purple-400">已开启 · 响应会慢一些</span>
              )}
            </div>
            {/* 输入框 */}
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={deepThinking ? '深度思考模式：输入复杂问题...' : '输入你想查找的人名、公司或问题...'}
                className={`flex-1 text-sm rounded-xl ${deepThinking ? 'border-purple-200 focus:border-purple-400' : ''}`}
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                className={`px-4 rounded-xl ${deepThinking ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <PersonEditModal
        person={editingPerson}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSave={handleEditSave}
      />
    </div>
  )
}
