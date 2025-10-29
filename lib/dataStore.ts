// 数据存储管理
export interface PersonData {
  id: string
  name: string
  birthDate?: string // 出生年月日
  company: string
  position: string
  allCompanies?: { company: string; position: string }[] // 所有公司职位
  phones?: string[] // 多个电话
  phone?: string // 主要电话（兼容性）
  email?: string
  politicalParty?: string // 党派
  socialOrganizations?: string[] // 社会组织身份
  hobbies?: string // 个人爱好
  skills?: string // 擅长能力
  expectations?: string // 想从精尚慧获得什么
  educations?: { level: string; school: string; major?: string; year?: string }[] // 教育背景
  school?: string // 主要学校（兼容性）
  tags: string[]
  location: string // 保留以兼容旧数据
  currentCity?: string // 现居地
  hometown?: string // 家乡
  homeAddress?: string // 家庭详细位置
  companyAddress?: string // 公司住址
  industry?: string // 行业
  isFollowed?: boolean
  workHistory?: string
  additionalInfo?: string
  products?: string // 保留以兼容现有数据
}

export interface CompanyData {
  id: string
  name: string
  industry: string
  scale: string
  products: string[]
  isFollowed?: boolean
  additionalInfo?: string
  // 新增企业信息字段
  positioning?: string // 企业定位（我们是做什么的）
  value?: string // 企业价值（为什么选择我们）
  achievements?: string // 关键成就（证明实力）
  suppliers?: string[] // 上游供应商
  customers?: string[] // 下游客户
  // 下述字段来自企业录入页面的新表单项，用于更完整的导出
  demands?: string // 企业诉求
  supplierInfos?: { 
    materialName: string; 
    materialCategory: string; 
    supplierName: string; 
    industryCategory: string;  // 行业大类
    subTitle: string;          // 小标题
    keywords: string; 
    keyPerson1: string; 
    keyPerson2: string; 
    keyPerson3: string 
  }[] // 供应商明细
  customerInfos?: { 
    productName: string; 
    productCategory: string; 
    customerName: string; 
    industryCategory: string;  // 行业大类
    subTitle: string;          // 小标题
    keywords: string; 
    keyPerson1: string; 
    keyPerson2: string; 
    keyPerson3: string 
  }[] // 客户明细
}

const PEOPLE_KEY = 'ecosystem_people'
const COMPANIES_KEY = 'ecosystem_companies'
const MY_CARDS_KEY = 'ecosystem_my_card_ids'

// 获取所有人物数据 - 优先使用云端数据
export const getPeople = (): PersonData[] => {
  if (typeof window === 'undefined') {
    console.log('服务端渲染，返回默认人物数据')
    return getDefaultPeople()
  }
  
  // 在生产环境强制使用云端数据
  if (process.env.NODE_ENV === 'production') {
    console.warn('生产环境应使用异步的 loadPeopleFromCloudIfAvailable() 函数')
    // 返回空数组，强制使用云端数据
    return []
  }
  
  try {
    const data = localStorage.getItem(PEOPLE_KEY)
    if (data) {
      const parsedData = JSON.parse(data)
      console.log('从localStorage加载人物数据:', parsedData.length, '个人物')
      
      // 直接返回已保存的数据，不进行强制重置
      return parsedData
    } else {
      console.log('localStorage中没有人物数据，返回默认数据')
      const defaultData = getDefaultPeople()
      // 自动保存默认数据到localStorage
      localStorage.setItem(PEOPLE_KEY, JSON.stringify(defaultData))
      return defaultData
    }
  } catch (error) {
    console.error('加载人物数据时出错:', error)
    const defaultData = getDefaultPeople()
    // 保存默认数据
    try {
      localStorage.setItem(PEOPLE_KEY, JSON.stringify(defaultData))
    } catch (e) {
      console.error('保存默认数据失败:', e)
    }
    return defaultData
  }
}

// 获取所有公司数据 - 优先使用云端数据
export const getCompanies = (): CompanyData[] => {
  if (typeof window === 'undefined') {
    console.log('服务端渲染，返回默认企业数据')
    return getDefaultCompanies()
  }
  
  // 在生产环境强制使用云端数据
  if (process.env.NODE_ENV === 'production') {
    console.warn('生产环境应使用异步的 loadCompaniesFromCloudIfAvailable() 函数')
    // 返回空数组，强制使用云端数据
    return []
  }
  
  try {
    const data = localStorage.getItem(COMPANIES_KEY)
    if (data) {
      const parsedData = JSON.parse(data)
      console.log('从localStorage加载企业数据:', parsedData.length, '个企业')
      
      // 直接返回已保存的数据，不进行强制重置
      return parsedData
    } else {
      console.log('localStorage中没有企业数据，返回默认数据')
      const defaultData = getDefaultCompanies()
      // 自动保存默认数据到localStorage
      localStorage.setItem(COMPANIES_KEY, JSON.stringify(defaultData))
      return defaultData
    }
  } catch (error) {
    console.error('加载企业数据时出错:', error)
    const defaultData = getDefaultCompanies()
    // 保存默认数据
    try {
      localStorage.setItem(COMPANIES_KEY, JSON.stringify(defaultData))
    } catch (e) {
      console.error('保存默认数据失败:', e)
    }
    return defaultData
  }
}

// Cloud sync helpers - 优先使用云端数据
export const loadPeopleFromCloudIfAvailable = async (): Promise<PersonData[] | null> => {
  try {
    const { isSupabaseReady } = await import('./supabaseClient')
    if (!isSupabaseReady) {
      // 在生产环境中，如果 Supabase 未配置，应该警告
      if (process.env.NODE_ENV === 'production') {
        console.error('⚠️ Supabase 未配置！请在 Vercel 中设置环境变量 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY')
      }
      return null
    }
    const { listPeopleFromCloud } = await import('./cloudStore')
    const people = await listPeopleFromCloud()
    // also cache locally
    if (typeof window !== 'undefined') {
      localStorage.setItem(PEOPLE_KEY, JSON.stringify(people))
    }
    return people
  } catch (error) {
    console.error('从云端加载人物数据失败:', error)
    return null
  }
}

export const loadCompaniesFromCloudIfAvailable = async (): Promise<CompanyData[] | null> => {
  try {
    const { isSupabaseReady } = await import('./supabaseClient')
    if (!isSupabaseReady) {
      // 在生产环境中，如果 Supabase 未配置，应该警告
      if (process.env.NODE_ENV === 'production') {
        console.error('⚠️ Supabase 未配置！请在 Vercel 中设置环境变量 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY')
      }
      return null
    }
    const { listCompaniesFromCloud } = await import('./cloudStore')
    const companies = await listCompaniesFromCloud()
    if (typeof window !== 'undefined') {
      localStorage.setItem(COMPANIES_KEY, JSON.stringify(companies))
    }
    return companies
  } catch (error) {
    console.error('从云端加载企业数据失败:', error)
    return null
  }
}

// 重置为默认数据（用于调试和修复数据问题）
export const resetToDefaultData = (): void => {
  if (typeof window === 'undefined') return
  
  console.log('重置为默认数据')
  const defaultPeople = getDefaultPeople()
  const defaultCompanies = getDefaultCompanies()
  
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(defaultPeople))
  localStorage.setItem(COMPANIES_KEY, JSON.stringify(defaultCompanies))
  
  console.log('数据重置完成:', defaultPeople.length, '个人物,', defaultCompanies.length, '个企业')
}

// 清除所有数据（让用户从空白开始）
export const clearAllData = (): void => {
  if (typeof window === 'undefined') return
  
  console.log('清除所有数据')
  localStorage.removeItem(PEOPLE_KEY)
  localStorage.removeItem(COMPANIES_KEY)
  
  console.log('所有数据已清除')
}

// 检查是否有保存的数据
export const hasStoredData = (): boolean => {
  if (typeof window === 'undefined') return false
  
  const peopleData = localStorage.getItem(PEOPLE_KEY)
  const companiesData = localStorage.getItem(COMPANIES_KEY)
  
  return !!(peopleData || companiesData)
}

// 保存人物数据
export const savePeople = (people: PersonData[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(people))
  // fire-and-forget cloud upserts
  ;(async () => {
    try {
      const { isSupabaseReady } = await import('./supabaseClient')
      if (!isSupabaseReady) return
      const { upsertPersonToCloud } = await import('./cloudStore')
      for (const p of people) {
        await upsertPersonToCloud(p)
      }
    } catch (_) {}
  })()
}

// ---- 我的卡片（本地库）----
export const getMyCardIds = (): string[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(MY_CARDS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch (_) {
    return []
  }
}

export const setMyCardIds = (ids: string[]) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(MY_CARDS_KEY, JSON.stringify(Array.from(new Set(ids))))
  } catch (_) {}
}

export const markPersonAsMyCard = (id: string) => {
  const ids = getMyCardIds()
  if (!ids.includes(id)) {
    ids.push(id)
    setMyCardIds(ids)
  }
}

export const getMyCards = (): PersonData[] => {
  const ids = new Set(getMyCardIds())
  if (ids.size === 0) return []
  const people = getPeople()
  return people.filter(p => ids.has(p.id))
}

// 保存公司数据
export const saveCompanies = (companies: CompanyData[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(COMPANIES_KEY, JSON.stringify(companies))
  ;(async () => {
    try {
      const { isSupabaseReady } = await import('./supabaseClient')
      if (!isSupabaseReady) return
      const { upsertCompanyToCloud } = await import('./cloudStore')
      for (const c of companies) {
        await upsertCompanyToCloud(c)
      }
    } catch (_) {}
  })()
}

// 添加新人物
export const addPerson = (personData: Omit<PersonData, 'id' | 'tags' | 'location'>) => {
  const people = getPeople()
  const newPerson: PersonData = {
    ...personData,
    id: Date.now().toString(),
    tags: generateTags(personData),
    location: personData.currentCity || personData.hometown || '未知', // 优先使用现居地
    isFollowed: false
  }
  
  // 注释掉自动创建企业卡片的逻辑，防止个人信息录入和企业信息录入打岔
  // if (personData.company && !getCompanies().find(c => c.name === personData.company)) {
  //   addCompany({
  //     name: personData.company,
  //     industry: personData.industry || '待分类',
  //     scale: '未知',
  //     products: personData.products ? [personData.products] : [],
  //     additionalInfo: ''
  //   })
  // }
  
  people.push(newPerson)
  savePeople(people)
  return newPerson
}

// 更新人物信息
export const updatePerson = (id: string, updatedData: Partial<PersonData>): PersonData | null => {
  const people = getPeople()
  const index = people.findIndex(p => p.id === id)
  
  if (index === -1) {
    return null
  }
  
  // 保留原有数据，合并更新的数据
  const updatedPerson: PersonData = {
    ...people[index],
    ...updatedData,
    id: id, // 确保ID不被覆盖
    tags: generateTags({ ...people[index], ...updatedData }), // 重新生成标签
    location: updatedData.currentCity || updatedData.hometown || people[index].location || '未知'
  }
  
  people[index] = updatedPerson
  savePeople(people)
  return updatedPerson
}

// 添加新公司
// 公司名称标准化函数
const normalizeCompanyName = (name: string): string => {
  return name.trim()
    .replace(/\s+/g, ' ') // 多个空格替换为单个空格
    .replace(/[（(].*?[）)]/g, '') // 移除括号内容，避免"XX有限公司(总部)"和"XX有限公司"被认为是不同公司
    .trim()
}

// 智能添加或更新公司
export const addOrUpdateCompany = (companyData: Omit<CompanyData, 'id'>) => {
  const companies = getCompanies()
  const normalizedName = normalizeCompanyName(companyData.name)
  
  // 查找是否已存在相同公司（标准化后比较）
  const existingIndex = companies.findIndex(c => 
    normalizeCompanyName(c.name) === normalizedName
  )
  
  if (existingIndex >= 0) {
    // 存在则智能合并更新
    const existing = companies[existingIndex]
    companies[existingIndex] = {
      ...existing,
      // 智能合并：保留已有数据，只更新新提供的非空字段
      name: companyData.name.trim(), // 使用最新的完整名称
      industry: companyData.industry || existing.industry,
      scale: companyData.scale || existing.scale,
      products: [...(existing.products || []), ...(companyData.products || [])].filter((v, i, arr) => arr.indexOf(v) === i), // 去重合并
      positioning: companyData.positioning || existing.positioning,
      value: companyData.value || existing.value,
      achievements: companyData.achievements || existing.achievements,
      demands: companyData.demands || existing.demands,
      suppliers: [...(existing.suppliers || []), ...(companyData.suppliers || [])].filter((v, i, arr) => arr.indexOf(v) === i), // 去重合并
      customers: [...(existing.customers || []), ...(companyData.customers || [])].filter((v, i, arr) => arr.indexOf(v) === i), // 去重合并
      supplierInfos: companyData.supplierInfos || existing.supplierInfos,
      customerInfos: companyData.customerInfos || existing.customerInfos,
      additionalInfo: companyData.additionalInfo || existing.additionalInfo,
    }
    saveCompanies(companies)
    return companies[existingIndex]
  } else {
    // 不存在则创建新公司
    const newCompany: CompanyData = {
      ...companyData,
      id: Date.now().toString(),
      isFollowed: false
    }
    companies.push(newCompany)
    saveCompanies(companies)
    return newCompany
  }
}

// 保持向后兼容
export const addCompany = (companyData: Omit<CompanyData, 'id'>) => {
  console.warn('[dataStore] addCompany已过时，推荐使用addOrUpdateCompany避免重复')
  return addOrUpdateCompany(companyData)
}

// 企业去重清理函数 - 处理已存在的重复企业
export const deduplicateCompanies = () => {
  const companies = getCompanies()
  const deduplicatedMap = new Map<string, CompanyData>()
  
  console.log('[dataStore] 开始企业去重，原有企业数量:', companies.length)
  
  companies.forEach(company => {
    const normalizedName = normalizeCompanyName(company.name)
    
    if (deduplicatedMap.has(normalizedName)) {
      // 如果已存在，智能合并信息
      const existing = deduplicatedMap.get(normalizedName)!
      const merged: CompanyData = {
        ...existing,
        // 使用更完整的名称
        name: company.name.length > existing.name.length ? company.name : existing.name,
        industry: company.industry || existing.industry,
        scale: company.scale || existing.scale,
        products: [...(existing.products || []), ...(company.products || [])].filter((v, i, arr) => arr.indexOf(v) === i),
        positioning: company.positioning || existing.positioning,
        value: company.value || existing.value,
        achievements: company.achievements || existing.achievements,
        demands: company.demands || existing.demands,
        suppliers: [...(existing.suppliers || []), ...(company.suppliers || [])].filter((v, i, arr) => arr.indexOf(v) === i),
        customers: [...(existing.customers || []), ...(company.customers || [])].filter((v, i, arr) => arr.indexOf(v) === i),
        supplierInfos: company.supplierInfos || existing.supplierInfos,
        customerInfos: company.customerInfos || existing.customerInfos,
        additionalInfo: company.additionalInfo || existing.additionalInfo,
        isFollowed: existing.isFollowed || company.isFollowed,
      }
      deduplicatedMap.set(normalizedName, merged)
      console.log('[dataStore] 合并重复企业:', existing.name, '+', company.name, '→', merged.name)
    } else {
      deduplicatedMap.set(normalizedName, company)
    }
  })
  
  const deduplicatedCompanies = Array.from(deduplicatedMap.values())
  console.log('[dataStore] 去重完成，企业数量:', companies.length, '→', deduplicatedCompanies.length)
  
  saveCompanies(deduplicatedCompanies)
  return {
    original: companies.length,
    deduplicated: deduplicatedCompanies.length,
    removed: companies.length - deduplicatedCompanies.length
  }
}

// 生成标签
const generateTags = (person: any): string[] => {
  const tags: string[] = []
  
  // 教育背景标签
  if (person.educations && person.educations.length > 0) {
    person.educations.forEach((edu: any) => {
      if (edu.school) {
        tags.push(`${edu.school}校友`)
      }
    })
  } else if (person.school) {
    tags.push(`${person.school}校友`)
  }
  
  // 行业标签
  if (person.industry) {
    tags.push(person.industry)
  }
  
  // 职位标签
  if (person.position) {
    if (person.position.includes('CEO') || person.position.includes('创始人')) {
      tags.push('创业者')
    }
    if (person.position.includes('CTO') || person.position.includes('技术')) {
      tags.push('技术专家')
    }
    if (person.position.includes('产品')) {
      tags.push('产品专家')
    }
  }
  
  // 公司相关标签
  if (person.company) {
    if (person.company.includes('AI') || person.company.includes('人工智能')) {
      tags.push('人工智能')
    }
    if (person.company.includes('金融')) {
      tags.push('金融科技')
    }
  }
  
  // 党派标签
  if (person.politicalParty && person.politicalParty !== '群众') {
    tags.push(person.politicalParty)
  }
  
  // 社会组织标签
  if (person.socialOrganizations && person.socialOrganizations.length > 0) {
    person.socialOrganizations.forEach((org: string) => {
      if (org.trim()) {
        tags.push(org)
      }
    })
  }
  
  // 爱好标签
  if (person.hobbies) {
    const hobbies = person.hobbies.split(/[,，、]/).filter((h: string) => h.trim())
    if (hobbies.length > 0) {
      tags.push(...hobbies.slice(0, 3)) // 最多取前3个爱好作为标签
    }
  }
  
  return Array.from(new Set(tags)) // 去重
}

// 默认数据
const getDefaultPeople = (): PersonData[] => [
  {
    id: '1',
    name: '张三',
    company: '科技创新有限公司',
    position: 'CEO',
    tags: ['人工智能', '创业者', '清华校友', '互联网/电子商务'],
    location: '北京',
    currentCity: '北京市',
    industry: '互联网/电子商务',
    isFollowed: false,
    phone: '13800138000',
    email: 'zhangsan@tech.com',
    school: '清华大学',
    hometown: '杭州市',
    products: 'AI智能客服系统、数据分析平台',
    additionalInfo: '连续创业者，专注于AI领域10年'
  },
  {
    id: '2',
    name: '李四',
    company: '互联网金融集团',
    position: 'CTO',
    tags: ['金融科技', '区块链', '北大校友', '金融/投资/证券'],
    location: '上海',
    currentCity: '上海市',
    industry: '金融/投资/证券',
    isFollowed: true,
    phone: '13900139000',
    email: 'lisi@fintech.com',
    school: '北京大学',
    hometown: '北京市',
    products: '移动支付系统、智能投顾平台'
  },
  {
    id: '3',
    name: '王五',
    company: '新能源汽车公司',
    position: '产品总监',
    tags: ['新能源', '智能制造', '浙大校友', '新能源汽车'],
    location: '杭州',
    currentCity: '杭州市',
    industry: '新能源汽车',
    isFollowed: false,
    school: '浙江大学',
    hometown: '苏州市',
    products: '智能电动汽车、充电解决方案',
    phone: '13700137000',
    email: 'wangwu@newenergy.com'
  },
  {
    id: '4',
    name: '徐翔',
    company: '苏州永鑫方舟股权投资管理合伙企业（有限合伙）',
    position: '合伙人',
    allCompanies: [
      { company: '苏州永鑫方舟股权投资管理合伙企业（有限合伙）', position: '合伙人' },
      { company: '苏州福润科技有限公司', position: '法定代表人' }
    ],
    phones: ['18951108822'],
    phone: '18951108822',
    email: 'xuxiang@jsh-china.com',
    politicalParty: '',
    socialOrganizations: ['苏州市小红帽义工协会会长', '西交利物浦大学商学院特聘教授'],
    hobbies: '跑步，阅读',
    skills: '投资，链接供应链上下游资源',
    expectations: '',
    educations: [
      { level: '本科', school: '同济大学' },
      { level: 'EMBA', school: '清华大学' },
      { level: 'EMBA', school: '上海交通大学' }
    ],
    school: '同济大学',
    tags: ['投资', '供应链', '同济校友', '私募股权'],
    location: '苏州',
    currentCity: '苏州',
    hometown: '苏州',
    industry: '投资/一级市场私募股权投资',
    isFollowed: false,
    workHistory: '德尔福电子采购总监；莱克电气海外营业总经理',
    additionalInfo: ''
  }
]

const getDefaultCompanies = (): CompanyData[] => [
  {
    id: '1',
    name: '科技创新有限公司',
    industry: '人工智能',
    scale: '100-500人',
    products: ['智能客服系统', 'AI数据分析平台'],
    isFollowed: true,
    additionalInfo: '国内领先的AI解决方案提供商'
  },
  {
    id: '2',
    name: '互联网金融集团',
    industry: '金融科技',
    scale: '1000+人',
    products: ['移动支付', '智能投顾'],
    isFollowed: false,
    additionalInfo: '专注于金融科技创新，服务千万用户'
  }
] 