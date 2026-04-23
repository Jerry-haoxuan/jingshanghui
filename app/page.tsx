'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowRight, Network, Users, Building2, Target, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import StarryBackground from '@/components/StarryBackground'
import { UserRole, setUserRole, getUserRole } from '@/lib/userRole'
import { loginUser, registerUser, saveCurrentUser, clearCurrentUser } from '@/lib/userStore'

export default function Home() {
  const [showDialog, setShowDialog] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null)

  // 登录表单
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // 注册表单
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [regInviteCode, setRegInviteCode] = useState('')
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [regSuccess, setRegSuccess] = useState(false)

  const router = useRouter()

  useEffect(() => {
    setIsClient(true)
    const existingRole = getUserRole()
    if (!existingRole) return

    setCurrentUserRole(existingRole)

    // 已登录：直接跳转，不停留在首页
    if (existingRole === UserRole.MANAGER) {
      router.push('/dashboard')
      return
    }

    // 会员：跳转到生态商圈主页面
    router.push('/business-circle')
  }, [])

  // 设置 Cookie 并跳转（直接使用传入的 account，不读 localStorage 避免残留数据）
  const setCookieAndRedirect = async (role: UserRole, account: import('@/lib/userStore').UserAccount) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userType: role, username: account.username }),
    })

    if (!response.ok) {
      throw new Error('设置会话失败')
    }

    setUserRole(role)

    if (role === UserRole.MANAGER) {
      router.push('/dashboard')
      return
    }

    // 会员：跳转到生态商圈主页面
    router.push('/business-circle')
  }

  const handleLogin = async () => {
    setLoginError('')
    setLoginLoading(true)
    try {
      const result = await loginUser(loginUsername, loginPassword)
      if (!result.success || !result.role || !result.account) {
        setLoginError(result.message)
        return
      }
      saveCurrentUser(result.account)
      await setCookieAndRedirect(result.role as UserRole, result.account)
    } catch {
      setLoginError('登录失败，请稍后重试')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegister = async () => {
    setRegError('')

    if (regPassword !== regConfirmPassword) {
      setRegError('两次输入的密码不一致')
      return
    }

    setRegLoading(true)
    try {
      const result = await registerUser(regUsername, regPassword, regInviteCode)
      if (!result.success || !result.role || !result.account) {
        setRegError(result.message)
        return
      }
      saveCurrentUser(result.account)
      setRegSuccess(true)
      // 短暂显示成功后跳转
      setTimeout(async () => {
        await setCookieAndRedirect(result.role as UserRole, result.account!)
      }, 800)
    } catch {
      setRegError('注册失败，请稍后重试')
    } finally {
      setRegLoading(false)
    }
  }

  const handleOpenDialog = () => {
    setLoginUsername('')
    setLoginPassword('')
    setLoginError('')
    setRegUsername('')
    setRegPassword('')
    setRegConfirmPassword('')
    setRegInviteCode('')
    setRegError('')
    setRegSuccess(false)
    setShowDialog(true)
  }

  const handleContinue = async () => {
    if (currentUserRole === UserRole.MANAGER) {
      router.push('/dashboard')
      return
    }
    router.push('/business-circle')
  }

  if (!isClient || currentUserRole) {
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
      <StarryBackground />

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

          {/* 已登录状态 */}
          {currentUserRole && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 max-w-md">
              <p className="text-white mb-3">
                您当前已登录为{' '}
                <span className="font-semibold">{currentUserRole === 'member' ? '会员' : '管理者'}</span>
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  onClick={handleContinue}
                >
                  欢迎登入
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  onClick={() => {
                    localStorage.removeItem('userRole')
                    clearCurrentUser()
                    setCurrentUserRole(null)
                    handleOpenDialog()
                  }}
                >
                  切换账号
                </Button>
              </div>
            </div>
          )}

          {/* 登录按钮 */}
          {!currentUserRole && (
            <Button
              size="lg"
              className="h-12 px-8 text-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0"
              onClick={handleOpenDialog}
            >
              登录 / 注册
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
              <p className="text-gray-400">将隐形的社交网络变为可见的关系图谱，直观展示人际连接</p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors">
              <div className="rounded-full bg-purple-500/20 p-4">
                <Building2 className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white">产业链关系挖掘</h3>
              <p className="text-gray-400">基于AI算法分析企业间的上下游关系，发现潜在商业机会</p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors">
              <div className="rounded-full bg-pink-500/20 p-4">
                <Target className="h-8 w-8 text-pink-400" />
              </div>
              <h3 className="text-xl font-bold text-white">精准连接推荐</h3>
              <p className="text-gray-400">基于六度分隔理论，为您推荐最有价值的人脉连接路径</p>
            </div>
          </div>
        </section>

        {/* 登录/注册弹窗 */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-[440px] bg-black/90 backdrop-blur-xl border border-white/20 p-0 overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-0">
              <DialogTitle className="text-white text-xl flex items-center gap-2">
                <Network className="h-5 w-5 text-blue-400" />
                精尚慧生态圈
              </DialogTitle>
              <DialogDescription className="text-gray-400 text-sm">
                登录已有账号，或使用邀请码注册新账号
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="login" className="w-full">
              <div className="px-6 pt-4">
                <TabsList className="w-full bg-white/10 border border-white/10">
                  <TabsTrigger
                    value="login"
                    className="flex-1 data-[state=active]:bg-blue-500/80 data-[state=active]:text-white text-gray-300"
                  >
                    <LogIn className="h-4 w-4 mr-1.5" />
                    登录
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="flex-1 data-[state=active]:bg-purple-500/80 data-[state=active]:text-white text-gray-300"
                  >
                    <UserPlus className="h-4 w-4 mr-1.5" />
                    注册
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* 登录 */}
              <TabsContent value="login" className="px-6 pb-6 mt-0">
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">用户名</Label>
                    <Input
                      placeholder="请输入用户名"
                      value={loginUsername}
                      onChange={e => { setLoginUsername(e.target.value); setLoginError('') }}
                      onKeyDown={e => e.key === 'Enter' && handleLogin()}
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-blue-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">密码</Label>
                    <div className="relative">
                      <Input
                        type={showLoginPassword ? 'text' : 'password'}
                        placeholder="请输入密码"
                        value={loginPassword}
                        onChange={e => { setLoginPassword(e.target.value); setLoginError('') }}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-blue-400 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {loginError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
                      <p className="text-sm text-red-400">{loginError}</p>
                    </div>
                  )}

                  <Button
                    onClick={handleLogin}
                    disabled={loginLoading}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 h-10"
                  >
                    {loginLoading ? '登录中...' : '登录'}
                  </Button>

                  <p className="text-center text-xs text-gray-500">
                    登录后将保持 90 天有效
                  </p>
                </div>
              </TabsContent>

              {/* 注册 */}
              <TabsContent value="register" className="px-6 pb-6 mt-0">
                {regSuccess ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="text-4xl">🎉</div>
                    <p className="text-white font-semibold">注册成功！</p>
                    <p className="text-gray-400 text-sm">正在为您跳转...</p>
                  </div>
                ) : (
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">用户名</Label>
                      <Input
                        placeholder="请设置用户名（2-20个字符）"
                        value={regUsername}
                        onChange={e => { setRegUsername(e.target.value); setRegError('') }}
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-purple-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">密码</Label>
                      <div className="relative">
                        <Input
                          type={showRegPassword ? 'text' : 'password'}
                          placeholder="请设置密码（至少6位）"
                          value={regPassword}
                          onChange={e => { setRegPassword(e.target.value); setRegError('') }}
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-purple-400 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                        >
                          {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">确认密码</Label>
                      <Input
                        type="password"
                        placeholder="再次输入密码"
                        value={regConfirmPassword}
                        onChange={e => { setRegConfirmPassword(e.target.value); setRegError('') }}
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-purple-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">内测邀请码</Label>
                      <Input
                        placeholder="请输入邀请码（如：ECO-INV-XXXXXXXX）"
                        value={regInviteCode}
                        onChange={e => { setRegInviteCode(e.target.value.toUpperCase()); setRegError('') }}
                        onKeyDown={e => e.key === 'Enter' && handleRegister()}
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-purple-400 font-mono"
                      />
                      <p className="text-xs text-gray-500">需要有效的内测邀请码才能注册</p>
                    </div>

                    {regError && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
                        <p className="text-sm text-red-400">{regError}</p>
                      </div>
                    )}

                    <Button
                      onClick={handleRegister}
                      disabled={regLoading}
                      className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0 h-10"
                    >
                      {regLoading ? '注册中...' : '注册账号'}
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
