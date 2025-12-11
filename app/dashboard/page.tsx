'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Search, Building2, Star, Trash2, MessageSquare, Download, Edit, Network, TrendingUp, Award, Zap, Factory, Cpu, HeartPulse, Car, Banknote, Globe, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getPeople, getCompanies, savePeople, saveCompanies, PersonData, CompanyData, loadPeopleFromCloudIfAvailable, loadCompaniesFromCloudIfAvailable, getMyCards /* resetToDefaultData, clearAllData, hasStoredData */ } from '@/lib/dataStore'
import PersonEditModal from '@/components/PersonEditModal'
import { subscribeCloud, deletePersonFromCloud, deleteCompanyFromCloud } from '@/lib/cloudStore'
import { deterministicAliasName } from '@/lib/deterministicNameAlias'
import { isManager, getUserRole, isMember } from '@/lib/userRole'
import { findPersonByMemberAccount } from '@/lib/memberKeys'

// 行业分类配置（带图标和颜色）
const INDUSTRY_CATEGORIES = [
  { key: '半导体', label: '半导体/芯片', icon: Cpu, color: 'from-blue-500 to-cyan-500', bgColor: 'bg-blue-50', textColor: 'text-blue-700', 
    aliases: ['半导体', '芯片', '集成电路', 'IC', '晶圆', '封装', '测试', '微电子', '纳芯', '东微', '卓胜微', '圣邦', '兆易', '韦尔', '士兰微', '华虹', '中芯', '长电', '通富微', '华天', '晶方', '澜起', '寒武纪', '地平线'] },
  { key: '人工智能', label: '人工智能', icon: Sparkles, color: 'from-purple-500 to-pink-500', bgColor: 'bg-purple-50', textColor: 'text-purple-700',
    aliases: ['人工智能', 'AI', '机器学习', '深度学习', '算法', '智能', '机器人', '自动驾驶', '语音识别', '图像识别', '大模型', 'GPT', '科大讯飞', '商汤', '旷视', '依图', '云从'] },
  { key: '新能源', label: '新能源', icon: Zap, color: 'from-green-500 to-emerald-500', bgColor: 'bg-green-50', textColor: 'text-green-700',
    aliases: ['新能源', '光伏', '太阳能', '风电', '风能', '储能', '电池', '锂电', '氢能', '燃料电池', '隆基', '通威', '阳光电源', '宁德时代', '亿纬锂能', '欣旺达', '国轩', '赣锋'] },
  { key: '新能源汽车', label: '新能源汽车', icon: Car, color: 'from-teal-500 to-green-500', bgColor: 'bg-teal-50', textColor: 'text-teal-700',
    aliases: ['新能源汽车', '电动汽车', '电动车', '汽车', '整车', '充电', '蔚来', '理想', '小鹏', '比亚迪', '特斯拉', '零跑', '哪吒', '威马', '极氪', '极越', '智己'] },
  { key: '生物医药', label: '生物医药', icon: HeartPulse, color: 'from-red-500 to-pink-500', bgColor: 'bg-red-50', textColor: 'text-red-700',
    aliases: ['生物医药', '医药', '制药', '药业', '生物科技', '生物技术', '创新药', '疫苗', '抗体', '基因', '细胞', '恒瑞', '药明康德', '康龙', '泰格', '百济神州', '信达', '君实'] },
  { key: '医疗器械', label: '医疗器械', icon: HeartPulse, color: 'from-rose-500 to-red-500', bgColor: 'bg-rose-50', textColor: 'text-rose-700',
    aliases: ['医疗器械', '医疗设备', '医疗', '器械', '诊断', '影像', '手术', '植入', '内窥镜', '监护', '迈瑞', '联影', '威高', '乐普', '微创', '德品'] },
  { key: '智能制造', label: '智能制造/自动化', icon: Factory, color: 'from-orange-500 to-amber-500', bgColor: 'bg-orange-50', textColor: 'text-orange-700',
    aliases: ['智能制造', '自动化', '工业自动化', '机械', '设备', '数控', '激光', '精密', '检测', '测量', '机床', '工控', '传感器', '伺服', '变频', '鼎纳', '先导', '利元亨', '赢合', '杭可'] },
  { key: '电子加工装配', label: '电子制造/加工', icon: Cpu, color: 'from-indigo-500 to-blue-500', bgColor: 'bg-indigo-50', textColor: 'text-indigo-700',
    aliases: ['电子加工', '电子装配', '电子制造', 'SMT', 'PCBA', 'PCB', '线路板', '代工', 'OEM', 'ODM', 'EMS', '富士康', '立讯', '歌尔', '蓝思', '伯恩', '领益', '舜宇'] },
  { key: '通信光电', label: '通信/光电', icon: Globe, color: 'from-cyan-500 to-blue-500', bgColor: 'bg-cyan-50', textColor: 'text-cyan-700',
    aliases: ['通信', '光通信', '光模块', '光纤', '光缆', '5G', '基站', '天线', '射频', '中际旭创', '光迅', '华工', '新易盛', '剑桥', '太辰光', '博创', '天孚'] },
  { key: '金融投资', label: '金融投资', icon: Banknote, color: 'from-yellow-500 to-orange-500', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700', 
    aliases: ['金融', '投资', '股权', '基金', '证券', '银行', '保险', '私募', '创投', '风投', 'VC', 'PE', '资本', '红杉', '高瓴', 'IDG', '软银', '深创投', '达晨', '君联', '经纬', '启明', '永鑫'] },
  { key: '互联网', label: '互联网/软件', icon: Globe, color: 'from-sky-500 to-blue-500', bgColor: 'bg-sky-50', textColor: 'text-sky-700', 
    aliases: ['互联网', '信息技术', '软件', '云计算', '大数据', '电子商务', 'SaaS', 'PaaS', '云服务', '数据中心', 'IT', '华为', '腾讯', '阿里', '百度', '字节', '美团', '京东', '网易'] },
  { key: '新材料', label: '新材料', icon: Sparkles, color: 'from-violet-500 to-purple-500', bgColor: 'bg-violet-50', textColor: 'text-violet-700',
    aliases: ['新材料', '材料', '化工', '高分子', '复合材料', '碳纤维', '石墨烯', '稀土', '磁材', '钕铁硼', '正极', '负极', '隔膜', '电解液'] },
  { key: '其他', label: '其他行业', icon: Building2, color: 'from-gray-500 to-slate-500', bgColor: 'bg-gray-50', textColor: 'text-gray-700' },
]

// 知名上市公司/大企业关键词（用于识别重要企业）
const NOTABLE_COMPANY_KEYWORDS = [
  '上市', '股份', '集团', '控股', 
  // 知名科技公司
  '华为', '腾讯', '阿里', '百度', '京东', '小米', '字节', '美团', '拼多多', '网易',
  // 知名半导体公司
  '中芯', '台积电', '英特尔', 'Intel', 'AMD', '英伟达', 'NVIDIA', '高通', '联发科', '紫光', '长江存储', '华虹', '士兰微', '韦尔', '卓胜微', '圣邦', '兆易创新', '北方华创', '中微',
  // 知名新能源公司
  '宁德时代', '比亚迪', '特斯拉', 'Tesla', '隆基', '通威', '阳光电源', '蔚来', '理想', '小鹏',
  // 知名制造业
  '富士康', '立讯精密', '歌尔', '蓝思', '伯恩', '德赛', '欣旺达', '亿纬锂能',
  // 知名金融机构
  '红杉', '高瓴', 'IDG', '软银', '深创投', '达晨', '君联', '经纬', '启明', '光速',
  // 其他知名企业
  '华润', '中信', '招商', '平安', '万科', '恒大', '碧桂园',
  // 苏州本地知名企业
  '苏州', '园区', '工业园',
]

// 判断是否为重要企业
const isNotableCompany = (companyName: string): boolean => {
  if (!companyName) return false
  const name = companyName.toLowerCase()
  return NOTABLE_COMPANY_KEYWORDS.some(keyword => 
    name.includes(keyword.toLowerCase())
  )
}

// 从公司名称中提取简称
const getCompanyShortName = (fullName: string): string => {
  if (!fullName) return ''
  // 移除常见后缀
  return fullName
    .replace(/有限公司|股份有限公司|有限责任公司|集团|（.*?）|\(.*?\)/g, '')
    .trim()
    .slice(0, 12) + (fullName.length > 15 ? '...' : '')
}

// 判断企业属于哪个行业分类
const getIndustryCategory = (company: CompanyData): typeof INDUSTRY_CATEGORIES[0] => {
  const industry = company.industry?.toLowerCase() || ''
  const name = company.name?.toLowerCase() || ''
  
  for (const category of INDUSTRY_CATEGORIES) {
    if (category.key === '其他') continue
    
    // 检查行业名称匹配
    if (industry.includes(category.key.toLowerCase())) {
      return category
    }
    
    // 检查别名匹配
    if (category.aliases) {
      for (const alias of category.aliases) {
        if (industry.includes(alias.toLowerCase()) || name.includes(alias.toLowerCase())) {
          return category
        }
      }
    }
  }
  
  // 默认返回"其他"
  return INDUSTRY_CATEGORIES[INDUSTRY_CATEGORIES.length - 1]
}

export default function Dashboard() {
  const router = useRouter()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [people, setPeople] = useState<PersonData[]>([])
  const [companies, setCompanies] = useState<CompanyData[]>([])
  const [isClient, setIsClient] = useState(false)
  const [supabaseWarning, setSupabaseWarning] = useState<string | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingPerson, setEditingPerson] = useState<PersonData | null>(null)
  const [myCards, setMyCards] = useState<PersonData[]>([])
  const [isAnalyzingRelationships, setIsAnalyzingRelationships] = useState(false)
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
      
      console.log('Dashboard 加载数据:', peopleData.length, '个人物,', companiesData.length, '个企业')
      
      setPeople(peopleData)
      setCompanies(companiesData)

      // 加载"我的卡片"
      try {
        if (isMember()) {
          // 如果是会员，根据会员账号查找对应的人物
          const myPerson = findPersonByMemberAccount(peopleData)
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

    return () => clearTimeout(timer)
  }, [router])

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

  // 核心企业（福润和永鑫）
  const coreCompanies = useMemo(() => {
    return companies.filter(company => 
      company.name.includes('福润') || company.name.includes('永鑫')
    )
  }, [companies])

  // 从核心企业的上下游提取所有企业，作为展示的企业列表
  interface DisplayCompany {
    name: string
    industry: string
    type: 'supplier' | 'customer' | 'core'
    sourceCompany: string
    industryCategory?: string
    subTitle?: string
    companyId?: string // 核心企业的ID，用于跳转详情
  }

  const upDownstreamCompanies = useMemo(() => {
    const companyMap = new Map<string, DisplayCompany>()
    
    // 首先添加核心企业本身
    coreCompanies.forEach(company => {
      companyMap.set(company.name, {
        name: company.name,
        industry: company.industry || '待分类',
        type: 'core',
        sourceCompany: '核心企业',
        industryCategory: company.industry,
        subTitle: company.positioning || '',
        companyId: company.id
      })
    })
    
    coreCompanies.forEach(company => {
      // 从供应商中提取
      if (company.suppliers) {
        company.suppliers.forEach(supplier => {
          let name = supplier
          let industryCategory = ''
          let subTitle = ''
          
          if (typeof supplier === 'string' && supplier.startsWith('{')) {
            try {
              const parsed = JSON.parse(supplier)
              name = parsed.supplierName || parsed.name || supplier
              industryCategory = parsed.industryCategory || ''
              subTitle = parsed.subTitle || ''
            } catch {}
          }
          
          if (name && !companyMap.has(name)) {
            companyMap.set(name, {
              name,
              industry: industryCategory || '待分类',
              type: 'supplier',
              sourceCompany: company.name,
              industryCategory,
              subTitle
            })
          }
        })
      }
      
      if (company.supplierInfos) {
        company.supplierInfos.forEach(info => {
          if (info.supplierName && !companyMap.has(info.supplierName)) {
            companyMap.set(info.supplierName, {
              name: info.supplierName,
              industry: info.industryCategory || '待分类',
              type: 'supplier',
              sourceCompany: company.name,
              industryCategory: info.industryCategory,
              subTitle: info.subTitle
            })
          }
        })
      }
      
      // 从客户中提取
      if (company.customers) {
        company.customers.forEach(customer => {
          let name = customer
          let industryCategory = ''
          let subTitle = ''
          
          if (typeof customer === 'string' && customer.startsWith('{')) {
            try {
              const parsed = JSON.parse(customer)
              name = parsed.customerName || parsed.name || customer
              industryCategory = parsed.industryCategory || ''
              subTitle = parsed.subTitle || ''
            } catch {}
          }
          
          if (name && !companyMap.has(name)) {
            companyMap.set(name, {
              name,
              industry: industryCategory || '待分类',
              type: 'customer',
              sourceCompany: company.name,
              industryCategory,
              subTitle
            })
          }
        })
      }
      
      if (company.customerInfos) {
        company.customerInfos.forEach(info => {
          if (info.customerName && !companyMap.has(info.customerName)) {
            companyMap.set(info.customerName, {
              name: info.customerName,
              industry: info.industryCategory || '待分类',
              type: 'customer',
              sourceCompany: company.name,
              industryCategory: info.industryCategory,
              subTitle: info.subTitle
            })
          }
        })
      }
    })
    
    return Array.from(companyMap.values())
  }, [coreCompanies])

  // 过滤搜索结果
  const filteredUpDownstream = useMemo(() => {
    if (!searchQuery) return upDownstreamCompanies
    const query = searchQuery.toLowerCase()
    return upDownstreamCompanies.filter(company =>
      company.name.toLowerCase().includes(query) ||
      company.industry.toLowerCase().includes(query) ||
      (company.subTitle && company.subTitle.toLowerCase().includes(query))
    )
  }, [upDownstreamCompanies, searchQuery])

  // 判断上下游企业属于哪个行业分类
  const getDisplayCompanyCategory = (company: DisplayCompany): typeof INDUSTRY_CATEGORIES[0] => {
    const industry = company.industry?.toLowerCase() || ''
    const industryCategory = company.industryCategory?.toLowerCase() || ''
    const name = company.name?.toLowerCase() || ''
    
    for (const category of INDUSTRY_CATEGORIES) {
      if (category.key === '其他') continue
      
      // 检查行业大类匹配
      if (industryCategory.includes(category.key.toLowerCase())) {
        return category
      }
      
      // 检查行业名称匹配
      if (industry.includes(category.key.toLowerCase())) {
        return category
      }
      
      // 检查别名匹配
      if (category.aliases) {
        for (const alias of category.aliases) {
          if (industry.includes(alias.toLowerCase()) || 
              industryCategory.includes(alias.toLowerCase()) ||
              name.includes(alias.toLowerCase())) {
            return category
          }
        }
      }
    }
    
    return INDUSTRY_CATEGORIES[INDUSTRY_CATEGORIES.length - 1]
  }

  // 按行业分类整理上下游企业
  const categorizedUpDownstream = useMemo(() => {
    const result: { category: typeof INDUSTRY_CATEGORIES[0], companies: DisplayCompany[], isExpanded?: boolean }[] = []
    
    INDUSTRY_CATEGORIES.forEach(category => {
      const categoryCompanies = filteredUpDownstream.filter(company => 
        getDisplayCompanyCategory(company).key === category.key
      )
      
      // 按知名度排序（稳定排序：知名度相同时按名称排序）
      categoryCompanies.sort((a, b) => {
        const aNotable = isNotableCompany(a.name) ? 1 : 0
        const bNotable = isNotableCompany(b.name) ? 1 : 0
        const notableDiff = bNotable - aNotable
        if (notableDiff !== 0) return notableDiff
        // 知名度相同时，按名称排序保证稳定性
        return a.name.localeCompare(b.name)
      })
      
      if (categoryCompanies.length > 0) {
        result.push({ category, companies: categoryCompanies })
      }
    })
    
    // 按企业数量排序，但"其他"始终放最后
    // 使用稳定排序：数量相同时按分类key字母顺序排序，确保每次渲染结果一致
    result.sort((a, b) => {
      if (a.category.key === '其他') return 1
      if (b.category.key === '其他') return -1
      const countDiff = b.companies.length - a.companies.length
      if (countDiff !== 0) return countDiff
      // 数量相同时，按分类key排序保证稳定性
      return a.category.key.localeCompare(b.category.key)
    })
    
    return result
  }, [filteredUpDownstream])

  // 折叠状态管理
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryKey)) {
        newSet.delete(categoryKey)
      } else {
        newSet.add(categoryKey)
      }
      return newSet
    })
  }

  // 展开全部/收起全部
  const expandAll = () => {
    setExpandedCategories(new Set(categorizedUpDownstream.map(c => c.category.key)))
  }

  const collapseAll = () => {
    setExpandedCategories(new Set())
  }

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
        const myPerson = findPersonByMemberAccount(next)
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
              <Link 
                href="/" 
                className="text-2xl font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
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
            {/* 我的 - 查看自己的卡片或录入信息（显示真实信息） */}
            <div>
              <button
                onClick={() => {
                  if (myCards.length > 0) {
                    // 跳转到自己的人物详情页
                    router.push(`/person/${myCards[0].id}`)
                  } else {
                    // 没有卡片时，跳转到信息录入页面
                    router.push('/data-input')
                  }
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
              >
                <Edit className="h-5 w-5" />
                {!isSidebarCollapsed && <span>我的</span>}
              </button>
              {/* 仅显示自己录入的卡片 */}
              {!isSidebarCollapsed && myCards.length > 0 && (
                <div className="mt-2 space-y-1 ml-8">
                  {myCards.map(card => (
                    <button
                      key={card.id}
                      onClick={() => {
                        // 跳转到人物详情页
                        router.push(`/person/${card.id}`)
                      }}
                      className="w-full text-left px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded"
                    >
                      {card.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Link
              href="/dashboard"
              className="flex items-center space-x-3 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg"
            >
              <Building2 className="h-5 w-5" />
              {!isSidebarCollapsed && <span>智能关系网</span>}
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
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Supabase 配置警告 */}
          {supabaseWarning && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-yellow-800">{supabaseWarning}</p>
                  <a href="/ENV_CONFIG.md" target="_blank" className="text-sm text-yellow-600 hover:text-yellow-700 underline mt-1 inline-block">
                    查看配置文档
                  </a>
                </div>
              </div>
            </div>
          )}
          
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
                  <Button 
                    variant="default" 
                    onClick={handleAnalyzeAllRelationships}
                    disabled={isAnalyzingRelationships || people.length === 0}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Network className="h-4 w-4 mr-1" /> 
                    {isAnalyzingRelationships ? '分析中...' : '批量分析关系'}
                  </Button>
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

          <div className="space-y-6">
            {/* 统计信息 */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-500 text-white rounded-xl p-3">
                    <Network className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">产业生态网络</h2>
                    <p className="text-gray-600">
                      基于 <span className="font-semibold text-blue-600">{coreCompanies.length}</span> 家核心企业的上下游关系，
                      共收录 <span className="font-semibold text-blue-600">{upDownstreamCompanies.length}</span> 家合作企业
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={expandAll}>
                    全部展开
                  </Button>
                  <Button variant="outline" size="sm" onClick={collapseAll}>
                    全部收起
                  </Button>
                </div>
              </div>
            </div>

            {/* 分类标签折叠展示 */}
            {upDownstreamCompanies.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">暂无企业数据</p>
                <p className="text-sm mt-2">请通过"我的"页面录入企业信息，添加上下游供应商和客户</p>
              </div>
            ) : categorizedUpDownstream.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                没有找到匹配的企业
              </div>
            ) : (
              <div className="space-y-3">
                {categorizedUpDownstream.map(({ category, companies: categoryCompanies }) => {
                  const IconComponent = category.icon
                  const isExpanded = expandedCategories.has(category.key)
                  const notableCount = categoryCompanies.filter(c => isNotableCompany(c.name)).length
                  
                  return (
                    <div key={category.key} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      {/* 可点击的分类标题 */}
                      <button
                        onClick={() => toggleCategory(category.key)}
                        className={`w-full bg-gradient-to-r ${category.color} px-6 py-4 flex items-center justify-between hover:opacity-95 transition-opacity`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                            <IconComponent className="h-5 w-5 text-white" />
                          </div>
                          <div className="text-left">
                            <h2 className="text-lg font-bold text-white">{category.label}</h2>
                            <p className="text-sm text-white/80">
                              {categoryCompanies.length} 家企业
                              {notableCount > 0 && ` · ${notableCount} 家知名企业`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ChevronRight className={`h-6 w-6 text-white transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </button>
                      
                      {/* 可折叠的企业列表 */}
                      {isExpanded && (
                        <div className="p-6 bg-gray-50/50">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {categoryCompanies.map((company, idx) => {
                              const isNotable = isNotableCompany(company.name)
                              return (
                                <div
                                  key={`${company.name}-${idx}`}
                                  className={`group relative rounded-xl p-4 transition-all duration-200 hover:shadow-md ${
                                    isNotable 
                                      ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200' 
                                      : 'bg-white border border-gray-200'
                                  }`}
                                >
                                  {/* 知名企业标识 */}
                                  {isNotable && (
                                    <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                      <Award className="h-3 w-3" />
                                      知名
                                    </div>
                                  )}
                                  
                                  <div className="flex items-start gap-3">
                                    <div className={`flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center ${category.bgColor}`}>
                                      <IconComponent className={`h-4 w-4 ${category.textColor}`} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <h3 className="font-medium text-gray-900 text-sm leading-tight">
                                        {company.name}
                                      </h3>
                                      {company.subTitle && (
                                        <p className="text-xs text-gray-500 mt-1 truncate">{company.subTitle}</p>
                                      )}
                                      <div className="flex items-center gap-2 mt-2">
                                        <span className={`text-xs px-2 py-0.5 rounded ${
                                          company.type === 'core'
                                            ? 'bg-green-100 text-green-700'
                                            : company.type === 'supplier' 
                                              ? 'bg-blue-100 text-blue-700' 
                                              : 'bg-orange-100 text-orange-700'
                                        }`}>
                                          {company.type === 'core' ? '★ 核心企业' : company.type === 'supplier' ? '↑ 供应商' : '↓ 客户'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
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