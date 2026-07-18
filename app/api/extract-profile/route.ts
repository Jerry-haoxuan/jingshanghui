import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'
import { recognizeImageText, isOcrConfigured } from '@/lib/ocrService'

// DeepSeek API配置：复用会员AI助手的Key（信息录入功能对会员/管理员一视同仁，无需分账号）
const DEEPSEEK_API_KEY =
  process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY_MEMBER ||
  process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY_MANAGER ||
  process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY ||
  ''
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.bmp', '.webp']
const MAX_TEXT_LENGTH = 15000 // 避免超长文档消耗过多token，超出部分截断

// 提取出的结构化数据，字段与 app/add/page.tsx 表单状态一一对应，前端可直接回填
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

// 把各种格式的文件统一转换成纯文字，后续无论来源如何，都走同一套AI提取逻辑
async function extractTextFromFile(file: File): Promise<{ text: string; error?: string }> {
  const fileName = file.name.toLowerCase()
  const buffer = Buffer.from(await file.arrayBuffer())

  if (fileName.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer })
    return { text: result.value }
  }

  if (fileName.endsWith('.doc')) {
    return { text: '', error: '暂不支持旧版 .doc 格式，请将文档另存为 .docx 后重新上传' }
  }

  if (fileName.endsWith('.pdf')) {
    // 延迟加载，避免影响其他不使用pdf解析的接口的冷启动速度
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()
    return { text: result.text }
  }

  if (fileName.endsWith('.txt')) {
    return { text: buffer.toString('utf-8') }
  }

  if (IMAGE_EXTENSIONS.some(ext => fileName.endsWith(ext))) {
    if (!isOcrConfigured) {
      return { text: '', error: 'OCR图片识别服务尚未配置，暂时无法识别图片文件，请上传Word/PDF/文本文件' }
    }
    const ocrResult = await recognizeImageText(buffer)
    if (!ocrResult.success) {
      return { text: '', error: ocrResult.message || '图片文字识别失败' }
    }
    return { text: ocrResult.text }
  }

  return { text: '', error: '不支持的文件格式，请上传 Word(.docx)、PDF、图片或文本文件' }
}

function buildEmptyProfile(): ExtractedProfile {
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

const EXTRACTION_PROMPT = `你是一个专业的商圈档案信息提取助手。请从下面这段文字（可能是个人简历、名片、公司简介中的任意一种或混合）中，尽可能提取出人物和企业的结构化信息。

请严格按照以下JSON结构返回，不要输出任何JSON之外的文字，没有提取到的字段用空字符串""或空数组[]表示，不要编造信息：

{
  "formData": {
    "name": "姓名",
    "birthDate": "出生日期，格式YYYY-MM-DD，没有则留空",
    "email": "邮箱",
    "hometown": "籍贯/家乡",
    "currentCity": "现居城市",
    "homeAddress": "家庭详细地址",
    "companyAddress": "公司详细地址",
    "industry": "个人所属行业",
    "politicalParty": "党派身份，如有提及",
    "hobbies": "个人爱好",
    "skills": "擅长能力/专业技能",
    "expectations": "本人期待获得的资源或帮助，如有提及",
    "workHistory": "工作履历，按时间顺序简要概括",
    "additionalInfo": "其他不属于以上字段的重要补充信息",
    "companyIndustry": "公司所属行业大类",
    "companyScale": "公司规模，如 1-10人/11-50人/51-100人/101-500人/501-1000人/1000人以上，无法判断则留空",
    "companyPositioning": "企业定位，即公司主要做什么、核心产品/服务",
    "companyValue": "企业核心价值/差异化优势，客户为什么选择这家公司",
    "companyAchievements": "企业关键成就，如里程碑、奖项、知名客户等",
    "companyDemands": "企业当前的诉求，如需要的资源/合作/资金等"
  },
  "phones": ["手机号或座机号，可以有多个"],
  "socialOrganizations": ["社会组织身份，如商会、协会职务等，可以有多个"],
  "companyPositions": [{ "company": "公司全称", "position": "职位" }],
  "educations": [{ "level": "本科/硕士/博士/EMBA其中之一", "school": "学校名称", "major": "专业", "year": "毕业年份" }],
  "supplierInfos": [{ "materialName": "采购物料/类别", "materialCategory": "", "supplierName": "上游供应商名称", "industryCategory": "供应商所属行业大类", "subTitle": "核心业务类别", "keywords": "", "keyPerson1": "", "keyPerson2": "", "keyPerson3": "" }],
  "customerInfos": [{ "productName": "销售产品/类别", "productCategory": "", "customerName": "下游客户名称", "industryCategory": "客户所属行业大类", "subTitle": "核心业务类别", "keywords": "", "keyPerson1": "", "keyPerson2": "", "keyPerson3": "" }]
}

如果文字中没有提到供应商、客户或教育经历，对应数组返回空数组 []。

文字内容如下：
"""
{{CONTENT}}
"""`

async function extractProfileWithAI(text: string): Promise<{ profile?: ExtractedProfile; error?: string }> {
  if (!DEEPSEEK_API_KEY) {
    return { error: 'AI服务尚未配置，无法自动提取信息，请手动填写' }
  }

  const truncated = text.slice(0, MAX_TEXT_LENGTH)
  const prompt = EXTRACTION_PROMPT.replace('{{CONTENT}}', truncated)

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是一个专业的文档信息提取助手，只输出JSON，不输出多余文字。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[信息提取] DeepSeek调用失败:', errorText)
    return { error: 'AI识别服务暂时不可用，请稍后重试或手动填写' }
  }

  const data = await response.json()
  try {
    const content = data.choices[0].message.content
    const parsed = JSON.parse(content)
    // 与空模板合并，防止AI漏返回某些字段导致前端解构报错
    const empty = buildEmptyProfile()
    const profile: ExtractedProfile = {
      formData: { ...empty.formData, ...(parsed.formData || {}) },
      phones: Array.isArray(parsed.phones) ? parsed.phones.filter(Boolean) : [],
      socialOrganizations: Array.isArray(parsed.socialOrganizations) ? parsed.socialOrganizations.filter(Boolean) : [],
      companyPositions: Array.isArray(parsed.companyPositions) ? parsed.companyPositions : [],
      educations: Array.isArray(parsed.educations) ? parsed.educations : [],
      supplierInfos: Array.isArray(parsed.supplierInfos) ? parsed.supplierInfos : [],
      customerInfos: Array.isArray(parsed.customerInfos) ? parsed.customerInfos : [],
    }
    return { profile }
  } catch (err) {
    console.error('[信息提取] 解析AI返回内容失败:', err, data)
    return { error: 'AI返回内容解析失败，请手动填写' }
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ success: false, message: '没有上传文件' }, { status: 400 })
    }

    const { text, error: extractError } = await extractTextFromFile(file)
    if (extractError) {
      return NextResponse.json({ success: false, message: extractError }, { status: 400 })
    }
    if (!text.trim()) {
      return NextResponse.json({ success: false, message: '未能从文件中提取到任何文字内容，请检查文件是否为空' }, { status: 400 })
    }

    const { profile, error: aiError } = await extractProfileWithAI(text)
    if (aiError || !profile) {
      return NextResponse.json({ success: false, message: aiError || 'AI识别失败' }, { status: 500 })
    }

    return NextResponse.json({ success: true, profile })
  } catch (error) {
    console.error('[信息提取] 出错:', error)
    return NextResponse.json({ success: false, message: '文件处理失败，请重试或手动填写' }, { status: 500 })
  }
}
