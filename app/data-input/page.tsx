'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User, ArrowLeft } from 'lucide-react'
import AddPerson from '@/app/add/page'

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

        <h1 className="text-3xl font-bold text-center mb-8">信息录入</h1>

        <Card>
          <CardHeader>
            <CardTitle>信息录入</CardTitle>
            <CardDescription>在这里一次性录入个人与关联企业信息</CardDescription>
          </CardHeader>
          <CardContent>
            <AddPerson />
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 