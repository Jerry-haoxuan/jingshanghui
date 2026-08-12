import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import {
  ExtractedProfile,
  buildEmptyProfile,
  EXAMPLE_PERSON_NAMES,
  EXAMPLE_SUPPLIER_NAMES,
  EXAMPLE_CUSTOMER_NAMES,
} from '@/lib/profileTypes'

// 表头文字必须和 /api/download-template 里生成的列名完全一致，改一边记得改另一边
const MAIN_SHEET_NAME = '个人与企业信息'
const SUPPLIER_SHEET_NAME = '上游供应商'
const CUSTOMER_SHEET_NAME = '下游客户'

const str = (v: unknown): string => {
  if (v === undefined || v === null) return ''
  return String(v).trim()
}

// 出生日期在Excel里可能被存成"文本""日期序列号"两种形态，统一转成 YYYY-MM-DD 文本
function normalizeDate(v: unknown): string {
  if (v === undefined || v === null || v === '') return ''
  if (typeof v === 'number') {
    // Excel日期序列号（1900日期系统）转换为JS日期
    const date = new Date(Math.round((v - 25569) * 86400 * 1000))
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  }
  const s = String(v).trim()
  // 常见的 M/D/YYYY 或 YYYY/M/D 格式，尽量归一成 YYYY-MM-DD
  const slashMatch = s.match(/^(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})$/)
  if (slashMatch) {
    const [, a, b, c] = slashMatch
    if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`
    if (c.length === 4) return `${c}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`
  }
  return s
}

function readSheetRows(workbook: XLSX.WorkBook, sheetName: string): Record<string, unknown>[] {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false }) as Record<string, unknown>[]
}

function parseMainRow(row: Record<string, unknown>): ExtractedProfile {
  const profile = buildEmptyProfile()

  profile.formData.name = str(row['姓名'])
  profile.formData.birthDate = normalizeDate(row['出生年月日'])
  profile.formData.email = str(row['邮箱'])
  profile.formData.hometown = str(row['家乡'])
  profile.formData.currentCity = str(row['现居地'])
  profile.formData.homeAddress = str(row['家庭详细地址'])
  profile.formData.companyAddress = str(row['公司地址'])
  profile.formData.politicalParty = str(row['党派'])
  profile.formData.hobbies = str(row['个人爱好'])
  profile.formData.skills = str(row['擅长能力'])
  profile.formData.expectations = str(row['期望从精尚慧获得什么'])
  profile.formData.workHistory = str(row['工作履历'])
  profile.formData.additionalInfo = str(row['其他备注'])
  profile.formData.companyIndustry = str(row['企业所属行业'])
  profile.formData.companyScale = str(row['企业规模'])
  profile.formData.companyPositioning = str(row['企业定位（我们是做什么的）'])
  profile.formData.companyValue = str(row['企业价值（为什么选择我们）'])
  profile.formData.companyAchievements = str(row['企业关键成就'])
  profile.formData.companyDemands = str(row['企业诉求'])

  profile.phones = [row['电话1'], row['电话2'], row['电话3']].map(str).filter(Boolean)
  profile.socialOrganizations = [row['社会组织1'], row['社会组织2'], row['社会组织3']].map(str).filter(Boolean)

  const companyPairs: [unknown, unknown][] = [
    [row['公司1'], row['职位1']],
    [row['公司2'], row['职位2']],
    [row['公司3'], row['职位3']],
  ]
  profile.companyPositions = companyPairs
    .filter(([company]) => str(company))
    .map(([company, position]) => ({ company: str(company), position: str(position) }))

  const educationSpecs: { level: '本科' | '硕士' | '博士' | 'EMBA'; school: unknown; major: unknown; year: unknown }[] = [
    { level: '本科', school: row['本科院校'], major: row['本科专业'], year: row['本科毕业年份'] },
    { level: '硕士', school: row['硕士院校'], major: row['硕士专业'], year: row['硕士毕业年份'] },
    { level: '博士', school: row['博士院校'], major: row['博士专业'], year: row['博士毕业年份'] },
    { level: 'EMBA', school: row['EMBA院校'], major: '', year: row['EMBA毕业年份'] },
  ]
  profile.educations = educationSpecs
    .filter(spec => str(spec.school))
    .map(spec => ({ level: spec.level, school: str(spec.school), major: str(spec.major), year: str(spec.year) }))

  return profile
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ success: false, message: '没有上传文件' }, { status: 400 })
    }
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return NextResponse.json({ success: false, message: '请上传 .xlsx 或 .xls 格式的Excel文件' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    const mainRows = readSheetRows(workbook, MAIN_SHEET_NAME)
    if (mainRows.length === 0) {
      return NextResponse.json({
        success: false,
        message: `未找到"${MAIN_SHEET_NAME}"工作表，请使用网站下载的最新模板填写后再上传`,
      }, { status: 400 })
    }

    // 跳过说明行（姓名列写着"必填"）和示例行（宋江、徐翔），取第一条真实数据；
    // 一次上传只导入这一个人，不会把表里其他行也导进来
    const skipNames = new Set(['必填', ...EXAMPLE_PERSON_NAMES])
    const realRow = mainRows.find(row => {
      const name = str(row['姓名'])
      return name && !skipNames.has(name)
    })

    if (!realRow) {
      return NextResponse.json({
        success: false,
        message: '未在表格中找到你自己的信息，请确认已经在示例行下方新增了一行并填写姓名等信息',
      }, { status: 400 })
    }

    const profile = parseMainRow(realRow)

    // 供应商/客户：两张表都是可选的，没有对应工作表或没填都不算错误
    const skipSuppliers = new Set(['必填', ...EXAMPLE_SUPPLIER_NAMES])
    const supplierRows = readSheetRows(workbook, SUPPLIER_SHEET_NAME)
    profile.supplierInfos = supplierRows
      .filter(row => {
        const name = str(row['供应商名称'])
        return name && !skipSuppliers.has(name)
      })
      .map(row => ({
        materialName: str(row['采购物料/类别']),
        materialCategory: '',
        supplierName: str(row['供应商名称']),
        industryCategory: str(row['行业大类']),
        subTitle: str(row['核心业务类别']),
        keywords: str(row['关键词']),
        keyPerson1: str(row['关键人物1']),
        keyPerson2: str(row['关键人物2']),
        keyPerson3: str(row['关键人物3']),
      }))

    const skipCustomers = new Set(['必填', ...EXAMPLE_CUSTOMER_NAMES])
    const customerRows = readSheetRows(workbook, CUSTOMER_SHEET_NAME)
    profile.customerInfos = customerRows
      .filter(row => {
        const name = str(row['客户名称'])
        return name && !skipCustomers.has(name)
      })
      .map(row => ({
        productName: str(row['销售产品/类别']),
        productCategory: '',
        customerName: str(row['客户名称']),
        industryCategory: str(row['行业大类']),
        subTitle: str(row['核心业务类别']),
        keywords: str(row['关键词']),
        keyPerson1: str(row['关键人物1']),
        keyPerson2: str(row['关键人物2']),
        keyPerson3: str(row['关键人物3']),
      }))

    return NextResponse.json({ success: true, profile })
  } catch (error) {
    console.error('[parse-profile-excel] 解析出错:', error)
    return NextResponse.json({ success: false, message: 'Excel解析失败，请检查文件格式后重试，或改用手动填写' }, { status: 500 })
  }
}
