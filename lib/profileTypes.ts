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
export const EXAMPLE_SUPPLIER_NAMES = ['示例供应商有限公司']
export const EXAMPLE_CUSTOMER_NAMES = ['示例客户有限公司']
