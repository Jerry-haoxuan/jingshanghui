'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, Building2, MapPin, Phone, Mail, Briefcase, GraduationCap, Users } from 'lucide-react'
import StaticRelationshipGraph from './StaticRelationshipGraph'
import { useRouter } from 'next/navigation'
import { getCompanies } from '@/lib/dataStore'
import { deterministicAliasName } from '@/lib/deterministicNameAlias'

interface DetailModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'person' | 'company'
  data: any
}

export default function DetailModal({ isOpen, onClose, type, data }: DetailModalProps) {
  const router = useRouter()

  if (!data) return null

  // 处理节点点击事件
  const handleNodeClick = (node: any) => {
    if (node.type === 'company') {
      // 点击公司节点，跳转到企业详情页
      const companies = getCompanies()
      const company = companies.find(c => c.name === node.name)
      if (company) {
        onClose() // 关闭模态框
        router.push(`/company/${company.id}`)
      } else {
        // 如果没有找到公司详情，跳转到企业列表并显示提示
        onClose() // 关闭模态框
        router.push('/dashboard?tab=companies')
        setTimeout(() => {
          alert(`未找到"${node.name}"的详细信息。\n\n你可以在企业列表中手动创建该企业的详细信息。`)
        }, 100)
      }
    } else if (node.type === 'person' && node.id !== data.id) {
      // 点击人物节点，跳转到该人物详情页
      onClose() // 关闭模态框
      router.push(`/person/${node.id}`)
    }
    // 如果是当前人物节点，不做任何处理
  }

  // 模拟关系图谱数据
  const graphData = {
    nodes: [
      { id: data.id, name: type === 'person' ? deterministicAliasName(data.name) : data.name, type: type as 'person' | 'company', group: 1 },
      ...(type === 'person' ? [
        { id: 'c1', name: data.company, type: 'company' as const, group: 2 },
        { id: 'p2', name: '同事A', type: 'person' as const, group: 1 },
        { id: 'p3', name: '同事B', type: 'person' as const, group: 1 },
      ] : [
        { id: 'p1', name: '员工A', type: 'person' as const, group: 2 },
        { id: 'p2', name: '员工B', type: 'person' as const, group: 2 },
        { id: 'p3', name: '员工C', type: 'person' as const, group: 2 },
        { id: 'c2', name: '合作企业', type: 'company' as const, group: 1 },
      ])
    ],
    links: type === 'person' ? [
      { source: data.id, target: 'c1', relationship: '就职于', strength: 1 },
      { source: data.id, target: 'p2', relationship: '同事', strength: 0.8 },
      { source: data.id, target: 'p3', relationship: '同事', strength: 0.8 },
      { source: 'p2', target: 'p3', relationship: '同事', strength: 0.8 },
    ] : [
      { source: 'p1', target: data.id, relationship: '就职于', strength: 1 },
      { source: 'p2', target: data.id, relationship: '就职于', strength: 1 },
      { source: 'p3', target: data.id, relationship: '就职于', strength: 1 },
      { source: data.id, target: 'c2', relationship: '合作关系', strength: 0.9 },
    ]
  }



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {type === 'person' ? '人物详情' : '企业详情'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
          {/* 左侧：基本信息 */}
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-xl font-semibold mb-3">{type === 'person' ? deterministicAliasName(data.name) : data.name}</h3>
              
              {type === 'person' ? (
                <>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Briefcase className="h-4 w-4 text-gray-500" />
                      <span>{data.position} @ {data.company}</span>
                    </div>
                    {data.industry && (
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        <span>{data.industry}</span>
                      </div>
                    )}
                    {data.currentCity && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span>现居: {data.currentCity}</span>
                      </div>
                    )}
                    {data.hometown && data.hometown !== data.currentCity && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span>家乡: {data.hometown}</span>
                      </div>
                    )}
                    {!data.currentCity && data.location && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span>{data.location}</span>
                      </div>
                    )}
                    {data.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span>{data.phone}</span>
                      </div>
                    )}
                    {data.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span>{data.email}</span>
                      </div>
                    )}
                    {data.school && (
                      <div className="flex items-center space-x-2">
                        <GraduationCap className="h-4 w-4 text-gray-500" />
                        <span>{data.school}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">标签</h4>
                    <div className="flex flex-wrap gap-2">
                      {data.tags?.map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span>{data.industry}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span>规模: {data.scale}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">主要产品/服务</h4>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {data.products?.map((product: string, index: number) => (
                        <li key={index}>{product}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {data.additionalInfo && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">其他信息</h4>
                  <p className="text-sm text-gray-600">{data.additionalInfo}</p>
                </div>
              )}
            </div>
          </div>

          {/* 右侧：关系图谱 */}
          <div className="lg:col-span-2 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">关系网络</h3>
            <div className="h-96 border border-gray-200 rounded bg-white">
              <StaticRelationshipGraph
                nodes={graphData.nodes}
                links={graphData.links}
                centerNodeId={data.id}
                onNodeClick={handleNodeClick}
                isModal={true}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 