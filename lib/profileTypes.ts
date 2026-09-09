// 人物/企业档案的统一结构，供"上传Word/PDF/图片AI识别"和"上传Excel模板"两条录入链路共用，
// 前端拿到后用同一套逻辑回填表单（app/add/page.tsx、components/PersonEditModal.tsx）。
export interface ExtractedProfile {
  formData: {
    name: string
    birthDate: string
    wechatId: string // 微信号（原"电话3"位置改成了这个字段，见老板修改的真实示例版模板）
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
    keyPerson1Position: string
    keyPerson2: string
    keyPerson2Position: string
    keyPerson3: string
    keyPerson3Position: string
  }[]
  customerInfos: {
    productName: string
    productCategory: string
    customerName: string
    industryCategory: string
    subTitle: string
    keywords: string
    keyPerson1: string
    keyPerson1Position: string
    keyPerson2: string
    keyPerson2Position: string
    keyPerson3: string
    keyPerson3Position: string
  }[]
}

export function buildEmptyProfile(): ExtractedProfile {
  return {
    formData: {
      name: '', birthDate: '', wechatId: '', email: '', hometown: '', currentCity: '',
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
// 注意：网站默认模板（/api/download-template）现在直接用"徐翔"（精尚慧创始人）的真实数据做示例，
// 比虚构占位人物更有参考价值；"小明"是老版本用过的虚构占位示例，保留在跳过名单里是为了兼容
// 之前已经分发出去、可能还在被使用的旧版模板文件（万一有人上传时忘删"小明"那一行，照样能被过滤掉）。
export const EXAMPLE_PERSON_NAMES = ['小明', '徐翔']

// 上游供应商/下游客户的示例行改成"整行精确匹配"才跳过（而不是只看名字），
// 是因为徐翔示例版模板里用了真实公司名（比如"中际旭创"），这些是客观存在的真实企业，
// 以后完全可能有别的用户也把它填成自己真实的客户/供应商。如果只按名字过滤，会把
// 别人真实的数据也误跳过；改成"名字+行业+核心业务+关键词+关键人物+职位"全部一致才跳过，
// 只有恰好把示例原封不动抄一遍才会被过滤，正常真实数据几乎不可能完全撞上。
export interface ExampleRowShape {
  name: string
  extra: string // 供应商=采购物料/类别，客户=销售产品/类别
  industryCategory: string
  subTitle: string
  keywords: string
  keyPerson1: string
  keyPerson1Position: string
  keyPerson2: string
  keyPerson2Position: string
  keyPerson3: string
  keyPerson3Position: string
}

export const EXAMPLE_SUPPLIER_ROWS: ExampleRowShape[] = [
  // 旧版虚构占位示例（不再用于网站模板，仅保留在过滤名单里防止旧版模板文件的示例行被误当成真实数据导入）
  { name: '示例供应商有限公司', extra: '原材料', industryCategory: '新材料', subTitle: '原材料供应', keywords: '原材料,加工', keyPerson1: '张三', keyPerson1Position: '', keyPerson2: '', keyPerson2Position: '', keyPerson3: '', keyPerson3Position: '' },
  // 徐翔真实示例：他所在永鑫方舟的真实上游资源（老板修改后的真实数据版本），现在网站默认模板和
  // 单独的"徐翔真实示例版"模板都用这一条
  { name: '苏州工业园区国际科技园', extra: '租赁办公室', industryCategory: '其他', subTitle: '产业园', keywords: '国资产业园', keyPerson1: '张峰', keyPerson1Position: '董事长', keyPerson2: '吴琦', keyPerson2Position: '招商经理', keyPerson3: '', keyPerson3Position: '' },
]

export const EXAMPLE_CUSTOMER_ROWS: ExampleRowShape[] = [
  // 旧版虚构占位示例（不再用于网站模板，仅保留在过滤名单里防止旧版模板文件的示例行被误当成真实数据导入）
  { name: '示例客户有限公司', extra: '精密零部件', industryCategory: '智能制造', subTitle: '整机组装采购', keywords: '零部件,采购', keyPerson1: '李四', keyPerson1Position: '', keyPerson2: '', keyPerson2Position: '', keyPerson3: '', keyPerson3Position: '' },
  // 徐翔真实示例：永鑫方舟真实投后企业客户（老板改成只保留中际旭创这一条，信息填得更完整），现在
  // 网站默认模板和单独的"徐翔真实示例版"模板都用这一条
  { name: '中际旭创股份有限公司', extra: '光模块', industryCategory: '人工智能', subTitle: '人工智能', keywords: '谷歌英伟达供应商', keyPerson1: '刘圣', keyPerson1Position: '董事长', keyPerson2: '丁海', keyPerson2Position: '副总裁', keyPerson3: '郑学哲', keyPerson3Position: '研究院院长' },
]
