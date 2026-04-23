'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Search, User, Building2, Star, Trash2, MessageSquare, Download, Edit, Network, FolderOpen, Users, ChevronDown, ChevronUp, Cpu, Settings, Sparkles, Layers, Zap, Car, Heart, Globe, TrendingUp, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getPeople, getCompanies, savePeople, saveCompanies, PersonData, CompanyData, loadPeopleFromCloudIfAvailable, loadCompaniesFromCloudIfAvailable, getMyCards /* resetToDefaultData, clearAllData, hasStoredData */ } from '@/lib/dataStore'
import PersonEditModal from '@/components/PersonEditModal'
import { subscribeCloud, deletePersonFromCloud, deleteCompanyFromCloud } from '@/lib/cloudStore'
import { deterministicAliasName, forceGetAliasName } from '@/lib/deterministicNameAlias'
import { isManager, getUserRole, isMember } from '@/lib/userRole'
import { getCurrentUser } from '@/lib/userStore'

export default function DashboardClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('people')
  const [searchQuery, setSearchQuery] = useState('')
  const [people, setPeople] = useState<PersonData[]>([])
  const [companies, setCompanies] = useState<CompanyData[]>([])
  const [isClient, setIsClient] = useState(false)
  const [supabaseWarning, setSupabaseWarning] = useState<string | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingPerson, setEditingPerson] = useState<PersonData | null>(null)
  const [myCards, setMyCards] = useState<PersonData[]>([])
  const [isAnalyzingRelationships, setIsAnalyzingRelationships] = useState(false)
  const [expandedIndustries, setExpandedIndustries] = useState<Set<string>>(new Set())
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

      // 强制使用云端数据
      const [cloudPeople, cloudCompanies] = await Promise.all([
        loadPeopleFromCloudIfAvailable(),
        loadCompaniesFromCloudIfAvailable()
      ])
      
      // 检查 Supabase 是否配置
      const { isSupabaseReady } = await import('@/lib/supabaseClient')
      
      let peopleData: PersonData[] = []
      let companiesData: CompanyData[] = []
      
      if (cloudPeople !== null && cloudCompanies !== null) {
        // 云端数据可用
        peopleData = cloudPeople
        companiesData = cloudCompanies
        setSupabaseWarning(null)
      } else if (process.env.NODE_ENV === 'production' && !isSupabaseReady) {
        // 生产环境但 Supabase 未配置
        console.error('⚠️ 生产环境中 Supabase 未配置！请在 Vercel 中设置环境变量')
        setSupabaseWarning('⚠️ Supabase 未配置！请在 Vercel 中设置环境变量 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。详情请查看 ENV_CONFIG.md 文件。')
        // 不使用本地数据，保持空数组
      } else if (process.env.NODE_ENV !== 'production') {
        // 开发环境，允许使用本地数据
        peopleData = cloudPeople !== null ? cloudPeople : getPeople()
        companiesData = cloudCompanies !== null ? cloudCompanies : getCompanies()
        if (!isSupabaseReady) {
          setSupabaseWarning('⚠️ 开发环境: Supabase 未配置，使用本地数据。请创建 .env.local 文件并配置 Supabase 参数。')
        } else {
          setSupabaseWarning(null)
        }
      }
      
      // ── 方案B：从 people.allCompanies 补充未录入 companies 表的企业 ──
      // 以公司名称小写做唯一键，避免重复
      const existingNameKeys = new Set(companiesData.map(c => c.name.trim().toLowerCase()))
      const addedVirtualKeys = new Set<string>()
      const virtualCompanies: CompanyData[] = []

      for (const person of peopleData) {
        if (!person.allCompanies?.length) continue
        for (const { company: cName } of person.allCompanies) {
          const name = (cName ?? '').trim()
          if (!name) continue
          const key = name.toLowerCase()
          if (existingNameKeys.has(key) || addedVirtualKeys.has(key)) continue
          addedVirtualKeys.add(key)
          virtualCompanies.push({
            id: `virtual__${key}`,
            name,
            // 用该人员自身的行业作为企业行业的推断
            industry: person.industry ?? '',
            scale: '',
            products: [],
            isFollowed: false,
          })
        }
      }
      companiesData = [...companiesData, ...virtualCompanies]

      console.log('Dashboard 加载数据:', peopleData.length, '个人物,', companiesData.length, '个企业（含', virtualCompanies.length, '家从人员档案补充）')

      setPeople(peopleData)
      setCompanies(companiesData)

      // 加载"我的卡片"
      try {
        if (isMember()) {
          // 如果是会员，根据当前登录账号查找对应的人物
          const currentUser = getCurrentUser()
          const myPerson = currentUser?.personName
            ? peopleData.find(p => p.name === currentUser.personName) ?? null
            : null
          if (myPerson) {
            setMyCards([myPerson])
            console.log('[Dashboard] 会员卡片已加载:', myPerson.name)
          } else {
            console.log('[Dashboard] 未找到会员对应的人物卡片')
            setMyCards([])
          }
        } else {
          // 管理员使用原有逻辑
          setMyCards(getMyCards())
        }
      } catch (_) {
        setMyCards([])
      }
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

  // 批量分析所有关系
  const handleAnalyzeAllRelationships = async () => {
    if (!isManager()) {
      alert('只有管理员才能执行批量分析关系操作')
      return
    }

    if (!confirm(`确定要批量分析所有人员（${people.length}人）的关系吗？\n\n这将重新生成所有关系数据并同步到Supabase。`)) {
      return
    }

    setIsAnalyzingRelationships(true)
    try {
      const { forceAnalyzeAllRelationships } = await import('@/lib/relationshipManager')
      await forceAnalyzeAllRelationships()
      
      alert(`✅ 批量关系分析完成！\n\n已为 ${people.length} 人生成关系数据并同步到Supabase。\n现在可以在人物详情页查看关系网络图。`)
    } catch (error) {
      console.error('批量分析关系失败:', error)
      alert('❌ 批量分析关系失败: ' + (error as Error).message)
    } finally {
      setIsAnalyzingRelationships(false)
    }
  }

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

  // 编辑保存后，更新本地people并刷新"我的卡片"
  const handleEditSave = (updated: PersonData) => {
    const next = people.map(p => p.id === updated.id ? updated : p)
    setPeople(next)
    savePeople(next)
    try { 
      if (isMember()) {
        const currentUser = getCurrentUser()
        const myPerson = currentUser?.personName
          ? next.find(p => p.name === currentUser.personName) ?? null
          : null
        if (myPerson) {
          setMyCards([myPerson])
        } else {
          setMyCards([])
        }
      } else {
        setMyCards(getMyCards())
      }
    } catch (_) {}
  }

  // 删除项目（云端 + 本地同步）
  const deleteItem = async (type: 'person' | 'company', id: string) => {
    const itemName = type === 'person' 
      ? people.find(p => p.id === id)?.name || '未知' 
      : companies.find(c => c.id === id)?.name || '未知'
    
    if (!confirm(`确定要删除 "${itemName}" 吗？\n\n此操作将从云端数据库中永久删除，不可恢复！`)) return
    
    try {
      if (type === 'person') {
        // 先从云端删除，确保数据一致性
        await deletePersonFromCloud(id)
        
        // 云端删除成功后，更新本地状态
        const updatedPeople = people.filter(p => p.id !== id)
        setPeople(updatedPeople)
        savePeople(updatedPeople)
        
        console.log(`成功删除人物: ${itemName} (ID: ${id})`)
      } else {
        // 先从云端删除，确保数据一致性
        await deleteCompanyFromCloud(id)
        
        // 云端删除成功后，更新本地状态
        const updatedCompanies = companies.filter(c => c.id !== id)
        setCompanies(updatedCompanies)
        saveCompanies(updatedCompanies)
        
        console.log(`成功删除企业: ${itemName} (ID: ${id})`)
      }
      
      // 显示成功提示
      const successMsg = `已成功删除 "${itemName}"`
      // 使用临时提示替代 alert
      const toast = document.createElement('div')
      toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: #10b981; color: white; padding: 12px 20px;
        border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-size: 14px; max-width: 300px;
      `
      toast.textContent = successMsg
      document.body.appendChild(toast)
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast)
        }
      }, 3000)
      
    } catch (err) {
      console.error('删除失败:', err)
      const errorMsg = err instanceof Error ? err.message : '未知错误'
      alert(`删除失败：${errorMsg}\n\n请检查网络连接或 Supabase 配置后重试。`)
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

    const supplierHeader = ['企业名称', '原材料名称', '原材料类别', '供应商名称', '关键词', '关键人物1', '关键人物2', '关键人物3']
    const supplierRows: any[] = []
    companies.forEach(c => {
      const infos = Array.isArray(c.supplierInfos) ? c.supplierInfos : []
      if (infos.length === 0) {
        const names = Array.isArray(c.suppliers) ? c.suppliers : []
        names.forEach(n => supplierRows.push([c.name || '', '', '', n, '', '', '', '']))
      } else {
        infos.forEach(info => supplierRows.push([c.name || '', info.materialName || '', info.materialCategory || '', info.supplierName || '', info.keywords || '', info.keyPerson1 || '', info.keyPerson2 || '', info.keyPerson3 || '']))
      }
    })
    const wsSup = XLSX.utils.aoa_to_sheet([supplierHeader, ...supplierRows])
    wsSup['!cols'] = supplierHeader.map(() => ({ wch: 20 }))
    XLSX.utils.book_append_sheet(wb, wsSup, '上游供应商明细')

    const customerHeader = ['企业名称', '产品名称', '产品类别', '客户名称', '关键词', '关键人物1', '关键人物2', '关键人物3']
    const customerRows: any[] = []
    companies.forEach(c => {
      const infos = Array.isArray(c.customerInfos) ? c.customerInfos : []
      if (infos.length === 0) {
        const names = Array.isArray(c.customers) ? c.customers : []
        names.forEach(n => customerRows.push([c.name || '', '', '', n, '', '', '', '']))
      } else {
        infos.forEach(info => customerRows.push([c.name || '', info.productName || '', info.productCategory || '', info.customerName || '', info.keywords || '', info.keyPerson1 || '', info.keyPerson2 || '', info.keyPerson3 || '']))
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
              <button
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' })
                  localStorage.removeItem('userRole')
                  localStorage.removeItem('currentUser')
                  router.push('/')
                }}
                className="text-2xl font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                精尚慧
              </button>
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
              <Network className="h-5 w-5" />
              {!isSidebarCollapsed && <span>生态商圈</span>}
            </Link>
            {/* 我的 - 查看自己的卡片（显示真实信息） */}
            <div>
              <button
                onClick={() => {
                  if (myCards.length > 0) {
                    router.push(`/person/${myCards[0].id}`)
                  } else {
                    alert('您还没有输入自己的卡片，请前往信息录入')
                    router.push('/data-input')
                  }
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
              >
                <Edit className="h-5 w-5" />
                {!isSidebarCollapsed && <span>我的</span>}
              </button>
              {!isSidebarCollapsed && myCards.length > 0 && (
                <div className="mt-2 space-y-1 ml-8">
                  {myCards.map(card => (
                    <button
                      key={card.id}
                      onClick={() => router.push(`/person/${card.id}`)}
                      className="w-full text-left px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded"
                    >
                      {card.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Link
              href="/business-circle"
              className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 rounded-lg"
            >
              <Users className="h-5 w-5" />
              {!isSidebarCollapsed && <span>我的商圈</span>}
            </Link>
            <Link
              href="/projects"
              className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 rounded-lg"
            >
              <FolderOpen className="h-5 w-5" />
              {!isSidebarCollapsed && <span>My Project</span>}
            </Link>
            <Link
              href="/ai-assistant"
              className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 rounded-lg"
            >
              <MessageSquare className="h-5 w-5" />
              {!isSidebarCollapsed && <span>您的慧慧Ai助理</span>}
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
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {/* Supabase 配置警告 */}
          {supabaseWarning && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">{supabaseWarning}</p>
            </div>
          )}

          {/* 顶部标题行 */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800">生态商圈</h1>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="搜索人物或企业..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-64 text-sm"
                />
              </div>
              {isManager() && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleAnalyzeAllRelationships}
                    disabled={isAnalyzingRelationships || people.length === 0}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Network className="h-4 w-4 mr-1" />
                    {isAnalyzingRelationships ? '分析中...' : '批量分析关系'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportPeople}>
                    <Download className="h-4 w-4 mr-1" /> 导出人物
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportCompanies}>
                    <Download className="h-4 w-4 mr-1" /> 导出企业
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* 搜索结果：有搜索词时显示扁平列表 */}
          {searchQuery.trim() ? (
            <div className="space-y-6">
              {/* 人物搜索结果 */}
              {filteredPeople.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">人物 ({filteredPeople.length})</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPeople.map(person => (
                      <div
                        key={person.id}
                        className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer"
                        onClick={() => router.push(`/person/${person.id}`)}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm truncate">
                              {isManager() ? `${person.name}（${forceGetAliasName(person.name)}）` : deterministicAliasName(person.name)}
                            </h3>
                            <p className="text-xs text-gray-500 truncate">{person.position} · {person.company}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {person.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{tag}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* 企业搜索结果 */}
              {filteredCompanies.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">企业 ({filteredCompanies.length})</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCompanies.map(company => (
                      <div
                        key={company.id}
                        className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md p-4 cursor-pointer"
                        onClick={() => router.push(`/company/${company.id}?from=companies`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                            <Building2 className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm truncate">{company.name}</h3>
                            <p className="text-xs text-gray-500 truncate">{company.industry} · {company.scale}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {filteredPeople.length === 0 && filteredCompanies.length === 0 && (
                <div className="text-center py-16 text-gray-400">未找到与「{searchQuery}」相关的人物或企业</div>
              )}
            </div>
          ) : (
            /* 无搜索词：生态商圈宣传视图 */
            (() => {
              // ── 行业标准分类映射 ──────────────────────────────────────────
              type StdCategory = {
                label: string
                gradient: string
                icon: React.ReactNode
                keywords: string[]
              }
              const STD_CATEGORIES: StdCategory[] = [
                {
                  label: '半导体', gradient: 'from-cyan-500 to-blue-500', icon: <Cpu className="w-5 h-5 text-white" />,
                  keywords: [
                    '半导体','芯片','集成电路','晶圆','封装','光刻','eda','存储','射频','微电子','功率','传感器',
                    'mems','光电','光子','vcsel','激光','探测器','igbt','mosfet','gan','sic','碳化硅','氮化镓',
                    'mcu','cpu','gpu','fpga','dsp','adc','dac','放大器','驱动器','电源管理','电源ic',
                    '模拟','数模','模数','芯粒','先进封装','封测','代工','ip核','通信芯片','雷达芯片',
                    '微控制','微处理','逻辑','数字','混合信号','硅光','化合物半导体',
                    '第三代半导体','宽禁带','电子元器件','电子元件','分立器件','功率器件','二极管','三极管',
                  ],
                },
                {
                  label: '智能制造', gradient: 'from-orange-400 to-amber-500', icon: <Settings className="w-5 h-5 text-white" />,
                  keywords: [
                    '智能制造','制造','工业','自动化','机器人','数控','精密','装备','plc','工控','仪器','仪表',
                    '激光加工','激光切割','激光焊接','数字化工厂','智能工厂','工业互联网','mes','erp','工业软件',
                    '运动控制','伺服','步进','电机','减速机','传动','液压','气动','机床','模具',
                    '检测设备','测试仪','量测','计量','视觉检测','工业相机','机械','零部件','紧固件',
                  ],
                },
                {
                  label: '人工智能', gradient: 'from-pink-500 to-rose-500', icon: <Sparkles className="w-5 h-5 text-white" />,
                  keywords: [
                    '人工智能','机器学习','深度学习','大数据','算法','nlp','自然语言','计算机视觉','语音识别',
                    'gpt','大模型','llm','生成式','aigc','chatbot','智能体','强化学习','神经网络',
                    '云计算','边缘计算','智能分析','知识图谱','推荐系统','数据挖掘','数据治理',
                  ],
                },
                {
                  label: '新材料', gradient: 'from-violet-500 to-purple-600', icon: <Layers className="w-5 h-5 text-white" />,
                  keywords: [
                    '新材料','材料','化工','碳纤维','复合材料','高分子','陶瓷','合金','涂料','石墨烯',
                    '纳米材料','功能材料','结构材料','金属材料','非金属','高性能材料','特种材料',
                    '粉末冶金','锻造','铸造','热处理','表面处理','镀膜','薄膜','胶黏剂','树脂',
                    '聚合物','橡胶','工程塑料','生物材料','半导体材料',
                  ],
                },
                {
                  label: '新能源', gradient: 'from-teal-500 to-emerald-500', icon: <Zap className="w-5 h-5 text-white" />,
                  keywords: [
                    '新能源','光伏','风电','储能','太阳能','氢能','燃料电池','锂电','电池','充电',
                    '逆变器','变流器','光储','风储','微电网','分布式能源','发电','并网','绿电',
                    '电化学储能','钠电池','固态电池','电芯','电极','隔膜','电解液','bms',
                  ],
                },
                {
                  label: '新能源汽车', gradient: 'from-green-500 to-emerald-600', icon: <Car className="w-5 h-5 text-white" />,
                  keywords: [
                    '新能源汽车','电动车','电动汽车','汽车','整车','车载','adas','自动驾驶','智能驾驶',
                    '车联网','充电桩','换电','车规','车载芯片','域控制器','智能座舱','抬头显示',
                    '底盘','电驱','电控','电桥','减速箱','热管理','空调压缩机','线控制动',
                  ],
                },
                {
                  label: '医疗器械', gradient: 'from-rose-500 to-red-500', icon: <Heart className="w-5 h-5 text-white" />,
                  keywords: [
                    '医疗器械','医疗','生物','医药','健康','基因','制药','诊断','影像','手术','植入','康复',
                    '体外诊断','ivd','超声','内窥镜','ct','mri','监护仪','呼吸机','骨科','眼科',
                    '心血管','神经','脑机接口','生物技术','抗体','疫苗','细胞治疗','基因编辑',
                    '医用耗材','医用材料','辅助检测','临床',
                  ],
                },
                {
                  label: '互联网/软件', gradient: 'from-indigo-500 to-blue-600', icon: <Globe className="w-5 h-5 text-white" />,
                  keywords: [
                    '互联网','软件','信息技术','saas','paas','iaas','app','平台','数字化','电商',
                    '游戏','社交','搜索','操作系统','数据库','中间件','安全','网络安全','云原生',
                    '微服务','devops','物联网','iot','5g','通信','网络','区块链','数字孪生',
                    '企业服务','oa','crm','供应链','仓储物流','电子政务',
                  ],
                },
                {
                  label: '金融投资', gradient: 'from-yellow-500 to-orange-400', icon: <TrendingUp className="w-5 h-5 text-white" />,
                  keywords: [
                    '金融','投资','基金','银行','证券','保险','vc','pe','资产','信托','理财','期货',
                    '股权','创投','天使','产业基金','私募','公募','财富管理','资管','融资','并购',
                  ],
                },
              ]
              const OTHER_CATEGORY: StdCategory = {
                label: '其他行业', gradient: 'from-gray-500 to-slate-600', icon: <Building2 className="w-5 h-5 text-white" />, keywords: []
              }

              // 同时匹配 industry 字段、公司名称、产品列表
              function normalizeEntity(industry: string, name = '', products: string[] = []): string {
                // 新能源汽车必须在新能源之前，按顺序优先匹配
                const combined = [industry, name, ...products].join(' ').toLowerCase()
                for (const cat of STD_CATEGORIES) {
                  if (cat.keywords.some(kw => combined.includes(kw.toLowerCase()))) return cat.label
                }
                return OTHER_CATEGORY.label
              }

              // "知名企业"：有 achievements / positioning / isFollowed 的企业
              function isFamousCompany(c: CompanyData): boolean {
                return !!(c.isFollowed || c.achievements || c.positioning)
              }

              // 按标准分类分组企业
              const categoryCompanyMap = new Map<string, CompanyData[]>()
              const categoryPeopleMap  = new Map<string, PersonData[]>()
              const allCategoryLabels  = [...STD_CATEGORIES.map(c => c.label), OTHER_CATEGORY.label]
              allCategoryLabels.forEach(l => { categoryCompanyMap.set(l, []); categoryPeopleMap.set(l, []) })

              companies.forEach(c => {
                const cat = normalizeEntity(c.industry, c.name, c.products ?? [])
                categoryCompanyMap.get(cat)!.push(c)
              })
              people.forEach(p => {
                const cat = normalizeEntity(p.industry || '', p.name, [])
                categoryPeopleMap.get(cat)!.push(p)
              })

              // 只展示有数据的分类，其他行业放最后
              const orderedCategories = [
                ...STD_CATEGORIES.filter(cat =>
                  (categoryCompanyMap.get(cat.label)?.length ?? 0) > 0 ||
                  (categoryPeopleMap.get(cat.label)?.length ?? 0) > 0
                ),
                OTHER_CATEGORY,
              ].filter(cat => {
                // 只有其他行业有数据才显示
                if (cat.label === OTHER_CATEGORY.label) {
                  return (categoryCompanyMap.get(OTHER_CATEGORY.label)?.length ?? 0) > 0 ||
                         (categoryPeopleMap.get(OTHER_CATEGORY.label)?.length ?? 0) > 0
                }
                return true
              })

              const totalFamous = companies.filter(isFamousCompany).length

              return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] select-none">
                  {/* 炫彩动效样式 */}
                  <style>{`
                    @keyframes shimmer {
                      0%   { background-position: 0% 50% }
                      50%  { background-position: 100% 50% }
                      100% { background-position: 0% 50% }
                    }
                    .rainbow-text {
                      background: linear-gradient(
                        270deg,
                        #ff6b6b, #ffd93d, #6bcb77, #4d96ff,
                        #c77dff, #ff6b6b
                      );
                      background-size: 400% 400%;
                      -webkit-background-clip: text;
                      -webkit-text-fill-color: transparent;
                      background-clip: text;
                      animation: shimmer 5s ease infinite;
                    }
                  `}</style>

                  {/* 大字标题 */}
                  <h1 className="rainbow-text text-4xl md:text-5xl lg:text-6xl font-black text-center leading-tight px-4">
                    链接万物，让生意变得简单
                  </h1>

                  {/* 副标题 */}
                  <p className="mt-5 text-gray-400 text-base md:text-lg font-normal tracking-wide text-center">
                    生态正在建设中，敬请期待
                  </p>
                </div>
              )
            })()
          )}
        </div>
      </div>

      {/* 编辑信息弹窗 */}
      <PersonEditModal
        person={editingPerson}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSave={handleEditSave}
      />

    </div>
  )
}
