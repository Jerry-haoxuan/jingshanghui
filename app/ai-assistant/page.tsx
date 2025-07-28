'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, User, Building2, MessageSquare, Send, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getPeople, getCompanies } from '@/lib/dataStore'
import { getUserRole, UserRole, isManager } from '@/lib/userRole'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function AIAssistant() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 获取当前用户角色并设置欢迎消息
  useEffect(() => {
    const role = getUserRole()
    setCurrentRole(role)
    
    const welcomeMessage = role === UserRole.MANAGER 
      ? '你好，我是你的AI助理慧慧，请问有什么需要我帮助的吗？我可以帮助你找到想联系的人，并为你展示他们的详细信息。'
      : '精尚慧的会员，你好呀，我是你的AI助理慧慧，请问有什么需要我帮助的吗？我可以帮助你找到想联系的人，只要你告诉我他的名字，我就会在我的信息库帮你寻找与他相关的人。'
    
    setMessages([{
      id: '1',
      role: 'assistant',
      content: welcomeMessage,
      timestamp: new Date()
    }])
  }, [])

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // 获取本地数据
      const people = getPeople()
      const companies = getCompanies()

      // 根据用户角色决定是否AI化名字
      // 注意：发送原始数据，让后端统一处理AI化
      const role = currentRole || UserRole.MEMBER
      
      // 调用AI API，包含本地数据
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: inputValue,
          history: messages,
          people: people,                  // 发送原始数据，让后端处理AI化
          companies: companies,            // 公司数据
          role: role                       // 传递角色信息，便于服务端识别
        })
      })

      if (response.ok) {
        const data = await response.json()
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error('API调用失败')
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，我遇到了一些问题。请稍后再试。',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // 处理按键事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 左侧导航栏 */}
      <div className={`${isSidebarCollapsed ? 'w-16' : 'w-64'} bg-white shadow-lg transition-all duration-300`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            {!isSidebarCollapsed && (
              <Link href="/" className="text-2xl font-bold text-blue-600">
                精尚慧
              </Link>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {isSidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
            </button>
          </div>

          <nav className="space-y-2">
            <Link
              href="/dashboard"
              className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 rounded-lg"
            >
              <User className="h-5 w-5" />
              {!isSidebarCollapsed && <span>智能关系网</span>}
            </Link>
            <Link
              href="/data-input"
              className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 rounded-lg"
            >
              <Building2 className="h-5 w-5" />
              {!isSidebarCollapsed && <span>信息录入</span>}
            </Link>
            <Link
              href="/ai-assistant"
              className="flex items-center space-x-3 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg"
            >
              <MessageSquare className="h-5 w-5" />
              {!isSidebarCollapsed && <span>你想找谁</span>}
            </Link>
          </nav>
        </div>
      </div>

      {/* 右侧对话区 */}
      <div className="flex-1 flex flex-col">
        {/* 头部 */}
        <div className="bg-white shadow-sm px-8 py-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">
                {currentRole === UserRole.MANAGER ? '慧慧AI助理' : '慧慧AI助理会员版'}
              </h1>
              <p className="text-sm text-gray-500">智能人脉搜索助手</p>
            </div>
          </div>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 输入区域 */}
        <div className="bg-white border-t px-8 py-4">
          <div className="max-w-3xl mx-auto flex space-x-4">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入你想查找的人名或描述..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="px-6"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 