'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRight, Network, Users, Building2, Target } from 'lucide-react'
import { useRouter } from 'next/navigation'
import StarryBackground from '@/components/StarryBackground'
import { UserRole, setUserRole, getUserRole } from '@/lib/userRole'
import { saveMemberAccount } from '@/lib/memberKeys'

export default function Home() {
  const [showDialog, setShowDialog] = useState(false)
  const [userType, setUserType] = useState<UserRole | null>(null)
  const [betaCode, setBetaCode] = useState('')
  const [error, setError] = useState('')
  const [isClient, setIsClient] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null)
  const router = useRouter()

  // 确保客户端渲染的标志
  useEffect(() => {
    setIsClient(true)
    
    // 检查当前登录状态，但不自动跳转
    const existingRole = getUserRole()
    if (existingRole) {
      console.log('[Client] 发现已有登录状态:', existingRole)
      setCurrentUserRole(existingRole)
    }
  }, [router])

  const handleUserTypeSelect = (type: UserRole) => {
    setUserType(type)
    setError('')
    setBetaCode('')
  }

  const handleBetaAccess = async () => {
    try {
      console.log('[Client] 开始登录流程:', { userType, betaCode })
      
      // 调用登录API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userType,
          betaCode
        })
      })

      console.log('[Client] API响应状态:', response.status)
      console.log('[Client] 响应头:', Object.fromEntries(response.headers.entries()))

      const data = await response.json()
      console.log('[Client] API响应数据:', data)

      if (response.ok && data.success) {
        console.log('[Client] 登录成功，设置localStorage')
        
        // 在客户端也设置localStorage
        setUserRole(userType as UserRole)
        
        // 如果是会员登录，保存会员信息
        if (data.memberAccount) {
          saveMemberAccount(data.memberAccount)
          console.log('[Client] 会员信息已保存:', data.memberAccount)
        }
        
        // 检查Cookie是否被设置
        console.log('[Client] 当前所有Cookies:', document.cookie)
        
        console.log('[Client] 跳转到dashboard')
        // 跳转到dashboard
        router.push('/dashboard')
      } else {
        console.log('[Client] 登录失败:', data.message)
        setError(data.message || '无效的内测码，请重试')
      }
    } catch (error) {
      console.error('[Client] 登录过程中出错:', error)
      setError('登录失败，请稍后重试')
    }
  }

  const handleBack = () => {
    setUserType(null)
    setBetaCode('')
    setError('')
  }

  // 在hydration期间显示简单的加载状态
  if (!isClient) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-black">
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="text-white">加载中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 星空背景 */}
      <StarryBackground />
      
      {/* 内容层 */}
      <div className="relative z-10 min-h-screen">
        {/* 导航栏 */}
        <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/20 backdrop-blur-lg">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <Network className="h-6 w-6 text-white" />
              <span className="font-bold text-xl text-white">精尚慧</span>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/updates" className="text-sm text-gray-300 hover:text-white">更新内容</a>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="container flex flex-col items-center justify-center py-20 md:py-32 gap-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-white">
              产业生态圈
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">基石人</span>
            </h1>
            <p className="max-w-[700px] text-lg text-gray-300 sm:text-xl">
              连接产业关系，发现商业机会。通过智能化的人脉网络分析，帮助您找到关键连接点。
            </p>
          </div>

          {/* 显示当前登录状态 */}
          {currentUserRole && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 max-w-md">
              <p className="text-white mb-3">
                您当前已登录为 <span className="font-semibold">{currentUserRole === 'member' ? '会员' : '管理者'}</span>
              </p>
              <div className="flex gap-3 justify-center">
                <Button 
                  size="sm"
                  variant="outline"
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  onClick={() => router.push('/dashboard')}
                >
                  欢迎登入
                </Button>
                <Button 
                  size="sm"
                  variant="outline"
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem('userRole')
                    }
                    setCurrentUserRole(null)
                    setShowDialog(true)
                  }}
                >
                  切换账号
                </Button>
              </div>
            </div>
          )}

          {/* 开始内测按钮 */}
          {!currentUserRole && (
            <Button 
              size="lg" 
              className="h-12 px-8 text-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0"
              onClick={() => setShowDialog(true)}
            >
              开始内测
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </section>

        {/* Features Section */}
        <section className="container py-20 md:py-32">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-white">
              我们解决什么问题
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors">
              <div className="rounded-full bg-blue-500/20 p-4">
                <Users className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white">人脉网络可视化</h3>
              <p className="text-gray-400">
                将隐形的社交网络变为可见的关系图谱，直观展示人际连接
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors">
              <div className="rounded-full bg-purple-500/20 p-4">
                <Building2 className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white">产业链关系挖掘</h3>
              <p className="text-gray-400">
                基于AI算法分析企业间的上下游关系，发现潜在商业机会
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors">
              <div className="rounded-full bg-pink-500/20 p-4">
                <Target className="h-8 w-8 text-pink-400" />
              </div>
              <h3 className="text-xl font-bold text-white">精准连接推荐</h3>
              <p className="text-gray-400">
                基于六度分隔理论，为您推荐最有价值的人脉连接路径
              </p>
            </div>
          </div>
        </section>

        {/* 内测码验证弹窗 */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-[425px] bg-black/90 backdrop-blur-xl border border-white/20">
            <DialogHeader>
              <DialogTitle className="text-white">
                {userType === null ? '选择用户类型' : userType === UserRole.MEMBER ? '输入会员密钥' : '输入内测码'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {userType === null 
                  ? '请选择您的身份以继续' 
                  : `请输入${userType === UserRole.MEMBER ? '会员密钥' : '管理者'}内测码`}
                {userType !== null && (
                  <div className="text-xs text-green-400 mt-2">
                    💡 登录后将保持90天有效，无需重复输入{userType === UserRole.MEMBER ? '密钥' : '密码'}
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            
            {userType === null ? (
              // 用户类型选择界面
              <div className="space-y-4 py-4">
                <Button
                  onClick={() => handleUserTypeSelect(UserRole.MEMBER)}
                  className="w-full h-16 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 flex flex-col items-center justify-center gap-1"
                >
                  <span className="text-lg font-semibold">我是精尚慧会员</span>
                  <span className="text-sm opacity-90">体验人脉网络功能</span>
                </Button>
                
                <Button
                  onClick={() => handleUserTypeSelect(UserRole.MANAGER)}
                  className="w-full h-16 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 flex flex-col items-center justify-center gap-1"
                >
                  <span className="text-lg font-semibold">我是精尚慧管理者</span>
                  <span className="text-sm opacity-90">完整管理功能</span>
                </Button>
              </div>
            ) : (
              // 内测码输入界面
              <div className="space-y-4 py-4">
                <Input
                  placeholder={`请输入${userType === UserRole.MEMBER ? '会员密钥（格式：JSH-XXX-XXXXXXXX）' : '管理者内测码'}`}
                  value={betaCode}
                  onChange={(e) => {
                    setBetaCode(e.target.value)
                    setError('')
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleBetaAccess()
                    }
                  }}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                />
                {error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                  >
                    返回
                  </Button>
                  <Button 
                    onClick={handleBetaAccess}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0"
                  >
                    验证并进入
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 