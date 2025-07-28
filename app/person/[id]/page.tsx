'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Phone, Mail, MapPin, Building2, GraduationCap, Briefcase, User, Eye, Calendar, Shield, Users } from 'lucide-react'
import Link from 'next/link'
import { getPeople, getCompanies, PersonData } from '@/lib/dataStore'
import StaticRelationshipGraph from '@/components/StaticRelationshipGraph'
import { getPersonRelationships } from '@/lib/relationshipManager'
import { forceAnalyzeAllRelationships } from '@/lib/relationshipManager'
import { deterministicAliasName } from '@/lib/deterministicNameAlias'
import { isMember, isManager } from '@/lib/userRole'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { getUserRole } from '@/lib/userRole'

export default function PersonDetail() {
  const params = useParams()
  const router = useRouter()
  const [person, setPerson] = useState<PersonData | null>(null)
  const [graphData, setGraphData] = useState<any>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showContactDialog, setShowContactDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')

  // 重新分析关系的函数
  const handleAnalyzeRelationships = async () => {
    try {
      await forceAnalyzeAllRelationships()
      // 刷新页面数据
      const people = getPeople()
      const foundPerson = people.find(p => p.id === params.id)
      if (foundPerson) {
        setPerson(foundPerson)
        setGraphData(generateGraphData(foundPerson))
      }
    } catch (error) {
      console.error('关系分析失败:', error)
    }
  }

  // 生成动态关系图谱数据
  const generateGraphData = (currentPerson: PersonData) => {
    const allPeople = getPeople()
    const allCompanies = getCompanies()
    const relationships = getPersonRelationships(currentPerson.id)
    
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
    relationships.forEach(rel => {
      const relatedPersonId = rel.personId === currentPerson.id ? rel.relatedPersonId : rel.personId
      if (relatedPersonId) {
        const relatedPerson = allPeople.find(p => p.id === relatedPersonId)
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
          } else if (rel.relationshipType === 'superior') {
            relationshipText = '上级'
          } else if (rel.relationshipType === 'subordinate') {
            relationshipText = '下属'
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
    // 确保在客户端环境中加载数据
    if (typeof window === 'undefined') return

    // 检查用户角色，如果未设置则重定向到首页
    const userRole = getUserRole()
    if (!userRole) {
      console.log('用户未登录，重定向到首页')
      router.push('/')
      return
    }

    setIsLoading(true)
    
    // 延迟一帧确保组件完全挂载
    const timer = setTimeout(() => {
      try {
        const people = getPeople()
        console.log('加载的人物数据:', people.length, '个人物')
        
        if (people.length === 0) {
          console.error('没有加载到任何人物数据')
          setError('没有加载到任何人物数据。请检查数据是否正确加载。')
          return
        }
        
        const foundPerson = people.find(p => p.id === params.id)
        console.log('查找人物ID:', params.id, '找到:', foundPerson?.name)
        console.log('可用的人物IDs:', people.map(p => p.id))
        
        if (foundPerson) {
          setPerson(foundPerson)
          setError('')
          
          // 检查是否存在关系数据
          const relationships = getPersonRelationships(foundPerson.id)
          if (relationships.length === 0) {
            // 如果没有关系数据，自动触发分析（但不要在这里直接调用handleAnalyzeRelationships避免循环）
            console.log('未找到关系数据，建议点击"分析关系"按钮')
          }
          setGraphData(generateGraphData(foundPerson))
        } else {
          // 如果找不到，显示错误而不是立即跳转
          console.log('未找到指定人物')
          setError(`未找到ID为 "${params.id}" 的人物。可用的人物数量: ${people.length}`)
        }
      } catch (error) {
        console.error('加载人物数据失败:', error)
        setError(`加载人物数据失败: ${error}`)
      } finally {
        setIsLoading(false)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [params.id, router, refreshKey])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">正在加载人物信息...</p>
          <p className="text-sm text-gray-400 mt-2">
            {typeof window !== 'undefined' ? '客户端加载中' : '服务端渲染中'}
          </p>
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
            <p>当前环境: {typeof window !== 'undefined' ? '客户端' : '服务端'}</p>
          </div>
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
  const refreshGraphData = async () => {
    try {
      // 刷新时重新分析关系
      await forceAnalyzeAllRelationships()
      
      // 重新加载人员数据
      const people = getPeople()
      const foundPerson = people.find(p => p.id === params.id)
      if (foundPerson) {
        setPerson(foundPerson)
        setGraphData(generateGraphData(foundPerson))
      }
    } catch (error) {
      console.error('刷新失败:', error)
      // 即使分析失败，也要更新基本数据
      setRefreshKey(prev => prev + 1)
    }
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
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>
          <Link href="/dashboard">
            <Button variant="outline">
              返回控制台
            </Button>
          </Link>
        </div>
      </div>

      {/* 主要内容 - 全屏双栏布局 */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* 左侧：人物信息 */}
        <div className="w-1/2 p-8 overflow-y-auto">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                  {deterministicAliasName(person.name).charAt(0)}
                </div>
                <div>
                  <CardTitle className="text-2xl">
                    {isManager() 
                      ? `${person.name}（${deterministicAliasName(person.name)}）` 
                      : deterministicAliasName(person.name)}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Briefcase className="h-4 w-4" />
                    {person.position} @ {person.company}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    基本信息
                  </h3>
                  
                  {/* 任职信息 */}
                  {person?.allCompanies && person.allCompanies.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Briefcase className="h-4 w-4 text-gray-500" />
                        <p className="text-sm font-medium text-gray-700">任职信息</p>
                      </div>
                      {person.allCompanies.map((comp: {position: string, company: string}, index: number) => (
                        <div key={index} className="ml-6">
                          <p className="text-sm">{comp.position} @ {comp.company}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <Briefcase className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">职位</p>
                        <p className="text-sm">{person.position} @ {person.company}</p>
                      </div>
                    </div>
                  )}

                  {/* 教育背景 */}
                  {person?.educations && person.educations.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <GraduationCap className="h-4 w-4 text-gray-500" />
                        <p className="text-sm font-medium text-gray-700">教育背景</p>
                      </div>
                      {person.educations.map((edu: {level: string, school: string, major?: string, year?: string}, index: number) => (
                        <div key={index} className="ml-6">
                          <p className="text-sm">
                            <span className="font-medium">{edu.level}</span> - {edu.school}
                            {edu.major && <span className="text-gray-600"> ({edu.major})</span>}
                            {edu.year && <span className="text-gray-500"> {edu.year}</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 行业 */}
                  {person.industry && (
                    <div className="flex items-start gap-3">
                      <Building2 className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">行业</p>
                        <p className="text-sm">{person.industry}</p>
                      </div>
                    </div>
                  )}

                  {/* 现居地 */}
                  {person.currentCity && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">现居地</p>
                        <p className="text-sm">{person.currentCity}</p>
                      </div>
                    </div>
                  )}

                  {/* 家乡 */}
                  {person.hometown && person.hometown !== person.currentCity && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">家乡</p>
                        <p className="text-sm">{person.hometown}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">联系方式</h3>
                  
                  {person?.phones && person.phones.length > 0 ? (
                    person.phones.map((phone: string, index: number) => (
                      <div key={index} className="flex items-start gap-3">
                        <Phone className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">电话 {index + 1}</p>
                          {isMember() ? (
                            <Button variant="link" className="p-0 h-auto text-sm text-blue-600 hover:text-blue-800" onClick={() => setShowContactDialog(true)}>
                              <Eye className="h-3 w-3 mr-1" />
                              查看联系方式
                            </Button>
                          ) : (
                            <p className="text-sm">{phone}</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : person?.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">电话</p>
                        {isMember() ? (
                          <Button variant="link" className="p-0 h-auto text-sm text-blue-600 hover:text-blue-800" onClick={() => setShowContactDialog(true)}>
                            <Eye className="h-3 w-3 mr-1" />
                            查看联系方式
                          </Button>
                        ) : (
                          <p className="text-sm">{person.phone}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {person.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">邮箱</p>
                        {isMember() ? (
                          <Button
                            variant="link"
                            className="p-0 h-auto text-sm text-blue-600 hover:text-blue-800"
                            onClick={() => setShowContactDialog(true)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            查看联系方式
                          </Button>
                        ) : (
                          <p className="text-sm">{person.email}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 其他个人信息 */}
              <div className="space-y-4">
                {/* 出生日期 */}
                {person.birthDate && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">出生日期</p>
                      <p className="text-sm">{person.birthDate}</p>
                    </div>
                  </div>
                )}

                {/* 党派 */}
                {person.politicalParty && (
                  <div className="flex items-start gap-3">
                    <Shield className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">党派</p>
                      <p className="text-sm">{person.politicalParty}</p>
                    </div>
                  </div>
                )}

                {/* 社会组织身份 */}
                {person.socialOrganizations && person.socialOrganizations.length > 0 && person.socialOrganizations.some(org => org.trim()) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <p className="text-sm font-medium text-gray-700">社会组织身份</p>
                    </div>
                    <div className="ml-6 space-y-1">
                      {person.socialOrganizations.filter(org => org.trim()).map((org, index) => (
                        <p key={index} className="text-sm">{org}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* 个人爱好 */}
                {person.hobbies && (
                  <div className="flex items-start gap-3">
                    <span className="h-4 w-4 text-gray-500 mt-0.5">🎯</span>
                    <div>
                      <p className="text-sm text-gray-500">个人爱好</p>
                      <p className="text-sm">{person.hobbies}</p>
                    </div>
                  </div>
                )}

                {/* 擅长能力 */}
                {person.skills && (
                  <div className="flex items-start gap-3">
                    <span className="h-4 w-4 text-gray-500 mt-0.5">💡</span>
                    <div>
                      <p className="text-sm text-gray-500">擅长能力</p>
                      <p className="text-sm">{person.skills}</p>
                    </div>
                  </div>
                )}

                {/* 期望从精尚慧获得什么 */}
                {person.expectations && (
                  <div className="flex items-start gap-3">
                    <span className="h-4 w-4 text-gray-500 mt-0.5">🎁</span>
                    <div>
                      <p className="text-sm text-gray-500">期望从精尚慧获得</p>
                      <p className="text-sm">{person.expectations}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 产品/服务 */}
              {person.products && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">产品/服务</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{person.products}</p>
                </div>
              )}

              {/* 工作经历 */}
              {person.workHistory && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">工作经历</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{person.workHistory}</p>
                </div>
              )}

              {/* 其他信息 */}
              {person.additionalInfo && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">其他信息</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{person.additionalInfo}</p>
                </div>
              )}

              {/* 标签 */}
              {person.tags && person.tags.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">标签</h3>
                  <div className="flex flex-wrap gap-2">
                    {person.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                            )}
 
            </CardContent>
          </Card>
        </div>

        {/* 右侧：关系图 */}
        <div className="w-1/2 bg-white border-l border-gray-200 p-8">
          <div className="h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">关系网络</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshGraphData}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                刷新
              </Button>
            </div>
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
            若想了解 {deterministicAliasName(person.name)} 的具体信息，可以联系精尚慧管理者徐翔，王丽平，李莉，覃浩轩。
          </DialogDescription>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowContactDialog(false)}>
              我知道了
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 