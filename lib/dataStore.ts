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
}

const PEOPLE_KEY = 'ecosystem_people'
const COMPANIES_KEY = 'ecosystem_companies'

// 获取所有人物数据
export const getPeople = (): PersonData[] => {
  if (typeof window === 'undefined') return getDefaultPeople()
  const data = localStorage.getItem(PEOPLE_KEY)
  return data ? JSON.parse(data) : getDefaultPeople()
}

// 获取所有公司数据
export const getCompanies = (): CompanyData[] => {
  if (typeof window === 'undefined') return getDefaultCompanies()
  const data = localStorage.getItem(COMPANIES_KEY)
  return data ? JSON.parse(data) : getDefaultCompanies()
}

// 保存人物数据
export const savePeople = (people: PersonData[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(people))
}

// 保存公司数据
export const saveCompanies = (companies: CompanyData[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(COMPANIES_KEY, JSON.stringify(companies))
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

// 添加新公司
export const addCompany = (companyData: Omit<CompanyData, 'id'>) => {
  const companies = getCompanies()
  const newCompany: CompanyData = {
    ...companyData,
    id: Date.now().toString(),
    isFollowed: false
  }
  companies.push(newCompany)
  saveCompanies(companies)
  return newCompany
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
    company: '精尚慧科技',
    position: '创始人',
    tags: ['创业者', '清华校友', '管理咨询'],
    location: '北京',
    currentCity: '北京市',
    industry: '管理咨询',
    isFollowed: false,
    phone: '13600136000',
    email: 'xuxiang@jinshang.com',
    school: '清华大学',
    hometown: '上海市',
    products: '智能人脉管理平台',
    additionalInfo: '精尚慧创始人，专注于人脉网络分析'
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