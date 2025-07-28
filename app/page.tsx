'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRight, Network, Users, Building2, Target } from 'lucide-react'
import { useRouter } from 'next/navigation'
import StarryBackground from '@/components/StarryBackground'
import { UserRole, setUserRole } from '@/lib/userRole'

export default function Home() {
  const [showDialog, setShowDialog] = useState(false)
  const [userType, setUserType] = useState<UserRole | null>(null)
  const [betaCode, setBetaCode] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleUserTypeSelect = (type: UserRole) => {
    setUserType(type)
    setError('')
    setBetaCode('')
  }

  const handleBetaAccess = () => {
    // 验证内测码
    if (userType === UserRole.MANAGER && betaCode === 'ECOSYSTEM2024') {
      setUserRole(UserRole.MANAGER)
      router.push('/dashboard')
    } else if (userType === UserRole.MEMBER && betaCode === 'MEMBER2024') {
      // 会员使用不同的内测码
      setUserRole(UserRole.MEMBER)
      router.push('/dashboard')
    } else {
      setError('无效的内测码，请重试')
    }
  }

  const handleBack = () => {
    setUserType(null)
    setBetaCode('')
    setError('')
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 星空背景 */}
      <StarryBackground />
      
      {/* 内容层 */}
      <div className="relative z-10 min-h-screen">
        {/* 导航栏 */}
        <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/20 backdrop-blur-lg">
          <div className="container flex h-16 items-center">
            <div className="flex items-center space-x-2">
              <Network className="h-6 w-6 text-white" />
              <span className="font-bold text-xl text-white">精尚慧</span>
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

          <Button 
            size="lg" 
            className="h-12 px-8 text-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0"
            onClick={() => setShowDialog(true)}
          >
            开始内测
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
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
                {userType === null ? '选择用户类型' : '输入内测码'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {userType === null 
                  ? '请选择您的身份以继续' 
                  : `请输入${userType === UserRole.MEMBER ? '会员' : '管理者'}内测码`}
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
                  placeholder={`请输入${userType === UserRole.MEMBER ? '会员' : '管理者'}内测码`}
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