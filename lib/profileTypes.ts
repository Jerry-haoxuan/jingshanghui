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
// 注意：示例姓名不能用网站里真实存在的人名（如"宋江""徐翔"），避免和真实用户混淆，故统一用"小明"占位。
export const EXAMPLE_PERSON_NAMES = ['小明']
export const EXAMPLE_SUPPLIER_NAMES = ['示例供应商有限公司']
export const EXAMPLE_CUSTOMER_NAMES = ['示例客户有限公司']
