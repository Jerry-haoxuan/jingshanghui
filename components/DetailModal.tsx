'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, Building2, MapPin, Phone, Mail, Briefcase, GraduationCap, Users } from 'lucide-react'
import StaticRelationshipGraph from './StaticRelationshipGraph'
import { useRouter } from 'next/navigation'
import { getCompanies, getPeople, loadPeopleFromCloudIfAvailable, loadCompaniesFromCloudIfAvailable } from '@/lib/dataStore'
import { deterministicAliasName } from '@/lib/deterministicNameAlias'
import { loadRelationshipsFromCloud, getPersonRelationships } from '@/lib/relationshipManager'

interface DetailModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'person' | 'company'
  data: any
}

export default function DetailModal({ isOpen, onClose, type, data }: DetailModalProps) {
  const router = useRouter()
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] })

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

  // 加载真实的关系数据
  useEffect(() => {
    const loadGraphData = async () => {
      if (!data || !isOpen) return

      if (type === 'person') {
        // 加载云端数据
        const cloudPeople = await loadPeopleFromCloudIfAvailable()
        const cloudCompanies = await loadCompaniesFromCloudIfAvailable()
        const cloudRelationships = await loadRelationshipsFromCloud()
        
        const allPeople = cloudPeople || getPeople()
        const allCompanies = cloudCompanies || getCompanies()
        
        // 获取当前人物的关系
        const relationships = cloudRelationships
          ? cloudRelationships.filter(rel => 
              rel.personId === data.id || rel.relatedPersonId === data.id
            )
          : getPersonRelationships(data.id)
        
        const nodes: any[] = []
        const links: any[] = []
        
        // 添加中心人物节点
        nodes.push({
          id: data.id,
          name: data.name,
          type: 'person',
          group: 1
        })
        
        // 添加公司节点
        if (data.company) {
          const companyId = `company_${data.company}`
          nodes.push({
            id: companyId,
            name: data.company,
            type: 'company',
            group: 2
          })
          links.push({
            source: data.id,
            target: companyId,
            relationship: data.position || '就职于',
            strength: 1
          })
        }
        
        // 添加关系网络中的人物
        relationships.forEach(rel => {
          const relatedPersonId = rel.personId === data.id ? rel.relatedPersonId : rel.personId
          if (relatedPersonId) {
            const relatedPerson = allPeople.find(p => p.id === relatedPersonId)
            if (relatedPerson && !nodes.find(n => n.id === relatedPerson.id)) {
              nodes.push({
                id: relatedPerson.id,
                name: relatedPerson.name,
                type: 'person',
                group: 1
              })
              
              let relationshipText = rel.description || '关联'
              if (rel.relationshipType === 'colleague') {
                relationshipText = '同事'
              } else if (rel.relationshipType === 'schoolmate') {
                relationshipText = '校友'
              } else if (rel.relationshipType === 'industry_partner') {
                relationshipText = '行业伙伴'
              }
              
              links.push({
                source: data.id,
                target: relatedPerson.id,
                relationship: relationshipText,
                strength: rel.strength
              })
            }
          }
        })
        
        setGraphData({ nodes, links })
      } else {
        // 企业的关系图（简化版）
        const nodes = [
          { id: data.id, name: data.name, type: 'company' as const, group: 1 }
        ]
        const links: any[] = []
        
        // 可以添加相关人员
        const people = getPeople()
        const employees = people.filter(p => p.company === data.name).slice(0, 5)
        
        employees.forEach(person => {
          nodes.push({
            id: person.id,
            name: person.name,
            type: 'person' as const,
            group: 2
          })
          links.push({
            source: person.id,
            target: data.id,
            relationship: person.position || '就职于',
            strength: 1
          })
        })
        
        setGraphData({ nodes, links })
      }
    }
    
    loadGraphData()
  }, [data, type, isOpen])



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