// 人物/企业档案的统一结构，供"上传Word/PDF/图片AI识别"和"上传Excel模板"两条录入链路共用，
// 前端拿到后用同一套逻辑回填表单（app/add/page.tsx、components/PersonEditModal.tsx）。
export interface ExtractedProfile {
  formData: {
    name: string
    birthDate: string
    email: string
    hometown: string
    currentCity: string
    homeAddress: string
    companyAddress: string
    industry: string
    politicalParty: string
    hobbies: string
    skills: string
    expectations: string
    workHistory: string
    additionalInfo: string
    companyIndustry: string
    companyScale: string
    companyPositioning: string
    companyValue: string
    companyAchievements: string
    companyDemands: string
  }
  phones: string[]
  socialOrganizations: string[]
  companyPositions: { company: string; position: string }[]
  educations: { level: '本科' | '硕士' | '博士' | 'EMBA'; school: string; major: string; year: string }[]
  supplierInfos: {
    materialName: string
    materialCategory: string
    supplierName: string
    industryCategory: string
    subTitle: string
    keywords: string
    keyPerson1: string
    keyPerson2: string
    keyPerson3: string
  }[]
  customerInfos: {
    productName: string
    productCategory: string
    customerName: string
    industryCategory: string
    subTitle: string
    keywords: string
    keyPerson1: string
    keyPerson2: string
    keyPerson3: string
  }[]
}

export function buildEmptyProfile(): ExtractedProfile {
  return {
    formData: {
      name: '', birthDate: '', email: '', hometown: '', currentCity: '',
      homeAddress: '', companyAddress: '', industry: '', politicalParty: '',
      hobbies: '', skills: '', expectations: '', workHistory: '', additionalInfo: '',
      companyIndustry: '', companyScale: '', companyPositioning: '', companyValue: '',
      companyAchievements: '', companyDemands: '',
    },
    phones: [],
    socialOrganizations: [],
    companyPositions: [],
    educations: [],
    supplierInfos: [],
    customerInfos: [],
  }
}

// Excel 模板里用来"演示怎么填"的示例数据，姓名/公司名固定为下面这些值。
// 模板生成（/api/download-template）和模板解析（/api/parse-profile-excel）都引用同一份常量，
// 确保"生成的示例"和"解析时自动跳过的示例"两边永远保持一致，不会因为改了模板忘改解析而对不上。
// 注意：网站默认模板的示例统一用"小明"占位，避免和真实用户混淆。
// "徐翔"是另一份专门给客户"描红"参考用的真实示例版模板（不在网站上，单独发给客户），
// 用他的真实数据演示怎么填；这里把"徐翔"也加入跳过名单，是为了保证：
// 不管客户拿到的是哪一版模板，只要示例行没删干净，上传时都会被自动过滤，不会把示例当成客户自己的数据导入。
export const EXAMPLE_PERSON_NAMES = ['小明', '徐翔']

// 上游供应商/下游客户的示例行改成"整行精确匹配"才跳过（而不是只看名字），
// 是因为徐翔示例版模板里用了真实公司名（比如"中际旭创"），这些是客观存在的真实企业，
// 以后完全可能有别的用户也把它填成自己真实的客户/供应商。如果只按名字过滤，会把
// 别人真实的数据也误跳过；改成"名字+行业+核心业务+关键词+关键人物"全部一致才跳过，
// 只有恰好把示例原封不动抄一遍才会被过滤，正常真实数据几乎不可能完全撞上。
export interface ExampleRowShape {
  name: string
  extra: string // 供应商=采购物料/类别，客户=销售产品/类别
  industryCategory: string
  subTitle: string
  keywords: string
  keyPerson1: string
  keyPerson2: string
  keyPerson3: string
}

export const EXAMPLE_SUPPLIER_ROWS: ExampleRowShape[] = [
  // 网站默认模板（小明版）用的通用占位示例
  { name: '示例供应商有限公司', extra: '原材料', industryCategory: '新材料', subTitle: '原材料供应', keywords: '原材料,加工', keyPerson1: '张三', keyPerson2: '', keyPerson3: '' },
  // 徐翔真实示例版模板：他所在的永鑫方舟的真实上游资源
  { name: '苏州工业园区国际科技园', extra: '', industryCategory: '其他', subTitle: '产业园', keywords: '', keyPerson1: '', keyPerson2: '', keyPerson3: '' },
]

export const EXAMPLE_CUSTOMER_ROWS: ExampleRowShape[] = [
  // 网站默认模板（小明版）用的通用占位示例
  { name: '示例客户有限公司', extra: '精密零部件', industryCategory: '智能制造', subTitle: '整机组装采购', keywords: '零部件,采购', keyPerson1: '李四', keyPerson2: '', keyPerson3: '' },
  // 徐翔真实示例版模板：他所在的永鑫方舟真实投后企业客户（节选3家）
  { name: '中际旭创股份有限公司', extra: '', industryCategory: '人工智能', subTitle: '光通讯模组', keywords: '', keyPerson1: '', keyPerson2: '', keyPerson3: '' },
  { name: '苏州鼎纳自动化技术有限公司', extra: '', industryCategory: '智能制造', subTitle: '视觉检测', keywords: '', keyPerson1: '', keyPerson2: '', keyPerson3: '' },
  { name: '苏州东微半导体股份有限公司', extra: '', industryCategory: '半导体', subTitle: '芯片设计', keywords: '', keyPerson1: '', keyPerson2: '', keyPerson3: '' },
]
