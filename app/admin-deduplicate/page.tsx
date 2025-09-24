'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, RefreshCw, CheckCircle, Cloud } from 'lucide-react'
import Link from 'next/link'

export default function AdminDeduplicate() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isCloudProcessing, setIsCloudProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [cloudResult, setCloudResult] = useState<any>(null)

  const handleDeduplicate = async () => {
    setIsProcessing(true)
    try {
      const { deduplicateCompanies } = await import('@/lib/dataStore')
      const deduplicationResult = deduplicateCompanies()
      setResult(deduplicationResult)
      
      // 同步到云端（可选）
      try {
        const { listCompaniesFromCloud, upsertCompanyToCloud } = await import('@/lib/cloudStore')
        const { getCompanies } = await import('@/lib/dataStore')
        const companies = getCompanies()
        
        for (const company of companies) {
          await upsertCompanyToCloud(company)
        }
        console.log('企业去重结果已同步到云端')
      } catch (e) {
        console.warn('云端同步失败:', e)
      }
      
    } catch (error) {
      console.error('企业去重失败:', error)
      alert('去重失败: ' + error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCloudDeduplicate = async () => {
    setIsCloudProcessing(true)
    try {
      const response = await fetch('/api/deduplicate-cloud-companies', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        setCloudResult(data.result)
      } else {
        alert('云端去重失败: ' + data.message)
      }
    } catch (error) {
      console.error('云端去重失败:', error)
      alert('云端去重失败: ' + error)
    } finally {
      setIsCloudProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-2xl py-8">
        {/* 返回按钮 */}
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回控制台
          </Button>
        </Link>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-red-600">⚠️ 管理员工具：本地企业去重</CardTitle>
            <CardDescription>
              此功能会自动检测并合并本地存储中的重复企业记录。
              <br />
              <strong>注意：此操作不可逆，建议在使用前备份数据。</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!result ? (
              <div className="text-center">
                <Button 
                  onClick={handleDeduplicate}
                  disabled={isProcessing}
                  className="w-full"
                  variant={isProcessing ? "secondary" : "destructive"}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      正在处理企业去重...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      开始企业去重处理
                    </>
                  )}
                </Button>
                
                <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
                  <p><strong>去重规则：</strong></p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>自动识别名称相似的企业（忽略空格、括号等）</li>
                    <li>智能合并企业信息，保留所有有价值的数据</li>
                    <li>供应商、客户、产品信息会自动去重合并</li>
                    <li>选择更完整的企业名称作为主名称</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center text-green-600">
                  <CheckCircle className="mr-2 h-6 w-6" />
                  <span className="text-lg font-semibold">企业去重完成！</span>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">处理结果：</h3>
                  <div className="text-green-700 space-y-1">
                    <p>原始企业数量: <strong>{result.original}</strong></p>
                    <p>去重后数量: <strong>{result.deduplicated}</strong></p>
                    <p>合并的重复企业: <strong>{result.removed}</strong></p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="flex-1"
                  >
                    再次运行
                  </Button>
                  <Link href="/dashboard" className="flex-1">
                    <Button className="w-full">
                      返回控制台
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 云端去重卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-600">☁️ 云端企业去重（Supabase）</CardTitle>
            <CardDescription>
              此功能会清理Supabase云端数据库中的重复企业记录。
              <br />
              <strong>建议先执行本地去重，再执行云端去重。</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!cloudResult ? (
              <div className="text-center">
                <Button 
                  onClick={handleCloudDeduplicate}
                  disabled={isCloudProcessing}
                  className="w-full"
                  variant={isCloudProcessing ? "secondary" : "default"}
                >
                  {isCloudProcessing ? (
                    <>
                      <Cloud className="mr-2 h-4 w-4 animate-pulse" />
                      正在处理云端去重...
                    </>
                  ) : (
                    <>
                      <Cloud className="mr-2 h-4 w-4" />
                      开始云端企业去重
                    </>
                  )}
                </Button>
                
                <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
                  <p><strong>云端去重说明：</strong></p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>直接在Supabase数据库中执行去重</li>
                    <li>使用企业名称作为唯一标识</li>
                    <li>保留最早创建的记录，合并其他重复记录的信息</li>
                    <li>删除多余的重复记录</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center text-blue-600">
                  <CheckCircle className="mr-2 h-6 w-6" />
                  <span className="text-lg font-semibold">云端去重完成！</span>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">处理结果：</h3>
                  <div className="text-blue-700 space-y-1">
                    <p>原始企业数量: <strong>{cloudResult.original}</strong></p>
                    <p>去重后数量: <strong>{cloudResult.deduplicated}</strong></p>
                    <p>删除的重复企业: <strong>{cloudResult.deleted}</strong></p>
                    <p>更新的企业: <strong>{cloudResult.updated}</strong></p>
                  </div>
                </div>
                
                <Button 
                  onClick={() => setCloudResult(null)}
                  variant="outline"
                  className="w-full"
                >
                  重置
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
