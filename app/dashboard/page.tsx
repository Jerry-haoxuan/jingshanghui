'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Search, User, Building2, Star, Trash2, MessageSquare, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getPeople, getCompanies, savePeople, saveCompanies, PersonData, CompanyData, loadPeopleFromCloudIfAvailable, loadCompaniesFromCloudIfAvailable /* resetToDefaultData, clearAllData, hasStoredData */ } from '@/lib/dataStore'
import { subscribeCloud, deletePersonFromCloud, deleteCompanyFromCloud } from '@/lib/cloudStore'
import { deterministicAliasName, forceGetAliasName } from '@/lib/deterministicNameAlias'
import { isManager, getUserRole } from '@/lib/userRole'

export default function Dashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('people')
  const [searchQuery, setSearchQuery] = useState('')
  const [people, setPeople] = useState<PersonData[]>([])
  const [companies, setCompanies] = useState<CompanyData[]>([])
  const [isClient, setIsClient] = useState(false)
  /* const [showDataPanel, setShowDataPanel] = useState(false) */

  // 确保客户端渲染的标志
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 加载数据和处理查询参数
  useEffect(() => {
    // 确保在客户端环境中加载数据
    if (typeof window === 'undefined') return

    const loadData = async () => {
      // 检查用户是否已登录
      const userRole = getUserRole()
      if (!userRole) {
        // 如果没有用户角色，重定向到首页
        router.push('/')
        return
      }

      // 优先尝试云端
      const [cloudPeople, cloudCompanies] = await Promise.all([
        loadPeopleFromCloudIfAvailable(),
        loadCompaniesFromCloudIfAvailable()
      ])
      // 如果云端可用（返回非 null），即使为空数组也以云端为准，避免每端各自使用本地数据导致分裂
      const peopleData = cloudPeople !== null ? cloudPeople : getPeople()
      const companiesData = cloudCompanies !== null ? cloudCompanies : getCompanies()
      
      console.log('Dashboard 加载数据:', peopleData.length, '个人物,', companiesData.length, '个企业')
      
      setPeople(peopleData)
      setCompanies(companiesData)
    }

    // 延迟加载确保localStorage可用
    const timer = setTimeout(() => { loadData() }, 50)
    
    // 处理tab查询参数
    const tab = searchParams.get('tab')
    if (tab === 'companies') {
      setActiveTab('companies')
    }

    return () => clearTimeout(timer)
  }, [searchParams, router])

  // Realtime subscribe
  useEffect(() => {
    const unsubscribers: Array<() => void> = []
    try {
      const peopleSub = subscribeCloud('people', async () => {
        const cloud = await loadPeopleFromCloudIfAvailable()
        if (cloud) setPeople(cloud)
      })
      unsubscribers.push(() => peopleSub.unsubscribe())
      const companySub = subscribeCloud('companies', async () => {
        const cloud = await loadCompaniesFromCloudIfAvailable()
        if (cloud) setCompanies(cloud)
      })
      unsubscribers.push(() => companySub.unsubscribe())
    } catch (_) {}
    return () => {
      unsubscribers.forEach(u => u())
    }
  }, [])

  // 过滤搜索结果
  const filteredPeople = people.filter(person => {
    const displayName = deterministicAliasName(person.name)
    return displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  })

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.industry.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 数据管理功能（已移除）
  /* const handleResetData = () => { }
  const handleClearData = () => { }
  const checkDataStatus = () => { } */

  // 获取关注列表
  const followedPeople = people.filter(p => p.isFollowed)
  const followedCompanies = companies.filter(c => c.isFollowed)

  // 切换关注状态
  const toggleFollow = (type: 'person' | 'company', id: string) => {
    if (type === 'person') {
      const updatedPeople = people.map(p =>
        p.id === id ? { ...p, isFollowed: !p.isFollowed } : p
      )
      setPeople(updatedPeople)
      savePeople(updatedPeople)
    } else {
      const updatedCompanies = companies.map(c =>
        c.id === id ? { ...c, isFollowed: !c.isFollowed } : c
      )
      setCompanies(updatedCompanies)
      saveCompanies(updatedCompanies)
    }
  }

  // 删除项目（本地 + 云端）
  const deleteItem = async (type: 'person' | 'company', id: string) => {
    if (!confirm('确定要删除吗？')) return
    try {
      if (type === 'person') {
        const updatedPeople = people.filter(p => p.id !== id)
        setPeople(updatedPeople)
        savePeople(updatedPeople)
        try { await deletePersonFromCloud(id) } catch (e) { console.error('云端删除人物失败', e) }
      } else {
        const updatedCompanies = companies.filter(c => c.id !== id)
        setCompanies(updatedCompanies)
        saveCompanies(updatedCompanies)
        try { await deleteCompanyFromCloud(id) } catch (e) { console.error('云端删除企业失败', e) }
      }
    } catch (err) {
      console.error('删除失败:', err)
      alert('删除失败，请重试')
    }
  }

  // 导出人物为Excel（与导入模板字段一致）
  const handleExportPeople = async () => {
    if (!isManager()) return
    const XLSX = await import('xlsx')

    const header = [
      '姓名', '出生年月日', '电话1', '电话2', '电话3', '邮箱',
      '公司1', '职位1', '公司2', '职位2', '公司3', '职位3', '行业',
      '党派', '社会组织1', '社会组织2', '社会组织3',
      '现居地', '家乡',
      '本科院校', '本科专业', '本科毕业年份',
      '硕士院校', '硕士专业', '硕士毕业年份',
      '博士院校', '博士专业', '博士毕业年份',
      'EMBA院校', 'EMBA毕业年份',
      'EMBA院校2', 'EMBA毕业年份2',
      'EMBA院校3', 'EMBA毕业年份3',
      '个人爱好', '擅长能力', '期望获得', '工作履历', '备注'
    ]

    const rows = people.map(p => {
      const phoneList = Array.isArray(p.phones) ? p.phones : []
      const primaryPhone = p.phone || phoneList[0] || ''
      const phone2 = phoneList[1] || ''
      const phone3 = phoneList[2] || ''

      const company1 = p.company || ''
      const position1 = p.position || ''
      const extraCompanies = Array.isArray(p.allCompanies) ? p.allCompanies.filter(ec => ec && (ec.company || ec.position)) : []
      const company2 = extraCompanies[0]?.company || ''
      const position2 = extraCompanies[0]?.position || ''
      const company3 = extraCompanies[1]?.company || ''
      const position3 = extraCompanies[1]?.position || ''

      const socialList = Array.isArray(p.socialOrganizations) ? p.socialOrganizations : []
      const social1 = socialList[0] || ''
      const social2 = socialList[1] || ''
      const social3 = socialList[2] || ''

      const educations = Array.isArray(p.educations) ? p.educations : []
      const findEdu = (level: string) => educations.filter(e => e.level === level)
      const undergrad = findEdu('本科')[0]
      const master = findEdu('硕士')[0]
      const doctor = findEdu('博士')[0]
      const embas = findEdu('EMBA')
      const emba1 = embas[0]
      const emba2 = embas[1]
      const emba3 = embas[2]

      return [
        p.name || '', p.birthDate || '', primaryPhone, phone2, phone3, p.email || '',
        company1, position1, company2, position2, company3, position3, p.industry || '',
        p.politicalParty || '', social1, social2, social3,
        p.currentCity || '', p.hometown || '',
        undergrad?.school || '', undergrad?.major || '', undergrad?.year || '',
        master?.school || '', master?.major || '', master?.year || '',
        doctor?.school || '', doctor?.major || '', doctor?.year || '',
        emba1?.school || '', emba1?.year || '',
        emba2?.school || '', emba2?.year || '',
        emba3?.school || '', emba3?.year || '',
        p.hobbies || '', p.skills || '', p.expectations || '', p.workHistory || '', p.additionalInfo || ''
      ]
    })

    const aoa = [header, ...rows]
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = header.map(() => ({ wch: 15 }))
    XLSX.utils.book_append_sheet(wb, ws, '人物数据')

    const fileName = `people-export-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // 导出企业为Excel（多工作表：企业信息/上游供应商明细/下游客户明细）
  const handleExportCompanies = async () => {
    if (!isManager()) return
    const XLSX = await import('xlsx')

    const mainHeader = [
      '企业名称', '所属行业', '企业规模', '企业定位', '企业价值', '关键成就', '企业诉求', '上游供应商(名称列表)', '下游客户(名称列表)', '其他补充信息'
    ]
    const mainRows = companies.map(c => [
      c.name || '', c.industry || '', c.scale || '', c.positioning || '', c.value || '', c.achievements || '', c.demands || '',
      (Array.isArray(c.suppliers) ? c.suppliers.join('、') : ''),
      (Array.isArray(c.customers) ? c.customers.join('、') : ''),
      c.additionalInfo || ''
    ])

    const wb = XLSX.utils.book_new()
    const wsMain = XLSX.utils.aoa_to_sheet([mainHeader, ...mainRows])
    wsMain['!cols'] = mainHeader.map(() => ({ wch: 20 }))
    XLSX.utils.book_append_sheet(wb, wsMain, '企业信息')

    const supplierHeader = ['企业名称', '原材料名称', '原材料类别', '供应商名称']
    const supplierRows: any[] = []
    companies.forEach(c => {
      const infos = Array.isArray(c.supplierInfos) ? c.supplierInfos : []
      if (infos.length === 0) {
        const names = Array.isArray(c.suppliers) ? c.suppliers : []
        names.forEach(n => supplierRows.push([c.name || '', '', '', n]))
      } else {
        infos.forEach(info => supplierRows.push([c.name || '', info.materialName || '', info.materialCategory || '', info.supplierName || '']))
      }
    })
    const wsSup = XLSX.utils.aoa_to_sheet([supplierHeader, ...supplierRows])
    wsSup['!cols'] = supplierHeader.map(() => ({ wch: 20 }))
    XLSX.utils.book_append_sheet(wb, wsSup, '上游供应商明细')

    const customerHeader = ['企业名称', '产品名称', '产品类别', '客户名称']
    const customerRows: any[] = []
    companies.forEach(c => {
      const infos = Array.isArray(c.customerInfos) ? c.customerInfos : []
      if (infos.length === 0) {
        const names = Array.isArray(c.customers) ? c.customers : []
        names.forEach(n => customerRows.push([c.name || '', '', '', n]))
      } else {
        infos.forEach(info => customerRows.push([c.name || '', info.productName || '', info.productCategory || '', info.customerName || '']))
      }
    })
    const wsCus = XLSX.utils.aoa_to_sheet([customerHeader, ...customerRows])
    wsCus['!cols'] = customerHeader.map(() => ({ wch: 20 }))
    XLSX.utils.book_append_sheet(wb, wsCus, '下游客户明细')

    const fileName = `companies-export-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // 在渲染前确保客户端已准备好
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 左侧导航栏 */}
      <div className={`${isSidebarCollapsed ? 'w-16' : 'w-64'} bg-white shadow-lg transition-all duration-300`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            {!isSidebarCollapsed && (
              <Link href="/" className="text-2xl font-bold text-blue-600">
                精尚慧
              </Link>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {isSidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
            </button>
          </div>

          <nav className="space-y-2">
            <Link
              href="/dashboard"
              className="flex items-center space-x-3 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg"
            >
              <User className="h-5 w-5" />
              {!isSidebarCollapsed && <span>智能关系网</span>}
            </Link>
            <Link
              href="/data-input"
              className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 rounded-lg"
            >
              <Building2 className="h-5 w-5" />
              {!isSidebarCollapsed && <span>信息录入</span>}
            </Link>
            <Link
              href="/ai-assistant"
              className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 rounded-lg"
            >
              <MessageSquare className="h-5 w-5" />
              {!isSidebarCollapsed && <span>你想找谁</span>}
            </Link>
          </nav>

          {!isSidebarCollapsed && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3">我关注的列表</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {followedPeople.map(person => (
                  <div
                    key={person.id}
                    className="p-2 bg-white rounded cursor-pointer hover:shadow-sm"
                    onClick={() => router.push(`/person/${person.id}`)}
                  >
                    <div className="font-medium text-sm">
                      {isManager() 
                        ? `${person.name}（${deterministicAliasName(person.name)}）` 
                        : deterministicAliasName(person.name)}
                    </div>
                    <div className="text-xs text-gray-500">{person.company}</div>
                  </div>
                ))}
                {followedCompanies.map(company => (
                  <div
                    key={company.id}
                    className="p-2 bg-white rounded cursor-pointer hover:shadow-sm"
                    onClick={() => router.push(`/company/${company.id}?from=companies`)}
                  >
                    <div className="font-medium text-sm">{company.name}</div>
                    <div className="text-xs text-gray-500">{company.industry}</div>
                  </div>
                ))}
                {followedPeople.length === 0 && followedCompanies.length === 0 && (
                  <div className="text-sm text-gray-400 text-center py-4">
                    暂无关注
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-800">智能关系网络</h1>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="搜索人物或企业..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-80"
                />
              </div>
              {isManager() && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleExportPeople}>
                    <Download className="h-4 w-4 mr-1" /> 导出人物
                  </Button>
                  <Button variant="outline" onClick={handleExportCompanies}>
                    <Download className="h-4 w-4 mr-1" /> 导出企业
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="people">人物</TabsTrigger>
              <TabsTrigger value="companies">企业</TabsTrigger>
            </TabsList>

            <TabsContent value="people">
              {people.length === 0 ? (
                <div className="text-center py-8 text-gray-500">暂无人物数据</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPeople.map(person => (
                    <div
                      key={person.id}
                      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 cursor-pointer"
                      onClick={() => {
                        console.log('点击人物卡片，ID:', person.id, '姓名:', person.name)
                        console.log('即将跳转到:', `/person/${person.id}`)
                        router.push(`/person/${person.id}`)
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">
                              {isManager() 
                                ? `${person.name}（${forceGetAliasName(person.name)}）` 
                                : deterministicAliasName(person.name)}
                            </h3>
                            <p className="text-sm text-gray-500">{person.position}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant={person.isFollowed ? "default" : "outline"}
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFollow('person', person.id)
                            }}
                          >
                            <Star className={`h-4 w-4 ${person.isFollowed ? 'fill-current' : ''}`} />
                          </Button>
                          {isManager() && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteItem('person', person.id)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{person.company}</p>
                      {person.industry && (
                        <p className="text-xs text-gray-500 mb-1">行业: {person.industry}</p>
                      )}
                      {person.currentCity && (
                        <p className="text-xs text-gray-500 mb-3">现居: {person.currentCity}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {person.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {filteredPeople.length === 0 && (
                    <div className="col-span-3 text-center py-12 text-gray-400">
                      暂无人物数据
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="companies">
              {companies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">暂无企业数据</div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCompanies.map(company => (
                  <div
                    key={company.id}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 cursor-pointer"
                    onClick={() => router.push(`/company/${company.id}?from=companies`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{company.name}</h3>
                          <p className="text-sm text-gray-500">{company.industry}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant={company.isFollowed ? "default" : "outline"}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFollow('company', company.id)
                          }}
                        >
                          <Star className={`h-4 w-4 ${company.isFollowed ? 'fill-current' : ''}`} />
                        </Button>
                        {isManager() && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteItem('company', company.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">规模: {company.scale}</p>
                    <div className="text-sm text-gray-500">
                      主要产品: {company.products.slice(0, 2).join(', ')}
                      {company.products.length > 2 && '...'}
                    </div>
                  </div>
                ))}
                {filteredCompanies.length === 0 && (
                  <div className="col-span-3 text-center py-12 text-gray-400">
                    暂无企业数据
                  </div>
                )}
              </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

    </div>
  )
} 