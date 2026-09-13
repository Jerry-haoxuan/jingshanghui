import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import {
  ExtractedProfile,
  buildEmptyProfile,
  ExampleRowShape,
  EXAMPLE_PERSON_NAMES,
  EXAMPLE_SUPPLIER_ROWS,
  EXAMPLE_CUSTOMER_ROWS,
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
  const expandYear = (y: string): string => {
    if (y.length === 4) return y
    const n = parseInt(y, 10)
    if (Number.isNaN(n)) return y
    return String(n <= 30 ? 2000 + n : 1900 + n)
  }
  // 常见的 M/D/YYYY、M/D/YY 或 YYYY/M/D 格式，尽量归一成 YYYY-MM-DD
  const slashMatch = s.match(/^(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})$/)
  if (slashMatch) {
    const [, a, b, c] = slashMatch
    if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`
    if (c.length === 2 || c.length === 4) {
      return `${expandYear(c)}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`
    }
  }
  return s
}

// 主表按"表头文字"读取——主表所有表头都是唯一的，用列名读最直观。
function readSheetRows(workbook: XLSX.WorkBook, sheetName: string): Record<string, unknown>[] {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false }) as Record<string, unknown>[]
}

// 供应商/客户表按"列位置"读取，而不是按表头文字读取。
// 原因：这两张表里关键人物1/2/3后面各跟一列"职位"，3个"职位"表头文字是一样的，
// 如果按表头文字转 JSON（sheet_to_json 默认行为），同名的表头会互相覆盖，导致只剩最后一个
// "职位"的值、前两个丢失。改成先按二维数组读取整张表，再用固定下标取值，就不会有这个问题。
// 列顺序（0-based下标）：0供应商/客户名称 1采购物料或销售产品 2行业大类 3核心业务类别 4关键词
// 5关键人物1 6职位 7关键人物2 8职位 9关键人物3 10职位
const SC_COL = {
  name: 0, extra: 1, industryCategory: 2, subTitle: 3, keywords: 4,
  keyPerson1: 5, keyPerson1Position: 6, keyPerson2: 7, keyPerson2Position: 8, keyPerson3: 9, keyPerson3Position: 10,
} as const

function readSheetRowsAsArrays(workbook: XLSX.WorkBook, sheetName: string): unknown[][] {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return []
  // header:1 => 每行原样返回成数组（不按表头文字转对象），跳过表头行(0)和说明行(1)，从第3行起才是数据
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }) as unknown[][]
  return rows.slice(2)
}

type SupplierCustomerRow = {
  name: string; extra: string; industryCategory: string; subTitle: string; keywords: string
  keyPerson1: string; keyPerson1Position: string
  keyPerson2: string; keyPerson2Position: string
  keyPerson3: string; keyPerson3Position: string
}

function parseSupplierCustomerRow(raw: unknown[]): SupplierCustomerRow {
  return {
    name: str(raw[SC_COL.name]),
    extra: str(raw[SC_COL.extra]),
    industryCategory: str(raw[SC_COL.industryCategory]),
    subTitle: str(raw[SC_COL.subTitle]),
    keywords: str(raw[SC_COL.keywords]),
    keyPerson1: str(raw[SC_COL.keyPerson1]),
    keyPerson1Position: str(raw[SC_COL.keyPerson1Position]),
    keyPerson2: str(raw[SC_COL.keyPerson2]),
    keyPerson2Position: str(raw[SC_COL.keyPerson2Position]),
    keyPerson3: str(raw[SC_COL.keyPerson3]),
    keyPerson3Position: str(raw[SC_COL.keyPerson3Position]),
  }
}

// 供应商/客户示例行用"整行精确匹配"才算示例（不是只看名字），
// 因为示例里可能用了真实存在的公司名（比如"中际旭创"），只按名字过滤会把
// 别的用户填的同名真实数据也误跳过；只有连行业、核心业务、关键词、关键人物、职位都
// 和示例一模一样才会被跳过，正常真实数据几乎不可能完全撞上。
function isExactExampleRow(row: SupplierCustomerRow, examples: ExampleRowShape[]): boolean {
  return examples.some(ex =>
    ex.name === row.name &&
    ex.extra === row.extra &&
    ex.industryCategory === row.industryCategory &&
    ex.subTitle === row.subTitle &&
    ex.keywords === row.keywords &&
    ex.keyPerson1 === row.keyPerson1 &&
    ex.keyPerson1Position === row.keyPerson1Position &&
    ex.keyPerson2 === row.keyPerson2 &&
    ex.keyPerson2Position === row.keyPerson2Position &&
    ex.keyPerson3 === row.keyPerson3 &&
    ex.keyPerson3Position === row.keyPerson3Position
  )
}

function parseMainRow(row: Record<string, unknown>): ExtractedProfile {
  const profile = buildEmptyProfile()

  profile.formData.name = str(row['姓名'])
  profile.formData.birthDate = normalizeDate(row['出生年月日'])
  profile.formData.wechatId = str(row['微信号'])
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

  // 原来这里有"电话3"，现在这一列已经改成"微信号"（见上面 wechatId），所以只剩电话1/2两个。
  profile.phones = [row['电话1'], row['电话2']].map(str).filter(Boolean)
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

    // 跳过说明行（姓名列写着"必填"）和示例行（小明/徐翔），取第一条真实数据；
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
    const supplierRows = readSheetRowsAsArrays(workbook, SUPPLIER_SHEET_NAME).map(parseSupplierCustomerRow)
    profile.supplierInfos = supplierRows
      .filter(row => row.name !== '必填' && row.name && !isExactExampleRow(row, EXAMPLE_SUPPLIER_ROWS))
      .map(row => ({
        materialName: row.extra,
        materialCategory: '',
        supplierName: row.name,
        industryCategory: row.industryCategory,
        subTitle: row.subTitle,
        keywords: row.keywords,
        keyPerson1: row.keyPerson1,
        keyPerson1Position: row.keyPerson1Position,
        keyPerson2: row.keyPerson2,
        keyPerson2Position: row.keyPerson2Position,
        keyPerson3: row.keyPerson3,
        keyPerson3Position: row.keyPerson3Position,
      }))

    const customerRows = readSheetRowsAsArrays(workbook, CUSTOMER_SHEET_NAME).map(parseSupplierCustomerRow)
    profile.customerInfos = customerRows
      .filter(row => row.name !== '必填' && row.name && !isExactExampleRow(row, EXAMPLE_CUSTOMER_ROWS))
      .map(row => ({
        productName: row.extra,
        productCategory: '',
        customerName: row.name,
        industryCategory: row.industryCategory,
        subTitle: row.subTitle,
        keywords: row.keywords,
        keyPerson1: row.keyPerson1,
        keyPerson1Position: row.keyPerson1Position,
        keyPerson2: row.keyPerson2,
        keyPerson2Position: row.keyPerson2Position,
        keyPerson3: row.keyPerson3,
        keyPerson3Position: row.keyPerson3Position,
      }))

    return NextResponse.json({ success: true, profile })
  } catch (error) {
    console.error('[parse-profile-excel] 解析出错:', error)
    return NextResponse.json({ success: false, message: 'Excel解析失败，请检查文件格式后重试，或改用手动填写' }, { status: 500 })
  }
}
