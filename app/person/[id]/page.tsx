'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Phone, Mail, MapPin, Building2, GraduationCap, Briefcase, User, Eye, Calendar, Shield, Users, Edit } from 'lucide-react'
import Link from 'next/link'
import { getPeople, getCompanies, PersonData, CompanyData, loadPeopleFromCloudIfAvailable, loadCompaniesFromCloudIfAvailable } from '@/lib/dataStore'
import StaticRelationshipGraph from '@/components/StaticRelationshipGraph'
import { getPersonRelationships } from '@/lib/relationshipManager'
import { deterministicAliasName } from '@/lib/deterministicNameAlias'
import { isMember, isManager } from '@/lib/userRole'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import PersonEditModal from '@/components/PersonEditModal'
import { isViewingOwnCard } from '@/lib/memberKeys'

export default function PersonDetail() {
  const params = useParams()
  const router = useRouter()
  const [person, setPerson] = useState<PersonData | null>(null)
  const [graphData, setGraphData] = useState<any>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showContactDialog, setShowContactDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [isClient, setIsClient] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editFormData, setEditFormData] = useState<PersonData | null>(null)
  const [viewingOwnCard, setViewingOwnCard] = useState(false)
  
  // 获取显示名称（如果是查看自己的卡片，显示真实信息）
  const getDisplayName = (realName: string) => {
    if (viewingOwnCard || isManager()) {
      return realName
    }
    return deterministicAliasName(realName)
  }

  // 判断这个人是否填过任何有分析价值的资料（公司/职位/行业/学校等）。
  // 像"注册了手机号但从没填过信息"的空壳档案，AI分析永远只会得到0条结果，
  // 如果不做这个判断，每次打开页面都会因为"关系数为0"而重新触发一次AI调用，白白浪费费用。
  const hasSubstantiveProfileData = (p: PersonData): boolean => {
    return Boolean(
      (p.company && p.company.trim()) ||
      (p.position && p.position.trim()) ||
      (p.industry && p.industry.trim()) ||
      (p.school && p.school.trim()) ||
      (Array.isArray(p.allCompanies) && p.allCompanies.length > 0) ||
      (Array.isArray(p.educations) && p.educations.length > 0)
    )
  }

  // 仅为当前这一个人补充关系分析，在后台异步执行，不阻塞页面展示、不影响其他人的关系数据
  const analyzeThisPersonInBackground = async (targetPerson: PersonData) => {
    try {
      const { updateRelationshipNetwork, loadRelationshipsFromCloud } = await import('@/lib/relationshipManager')
      await updateRelationshipNetwork(targetPerson)
      const refreshedRelationships = await loadRelationshipsFromCloud()
      const latestPeople = (await loadPeopleFromCloudIfAvailable()) || getPeople()
      const latestComps = await loadCompaniesFromCloudIfAvailable().catch(() => null)
      setGraphData(generateGraphData(targetPerson, refreshedRelationships || undefined, latestPeople, latestComps || undefined))
      console.log('[PersonDetail] 后台关系补充分析完成')
    } catch (error) {
      console.error('[PersonDetail] 后台关系补充分析失败:', error)
    }
  }

  // 生成动态关系图谱数据
  const generateGraphData = (currentPerson: PersonData, cloudRelationships?: any[], cloudPeople?: PersonData[], cloudCompanies?: CompanyData[]) => {
    // 优先使用云端数据，否则使用本地数据
    const allPeople = cloudPeople || getPeople()
    const allCompanies = cloudCompanies || getCompanies()
    
    console.log('[generateGraphData] 输入参数:')
    console.log('  - currentPerson:', currentPerson.name, currentPerson.id)
    console.log('  - cloudRelationships:', cloudRelationships?.length || 0, '条')
    console.log('  - allPeople:', allPeople.length, '人')
    
    // 优先使用传入的云端关系数据，否则尝试从本地获取
    const relationships = cloudRelationships 
      ? cloudRelationships.filter(rel => 
          rel.personId === currentPerson.id || rel.relatedPersonId === currentPerson.id
        )
      : getPersonRelationships(currentPerson.id)
    
    console.log('[generateGraphData] 过滤后的关系数据:', relationships.length, '条')
    if (relationships.length > 0) {
      console.log('[generateGraphData] 关系详情:', relationships.map(r => ({
        personId: r.personId,
        relatedPersonId: r.relatedPersonId,
        type: r.relationshipType
      })))
    }
    
    const nodes: any[] = []
    const links: any[] = []
    
    // 添加中心人物节点
    nodes.push({
      id: currentPerson.id,
      name: currentPerson.name,  // 传入原始名字，让StaticRelationshipGraph统一处理
      type: 'person',
      group: 1
    })
    
    // 添加公司节点
    const addedCompanies = new Set();
    (currentPerson?.allCompanies || [{company: currentPerson?.company || '', position: currentPerson?.position || ''}]).forEach((comp: {company: string, position: string}) => {
      if (comp.company && !addedCompanies.has(comp.company)) {
        addedCompanies.add(comp.company)
        const companyId = `company_${comp.company}`
        const matchingCompany = allCompanies.find(c => c.name === comp.company)
        nodes.push({
          id: companyId,
          name: comp.company,
          type: 'company',
          group: 2,
          companyData: matchingCompany
        })
        links.push({
          source: currentPerson.id,
          target: companyId,
          relationship: `${comp.position || '就职于'}`,
          strength: 1
        })
      }
    })
    
    // 注释掉学校节点的添加 - 根据用户要求，不显示人与学校的连接
    // const addedSchools = new Set();
    // (currentPerson?.educations || (currentPerson?.school ? [{school: currentPerson?.school || '', level: '', major: '', year: ''}] : [])).forEach((edu: {school: string, level?: string, major?: string, year?: string}) => {
    //   if (edu.school && !addedSchools.has(edu.school)) {
    //     addedSchools.add(edu.school)
    //     const schoolId = `school_${edu.school}`
    //     nodes.push({
    //       id: schoolId,
    //       name: `${edu.level ? edu.level + ' - ' : ''}${edu.school}`,
    //       type: 'school',
    //       group: 3
    //     })
    //     links.push({
    //       source: currentPerson.id,
    //       target: schoolId,
    //       relationship: `${edu.major ? edu.major + ' 毕业于' : '毕业于'}${edu.year ? ' (' + edu.year + ')' : ''}`,
    //       strength: 0.7
    //     })
    //   }
    // })
    
    // 添加关系网络中的人物节点
    console.log('[generateGraphData] 开始处理', relationships.length, '个关系')
    relationships.forEach((rel, index) => {
      const relatedPersonId = rel.personId === currentPerson.id ? rel.relatedPersonId : rel.personId
      console.log(`[generateGraphData] 关系${index + 1}:`, {
        relatedPersonId,
        relPersonId: rel.personId,
        relRelatedPersonId: rel.relatedPersonId,
        currentPersonId: currentPerson.id
      })
      
      if (relatedPersonId) {
        const relatedPerson = allPeople.find(p => p.id === relatedPersonId)
        console.log(`[generateGraphData] 查找人物 ${relatedPersonId}:`, relatedPerson ? `找到 ${relatedPerson.name}` : '未找到')
        console.log(`[generateGraphData] allPeople的ID列表:`, allPeople.map(p => p.id))
        
        if (relatedPerson && !nodes.find(n => n.id === relatedPerson.id)) {
          nodes.push({
            id: relatedPerson.id,
            name: relatedPerson.name,  // 传入原始名字，让StaticRelationshipGraph统一处理
            type: 'person',
            group: 1
          })
          
          // 根据关系类型设置关系描述
          let relationshipText = rel.description || '关联'
          if (rel.relationshipType === 'colleague') {
            relationshipText = '同事'
          } else if (rel.relationshipType === 'schoolmate') {
            // 对于校友关系，尝试找出具体的学校名称
            const currentSchools = currentPerson.educations?.map(e => e.school) || 
                                 (currentPerson.school ? [currentPerson.school] : [])
            const relatedSchools = relatedPerson.educations?.map(e => e.school) || 
                                 (relatedPerson.school ? [relatedPerson.school] : [])
            const commonSchool = currentSchools.find(school => relatedSchools.includes(school))
            relationshipText = commonSchool ? `${commonSchool}校友` : '校友'
          } else if (rel.relationshipType === 'industry_partner') {
            relationshipText = '行业伙伴'
          } else if (rel.relationshipType === 'business_contact') {
            relationshipText = '业务联系'
          } else if (rel.relationshipType === 'superior' || rel.relationshipType === 'subordinate') {
            // 上级和下属关系统一显示为"同事"
            relationshipText = '同事'
          }
          
          links.push({
            source: currentPerson.id,
            target: relatedPerson.id,
            relationship: relationshipText,
            strength: rel.strength
          })
        }
      }
    })
    
    // 如果没有关系数据，添加同公司的人员作为同事和校友
    if (relationships.length === 0) {
      const colleagues = allPeople.filter(p => 
        p.id !== currentPerson.id && 
        p.company === currentPerson.company
      )
      
      colleagues.forEach(colleague => {
        if (!nodes.find(n => n.id === colleague.id)) {
          nodes.push({
            id: colleague.id,
            name: colleague.name, // 传入原始名字，让StaticRelationshipGraph统一处理
            type: 'person',
            group: 1
          })
          
          links.push({
            source: currentPerson.id,
            target: colleague.id,
            relationship: '同事',
            strength: 0.8
          })
        }
      })
      
      // 添加校友关系
      const schoolmates = allPeople.filter(p => {
        if (p.id === currentPerson.id) return false
        
        // 检查教育背景是否有交集
        const currentSchools = currentPerson.educations?.map(e => e.school) || 
                             (currentPerson.school ? [currentPerson.school] : [])
        const pSchools = p.educations?.map(e => e.school) || 
                        (p.school ? [p.school] : [])
        
        return currentSchools.some(school => school && pSchools.includes(school))
      })
      
      schoolmates.forEach(schoolmate => {
        if (!nodes.find(n => n.id === schoolmate.id)) {
          nodes.push({
            id: schoolmate.id,
            name: schoolmate.name,
            type: 'person',
            group: 1
          })
          
          // 找出共同的学校
          const currentSchools = currentPerson.educations?.map(e => e.school) || 
                               (currentPerson.school ? [currentPerson.school] : [])
          const sSchools = schoolmate.educations?.map(e => e.school) || 
                          (schoolmate.school ? [schoolmate.school] : [])
          const commonSchool = currentSchools.find(school => school && sSchools.includes(school))
          
          links.push({
            source: currentPerson.id,
            target: schoolmate.id,
            relationship: commonSchool ? `${commonSchool}校友` : '校友',
            strength: 0.6
          })
        }
      })
    }
    
    return { nodes, links }
  }

  useEffect(() => {
    // 设置客户端标志
    setIsClient(true)
    
    // 确保在客户端环境中加载数据
    if (typeof window === 'undefined') return

    console.log('person页面开始加载，ID:', params.id)

    setIsLoading(true)
    
    // 延迟一帧确保组件完全挂载，并多次尝试加载数据
    let attempts = 0
    const maxAttempts = 3
    
    const tryLoadData = async () => {
      attempts++
      console.log(`第${attempts}次尝试加载数据`)
      
      try {
        // 优先云端（与dashboard保持一致的策略）
        const cloudPeople = await loadPeopleFromCloudIfAvailable()
        const people = cloudPeople !== null ? cloudPeople : getPeople()
        console.log('加载的人物数据:', people.length, '个人物')
        console.log('人物数据详情:', people.map(p => ({ id: p.id, name: p.name })))
        
        if (people.length === 0) {
          if (attempts < maxAttempts) {
            console.log('数据为空，1秒后重试...')
            setTimeout(tryLoadData, 1000)
            return
          } else {
            console.error('多次尝试后仍无数据')
            setError('数据库中暂无人物数据。请先通过"信息录入"添加人物信息。')
            setIsLoading(false)
            return
          }
        }
        
        const foundPerson = people.find(p => p.id === params.id)
        console.log('查找人物ID:', params.id, '类型:', typeof params.id)
        console.log('找到的人物:', foundPerson?.name)
        console.log('可用的人物IDs:', people.map(p => ({ id: p.id, type: typeof p.id })))
        
        if (foundPerson) {
          console.log('成功找到人物，设置数据')
          setPerson(foundPerson)
          setError('')
          
          // 检查是否是查看自己的卡片
          const isOwnCard = isViewingOwnCard(foundPerson.id)
          setViewingOwnCard(isOwnCard)
          console.log('[PersonDetail] 查看自己的卡片:', isOwnCard)
          
          // 确保公司列表也尝试云端
          await loadCompaniesFromCloudIfAvailable().catch(() => {})
          
          // 从云端加载关系数据
          const { loadRelationshipsFromCloud } = await import('@/lib/relationshipManager')
          const cloudRelationships = await loadRelationshipsFromCloud()
          console.log('[PersonDetail] 云端关系数据:', cloudRelationships?.length || 0, '条')
          
          // 先用当前已有的关系数据渲染页面，不等待AI分析，避免长时间卡在加载动画
          const cloudComps = await loadCompaniesFromCloudIfAvailable()
          setGraphData(generateGraphData(foundPerson, cloudRelationships || undefined, people, cloudComps || undefined))
          setIsLoading(false)
          
          // 如果这个人还没有关系数据，在后台异步补充分析（只分析这一个人，不会影响/清空其他人的关系数据）
          const relationships = getPersonRelationships(foundPerson.id)
          if (relationships.length === 0 && hasSubstantiveProfileData(foundPerson)) {
            console.log('未找到关系数据，后台异步补充分析...')
            analyzeThisPersonInBackground(foundPerson)
          } else {
            console.log('[PersonDetail] 找到', relationships.length, '条关系')
          }
        } else {
          // 尝试将参数转换为字符串匹配
          const foundPersonStr = people.find(p => String(p.id) === String(params.id))
          if (foundPersonStr) {
            console.log('通过字符串匹配找到人物:', foundPersonStr.name)
            setPerson(foundPersonStr)
            setError('')
            
            // 检查是否是查看自己的卡片
            const isOwnCard = isViewingOwnCard(foundPersonStr.id)
            setViewingOwnCard(isOwnCard)
            console.log('[PersonDetail] 查看自己的卡片:', isOwnCard)
            // 尝试使用之前加载的云端关系数据
            const { loadRelationshipsFromCloud: reloadForStr } = await import('@/lib/relationshipManager')
            const strRelationships = await reloadForStr()
            const cloudComps = await loadCompaniesFromCloudIfAvailable()
            setGraphData(generateGraphData(foundPersonStr, strRelationships || undefined, people, cloudComps || undefined))
            setIsLoading(false)
            
            if (getPersonRelationships(foundPersonStr.id).length === 0 && hasSubstantiveProfileData(foundPersonStr)) {
              analyzeThisPersonInBackground(foundPersonStr)
            }
          } else if (attempts < maxAttempts) {
            console.log('未找到人物，1秒后重试...')
            setTimeout(tryLoadData, 1000)
            return
          } else {
            console.log('多次尝试后仍未找到指定人物')
            setError(`未找到ID为 "${params.id}" 的人物。可用的人物数量: ${people.length}`)
            setIsLoading(false)
          }
        }
      } catch (error) {
        console.error('加载人物数据失败:', error)
        if (attempts < maxAttempts) {
          console.log('出错，1秒后重试...')
          setTimeout(tryLoadData, 1000)
          return
        } else {
          setError(`加载人物数据失败: ${error}`)
          setIsLoading(false)
        }
      }
    }

    // 立即尝试加载，如果失败会自动重试
    const timer = setTimeout(tryLoadData, 100)

    return () => clearTimeout(timer)
  }, [params.id, router, refreshKey])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">正在加载人物信息...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-4">
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">加载失败</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={() => window.location.reload()} className="mr-2">
                重新加载
              </Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                返回列表
              </Button>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-100 rounded-md text-sm text-left">
            <p className="font-medium mb-1">调试信息：</p>
            <p>URL参数ID: {params.id}</p>
          </div>
        </div>
      </div>
    )
  }

  // 在渲染前确保客户端已准备好
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">正在加载...</p>
        </div>
      </div>
    )
  }

  if (!person) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">未找到人物数据</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">
            返回列表
          </Button>
        </div>
      </div>
    )
  }

  // 刷新关系图谱数据
  // 处理编辑保存
  const handleEditSave = async (updatedPerson: PersonData) => {
    // 更新本地状态
    setPerson(updatedPerson)
    // 重新加载关系数据
    const { loadRelationshipsFromCloud } = await import('@/lib/relationshipManager')
    const latestRelationships = await loadRelationshipsFromCloud()
    const cloudPeople = await loadPeopleFromCloudIfAvailable()
    const cloudComps = await loadCompaniesFromCloudIfAvailable()
    setGraphData(generateGraphData(updatedPerson, latestRelationships || undefined, cloudPeople || getPeople(), cloudComps || getCompanies()))
    
    // 刷新数据以确保与云端同步
    setTimeout(async () => {
      try {
        // 从云端重新加载数据
        const cloudPeople = await loadPeopleFromCloudIfAvailable()
        if (cloudPeople) {
          const updatedFromCloud = cloudPeople.find(p => p.id === updatedPerson.id)
          if (updatedFromCloud) {
            setPerson(updatedFromCloud)
            // 重新加载关系数据
            const { loadRelationshipsFromCloud: reloadAfterEdit } = await import('@/lib/relationshipManager')
            const editRelationships = await reloadAfterEdit()
            const cloudPeople = await loadPeopleFromCloudIfAvailable()
            const cloudComps = await loadCompaniesFromCloudIfAvailable()
            setGraphData(generateGraphData(updatedFromCloud, editRelationships || undefined, cloudPeople || getPeople(), cloudComps || getCompanies()))
          }
        }
      } catch (error) {
        console.error('从云端刷新数据失败:', error)
      }
    }, 1000) // 延迟1秒以确保云端同步完成
  }

  // 处理节点点击事件
  const handleNodeClick = (node: any) => {
    if (node.type === 'company') {
      // 点击公司节点，跳转到企业详情页
      if (node.companyData) {
        // 如果有存储的公司数据，直接跳转
        router.push(`/company/${node.companyData.id}`)
      } else {
        // 如果没有公司数据，尝试查找匹配的公司
        const companies = getCompanies()
        const company = companies.find(c => c.name === node.name)
        if (company) {
          router.push(`/company/${company.id}`)
        } else {
          // 如果没有找到公司详情，跳转到企业列表并显示提示
          router.push('/dashboard?tab=companies')
          setTimeout(() => {
            alert(`未找到"${node.name}"的详细信息。\n\n你可以在企业列表中手动创建该企业的详细信息。`)
          }, 100)
        }
      }
    } else if (node.type === 'person' && node.id !== person.id) {
      // 点击人物节点，跳转到该人物详情页
      router.push(`/person/${node.id}`)
    }
    // 如果是当前人物节点，不做任何处理
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 返回按钮 */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回智能关系网
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setEditFormData(person)
                setShowEditDialog(true)
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              编辑信息
            </Button>
          </div>
        </div>
      </div>

      {/* 主要内容 - 全屏双栏布局 */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* 左侧：人物信息 */}
        <div className="w-1/2 p-8 bg-gray-50">
          <Card className="h-full flex flex-col overflow-hidden shadow-lg">
            <CardHeader className="pb-4 flex-shrink-0">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                  {getDisplayName(person.name).charAt(0)}
                </div>
                <div>
                  <CardTitle className="text-2xl">
                    {(isManager() && !viewingOwnCard)
                      ? `${person.name}（${deterministicAliasName(person.name)}）` 
                      : getDisplayName(person.name)}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Briefcase className="h-4 w-4" />
                    {person?.allCompanies && person.allCompanies.length > 0 ? (
                      <div className="space-y-1">
                        {person.allCompanies.map((comp: {position: string, company: string}, index: number) => (
                          <div key={index}>
                            {comp.position} @ {comp.company}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span>{person.position} @ {person.company}</span>
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 px-8 pb-8 overflow-y-auto flex-1">
              {/* 任职信息 */}
              {(person?.allCompanies && person.allCompanies.length > 0) || person?.position || person?.company ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-gray-600" />
                    <h3 className="text-base font-semibold text-gray-800">任职信息</h3>
                  </div>
                  {person?.allCompanies && person.allCompanies.length > 0 ? (
                    <div className="space-y-2 ml-7">
                      {person.allCompanies.map((comp: {position: string, company: string}, index: number) => (
                        <div key={index}>
                          <p className="text-sm font-medium text-gray-900">{comp.position}</p>
                          <p className="text-sm text-gray-600">{comp.company}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ml-7">
                      <p className="text-sm font-medium text-gray-900">{person.position}</p>
                      <p className="text-sm text-gray-600">{person.company}</p>
                    </div>
                  )}
                </div>
              ) : null}

              {/* 教育背景 */}
              {person?.educations && person.educations.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-gray-600" />
                    <h3 className="text-base font-semibold text-gray-800">教育背景</h3>
                  </div>
                  <div className="space-y-2 ml-7">
                    {person.educations.map((edu: {level: string, school: string, major?: string, year?: string}, index: number) => (
                      <div key={index}>
                        <p className="text-sm font-medium text-gray-900">
                          <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs mr-2">{edu.level}</span>
                          {edu.school}
                        </p>
                        {edu.major && <p className="text-sm text-gray-600 mt-1">专业：{edu.major}</p>}
                        {edu.year && <p className="text-sm text-gray-500 mt-1">毕业年份：{edu.year}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 联系方式 */}
              {(person?.phones && person.phones.length > 0) || person?.phone || person?.email ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-gray-600" />
                    <h3 className="text-base font-semibold text-gray-800">联系方式</h3>
                  </div>
                  
                  <div className="space-y-3 ml-7">
                    {/* 电话信息 */}
                    {person?.phones && person.phones.length > 0 ? (
                      <div className="space-y-2">
                        {person.phones.map((phone: string, index: number) => (
                          <div key={index} className="flex items-center gap-3">
                            <div className="flex-1">
                              <p className="text-xs text-gray-500">电话 {index + 1} {index === 0 && person.phones && person.phones.length > 1 && '(主)'}</p>
                              {(isMember() && !viewingOwnCard) ? (
                                <Button variant="link" className="p-0 h-auto text-sm text-blue-600 hover:text-blue-800" onClick={() => setShowContactDialog(true)}>
                                  <Eye className="h-3 w-3 mr-1" />
                                  查看联系方式
                                </Button>
                              ) : (
                                <p className="text-sm font-medium text-gray-900">{phone}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : person?.phone && (
                      <div>
                        <p className="text-xs text-gray-500">电话</p>
                        {(isMember() && !viewingOwnCard) ? (
                          <Button variant="link" className="p-0 h-auto text-sm text-blue-600 hover:text-blue-800" onClick={() => setShowContactDialog(true)}>
                            <Eye className="h-3 w-3 mr-1" />
                            查看联系方式
                          </Button>
                        ) : (
                          <p className="text-sm font-medium text-gray-900">{person.phone}</p>
                        )}
                      </div>
                    )}

                    {/* 邮箱信息 */}
                    {person.email && (
                      <div>
                        <p className="text-xs text-gray-500">邮箱</p>
                        {(isMember() && !viewingOwnCard) ? (
                          <Button
                            variant="link"
                            className="p-0 h-auto text-sm text-blue-600 hover:text-blue-800"
                            onClick={() => setShowContactDialog(true)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            查看联系方式
                          </Button>
                        ) : (
                          <p className="text-sm font-medium text-gray-900">{person.email}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* 基本信息 */}
              {(person.industry || person.currentCity || person.hometown || person.homeAddress || person.companyAddress) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-gray-600" />
                    <h3 className="text-base font-semibold text-gray-800">基本信息</h3>
                  </div>
                  <div className="space-y-2 ml-7">
                    {/* 行业 */}
                    {person.industry && (
                      <div className="flex items-start gap-3">
                        <p className="text-xs text-gray-500 min-w-[60px]">行业</p>
                        <p className="text-sm font-medium text-gray-900">{person.industry}</p>
                      </div>
                    )}

                    {/* 现居地 */}
                    {person.currentCity && (
                      <div className="flex items-start gap-3">
                        <p className="text-xs text-gray-500 min-w-[60px]">现居地</p>
                        <p className="text-sm font-medium text-gray-900">{person.currentCity}</p>
                      </div>
                    )}

                    {/* 家乡 */}
                    {person.hometown && person.hometown !== person.currentCity && (
                      <div className="flex items-start gap-3">
                        <p className="text-xs text-gray-500 min-w-[60px]">老家</p>
                        <p className="text-sm font-medium text-gray-900">{person.hometown}</p>
                      </div>
                    )}

                    {/* 家庭详细位置 */}
                    {person.homeAddress && (
                      <div className="flex items-start gap-3">
                        <p className="text-xs text-gray-500 min-w-[60px]">家庭地址</p>
                        <p className="text-sm font-medium text-gray-900">{person.homeAddress}</p>
                      </div>
                    )}

                    {/* 公司住址 */}
                    {person.companyAddress && (
                      <div className="flex items-start gap-3">
                        <p className="text-xs text-gray-500 min-w-[60px]">公司地址</p>
                        <p className="text-sm font-medium text-gray-900">{person.companyAddress}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 社会组织身份 */}
              {(person.birthDate || person.politicalParty || (person.socialOrganizations && person.socialOrganizations.length > 0)) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-gray-600" />
                    <h3 className="text-base font-semibold text-gray-800">社会组织身份</h3>
                  </div>
                  
                  <div className="space-y-3 ml-7">
                    {/* 出生日期 */}
                    {person.birthDate && (
                      <div className="flex items-start gap-3">
                        <p className="text-xs text-gray-500 min-w-[60px]">出生日期</p>
                        <p className="text-sm font-medium text-gray-900">{person.birthDate}</p>
                      </div>
                    )}

                    {/* 党派 */}
                    {person.politicalParty && (
                      <div className="flex items-start gap-3">
                        <p className="text-xs text-gray-500 min-w-[60px]">党派</p>
                        <p className="text-sm font-medium text-gray-900">{person.politicalParty}</p>
                      </div>
                    )}

                    {/* 社会组织身份 */}
                    {person.socialOrganizations && person.socialOrganizations.length > 0 && person.socialOrganizations.some(org => org.trim()) && (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500">社会组织身份</p>
                        <div className="space-y-1">
                          {person.socialOrganizations.filter(org => org.trim()).map((org, index) => (
                            <p key={index} className="text-sm font-medium text-gray-900">{org}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 个人爱好 */}
              {(person.hobbies || person.skills || person.expectations) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎯</span>
                    <h3 className="text-base font-semibold text-gray-800">个人爱好与能力</h3>
                  </div>
                  
                  <div className="space-y-3 ml-7">
                    {/* 个人爱好 */}
                    {person.hobbies && (
                      <div>
                        <p className="text-xs text-gray-500">个人爱好</p>
                        <p className="text-sm font-medium text-gray-900">{person.hobbies}</p>
                      </div>
                    )}

                    {/* 擅长能力 */}
                    {person.skills && (
                      <div>
                        <p className="text-xs text-gray-500">擅长能力</p>
                        <p className="text-sm font-medium text-gray-900">{person.skills}</p>
                      </div>
                    )}

                    {/* 期望从精尚慧获得什么 */}
                    {person.expectations && (
                      <div>
                        <p className="text-xs text-gray-500">期望获得</p>
                        <p className="text-sm font-medium text-gray-900">{person.expectations}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 工作经历 */}
              {person.workHistory && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💼</span>
                    <h3 className="text-base font-semibold text-gray-800">工作经历</h3>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed ml-7">{person.workHistory}</p>
                </div>
              )}

              {/* 标签和其他信息 */}
              {(person.additionalInfo || (person.tags && person.tags.length > 0)) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📝</span>
                    <h3 className="text-base font-semibold text-gray-800">标签与备注</h3>
                  </div>
                  
                  <div className="space-y-4 ml-7">
                    {/* 其他信息 */}
                    {person.additionalInfo && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">其他信息</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{person.additionalInfo}</p>
                      </div>
                    )}

                    {/* 标签 */}
                    {person.tags && person.tags.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-3">个人标签</p>
                        <div className="flex flex-wrap gap-2">
                          {person.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
 
            </CardContent>
          </Card>
        </div>

        {/* 右侧：关系图 */}
        <div className="w-1/2 bg-gray-50 border-l border-gray-200 p-8">
          <div className="h-full bg-white rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-6">关系网络</h3>
            <div className="h-[calc(100%-4rem)] border border-gray-200 rounded-lg bg-gray-50">
              {graphData ? (
                <StaticRelationshipGraph
                  nodes={graphData.nodes}
                  links={graphData.links}
                  centerNodeId={person.id}
                  onNodeClick={handleNodeClick}
                  isModal={false}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-sm">正在加载关系网络...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 联系方式提示对话框 */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogTitle>获取联系方式</DialogTitle>
          <DialogDescription className="text-gray-600 mt-4">
            若想了解 {getDisplayName(person.name)} 的具体信息，可以联系精尚慧管理者徐翔，王丽平，李莉，覃浩轩。
          </DialogDescription>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowContactDialog(false)}>
              我知道了
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑信息弹窗 */}
      <PersonEditModal
        person={editFormData}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSave={handleEditSave}
      />
    </div>
  )
} 