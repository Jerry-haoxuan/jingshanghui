'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Building2, Target, Trophy, Star, Factory, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCompanies, CompanyData, loadCompaniesFromCloudIfAvailable } from '@/lib/dataStore'
import { SupplyChainDiagram } from '@/components/SupplyChainDiagram'

export default function CompanyDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const cloud = await loadCompaniesFromCloudIfAvailable()
      const companies = (cloud && cloud.length > 0) ? cloud : getCompanies()
      const foundCompany = companies.find(c => c.id === params.id)
      setCompany(foundCompany || null)
      setLoading(false)
    }
    load()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">企业信息未找到</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push('/dashboard')}
          >
            返回主页
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-8">
        {/* 返回按钮 */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => {
            const from = searchParams.get('from')
            if (from === 'companies') {
              router.push('/dashboard?tab=companies')
            } else {
              router.back()
            }
          }}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>

        {/* 企业名称和行业 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <Building2 className="h-6 w-6 text-green-600" />
            </div>
            {company.name}
          </h1>
          <p className="text-lg text-gray-600 mt-2">{company.industry} · {company.scale}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：企业介绍 */}
          <div className="space-y-6">
            {/* 企业定位 */}
            {company.positioning && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    1. 企业定位
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{company.positioning}</p>
                </CardContent>
              </Card>
            )}

            {/* 企业价值 */}
            {company.value && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-600" />
                    2. 企业价值
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{company.value}</p>
                </CardContent>
              </Card>
            )}

            {/* 关键成就 */}
            {company.achievements && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-green-600" />
                    3. 关键成就
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{company.achievements}</p>
                </CardContent>
              </Card>
            )}

            {/* 传统产品信息（如果存在） */}
            {(!company.positioning && !company.value && !company.achievements) && company.products && company.products.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-600" />
                    主要产品/服务
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1">
                    {company.products.map((product, index) => (
                      <li key={index} className="text-gray-700">{product}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* 其他信息 */}
            {company.additionalInfo && (
              <Card>
                <CardHeader>
                  <CardTitle>其他信息</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{company.additionalInfo}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右侧：供应链图谱 */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="w-5 h-5 text-indigo-600" />
                  供应链上下游关系图谱
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[600px]">
                  <SupplyChainDiagram 
                    company={company}
                    suppliers={company.suppliers || []}
                    customers={company.customers || []}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 