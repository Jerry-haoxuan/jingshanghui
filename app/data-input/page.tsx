'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Building2, ArrowLeft } from 'lucide-react'

export default function DataInputChoice() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* 返回按钮 */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回主页
        </Button>

        <h1 className="text-3xl font-bold text-center mb-8">选择录入类型</h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* 个人录入选项 */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push('/add')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle>个人录入</CardTitle>
              <CardDescription>
                录入个人信息，包括姓名、公司、联系方式等
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• 基本信息（姓名、电话、邮箱）</li>
                <li>• 工作信息（公司、职位、行业）</li>
                <li>• 教育背景（学校、专业）</li>
                <li>• 地域信息（现居地、家乡）</li>
              </ul>
              <Button className="w-full mt-4" variant="outline">
                开始个人录入
              </Button>
            </CardContent>
          </Card>

          {/* 企业录入选项 */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push('/company-input')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Building2 className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle>企业录入</CardTitle>
              <CardDescription>
                录入企业信息，包括定位、价值、供应链等
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• 企业定位（我们是做什么的）</li>
                <li>• 企业价值（为什么选择我们）</li>
                <li>• 关键成就（证明实力）</li>
                <li>• 供应链关系（上下游企业）</li>
              </ul>
              <Button className="w-full mt-4" variant="outline">
                开始企业录入
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 