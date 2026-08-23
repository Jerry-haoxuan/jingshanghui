import { NextResponse } from 'next/server'
// 用 xlsx-js-style（SheetJS社区版的一个分支）而不是原版 xlsx，
// 是因为原版免费版不支持写入单元格样式（加粗/背景色），没法把重点内容"标出来"。
// 读取/解析Excel（/api/parse-profile-excel）不需要样式，继续用原版 xlsx 即可。
import * as XLSX from 'xlsx-js-style'
import { EXAMPLE_PERSON_NAMES, EXAMPLE_SUPPLIER_ROWS, EXAMPLE_CUSTOMER_ROWS } from '@/lib/profileTypes'

// 个人与企业信息模板：字段顺序需要和 /api/parse-profile-excel 里的列名一一对应，
// 改这里的表头文字时务必同步改那边的读取逻辑，否则会读不到数据。
const MAIN_HEADERS = [
  '姓名', '出生年月日', '电话1', '电话2', '电话3', '邮箱',
  '现居地', '家乡', '家庭详细地址',
  '公司1', '职位1', '公司2', '职位2', '公司3', '职位3', '公司地址',
  '企业所属行业', '企业规模', '企业定位（我们是做什么的）', '企业价值（为什么选择我们）', '企业关键成就', '企业诉求',
  '党派', '社会组织1', '社会组织2', '社会组织3',
  '本科院校', '本科专业', '本科毕业年份',
  '硕士院校', '硕士专业', '硕士毕业年份',
  '博士院校', '博士专业', '博士毕业年份',
  'EMBA院校', 'EMBA毕业年份',
  '个人爱好', '擅长能力', '期望从精尚慧获得什么', '工作履历', '其他备注'
]

const MAIN_NOTE_ROW = [
  '必填', '可选(格式YYYY-MM-DD)', '必填', '可选', '可选', '可选',
  '可选', '可选', '可选',
  '必填', '可选', '可选', '可选', '可选', '可选', '可选',
  '必填', '可选(见"填写说明")', '可选', '可选', '可选', '可选',
  '可选(见"填写说明")', '可选', '可选', '可选',
  '可选', '可选', '可选',
  '可选', '可选', '可选',
  '可选', '可选', '可选',
  '可选', '可选',
  '可选(多个用逗号分隔)', '可选(多个用逗号分隔)', '可选', '可选', '可选'
]

// 唯一的示例：小明——用一个虚构的名字演示各种字段（多家公司、多段学历）怎么填。
// 注意：不能用网站里真实存在的人名（比如以前用过的"宋江""徐翔"），避免和真实用户混淆。
const EXAMPLE_ROW = [
  EXAMPLE_PERSON_NAMES[0], '1985-06-15', '13900000000', '', '', 'xiaoming@example.com',
  '江苏苏州', '江苏南京', '江苏省苏州市示例路1号',
  '苏州示例科技有限公司', '总经理', '南京示例贸易有限公司', '股东', '', '', '江苏省苏州市工业园区示例大厦8楼',
  '智能制造', '51-100人', '专注精密零部件研发与生产，服务新能源、半导体等行业客户', '拥有自主研发能力，交付周期短、良率高', '累计服务客户50余家，年产值超3000万元', '希望结识更多下游整机厂客户，同时寻找优质原材料供应商',
  '中国共产党', '苏州市工商联理事', '', '',
  '南京大学', '机械工程', '2007',
  '', '', '',
  '', '', '',
  '', '',
  '摄影,健身,阅读', '生产管理,客户谈判', '希望结识更多同行业上下游合作伙伴，拓展业务网络',
  '2007-2012 某国企工程师；2012-2018 某上市制造企业生产总监；2018至今 创办苏州示例科技',
  '这是示例数据，请删除本行后填写你自己的真实信息'
]

const MAIN_COL_WIDTHS = [
  10, 14, 12, 12, 12, 20,
  10, 10, 26,
  22, 14, 22, 14, 16, 12, 26,
  14, 16, 30, 30, 30, 30,
  10, 18, 18, 18,
  16, 14, 10,
  16, 14, 10,
  16, 14, 10,
  16, 12,
  20, 20, 30, 34, 24
].map(w => ({ wch: w }))

// 上游供应商 / 下游客户：一行代表一个供应商/客户，比在主表里塞多列更适合"有几个填几行"的场景
const SUPPLIER_HEADERS = ['供应商名称', '采购物料/类别', '行业大类', '核心业务类别', '关键词', '关键人物1', '关键人物2', '关键人物3']
const SUPPLIER_NOTE_ROW = ['必填', '可选', '可选(见"填写说明")', '可选', '可选(多个用逗号分隔)', '可选', '可选', '可选']
const SUPPLIER_EXAMPLE_ROWS = [
  (({ name, extra, industryCategory, subTitle, keywords, keyPerson1, keyPerson2, keyPerson3 }) =>
    [name, extra, industryCategory, subTitle, keywords, keyPerson1, keyPerson2, keyPerson3])(EXAMPLE_SUPPLIER_ROWS[0]),
]

const CUSTOMER_HEADERS = ['客户名称', '销售产品/类别', '行业大类', '核心业务类别', '关键词', '关键人物1', '关键人物2', '关键人物3']
const CUSTOMER_NOTE_ROW = ['必填', '可选', '可选(见"填写说明")', '可选', '可选(多个用逗号分隔)', '可选', '可选', '可选']
const CUSTOMER_EXAMPLE_ROWS = [
  (({ name, extra, industryCategory, subTitle, keywords, keyPerson1, keyPerson2, keyPerson3 }) =>
    [name, extra, industryCategory, subTitle, keywords, keyPerson1, keyPerson2, keyPerson3])(EXAMPLE_CUSTOMER_ROWS[0]),
]

const INDUSTRY_CATEGORIES = [
  '半导体', '人工智能', '新能源', '生物医药', '智能制造', '新材料', '航空航天', '信息技术',
  '互联网', '金融科技', '电子商务', '物联网', '云计算', '大数据', '区块链', '新能源汽车',
  '智能硬件', '工业互联网', '电子加工装配', '医疗器械', '其他'
]

const PARTY_OPTIONS = [
  '中国共产党', '中国国民党革命委员会', '中国民主同盟', '中国民主建国会', '中国民主促进会',
  '中国农工民主党', '中国致公党', '九三学社', '台湾民主自治同盟', '无党派人士', '群众'
]

const COMPANY_SCALE_OPTIONS = ['1-10人', '11-50人', '51-100人', '101-500人', '501-1000人', '1000人以上']

// ---- 样式定义（xlsx-js-style 用法：给单元格对象加 .s 属性）----
const STYLE_TITLE = { font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1D4ED8' } }, alignment: { vertical: 'center' } }
const STYLE_SECTION = { font: { bold: true, sz: 12, color: { rgb: '1D4ED8' } } }
const STYLE_WARNING = { font: { bold: true, color: { rgb: 'DC2626' } }, fill: { fgColor: { rgb: 'FEF3C7' } } }
const STYLE_NORMAL = { font: { sz: 11 }, alignment: { wrapText: true } }
const STYLE_HEADER_CELL = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '2563EB' } }, alignment: { horizontal: 'center', vertical: 'center' } }
const STYLE_REQUIRED_NOTE = { font: { bold: true, color: { rgb: 'DC2626' }, sz: 10 } }
const STYLE_OPTIONAL_NOTE = { font: { color: { rgb: '6B7280' }, sz: 10, italic: true } }
const STYLE_EXAMPLE_ROW = { font: { color: { rgb: '9CA3AF' }, italic: true } }

// 给"填写说明"sheet里的某一行整行套用样式（该行内容只有一列，A列）
function styleNoteSheetRow(sheet: XLSX.WorkSheet, rowIndex: number, style: any) {
  const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: 0 })
  if (sheet[cellRef]) sheet[cellRef].s = style
}

// 给数据表（个人信息/供应商/客户）的表头行、说明行、示例行整行套样式
function styleDataSheetRow(sheet: XLSX.WorkSheet, rowIndex: number, colCount: number, style: any) {
  for (let c = 0; c < colCount; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c })
    if (sheet[cellRef]) sheet[cellRef].s = style
  }
}

// 说明行里"必填"单独标红加粗，其余"可选..."用灰色斜体，比整行统一样式更醒目
function styleNoteRowByContent(sheet: XLSX.WorkSheet, rowIndex: number, noteRow: string[]) {
  noteRow.forEach((text, c) => {
    const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c })
    if (!sheet[cellRef]) return
    sheet[cellRef].s = text === '必填' ? STYLE_REQUIRED_NOTE : STYLE_OPTIONAL_NOTE
  })
}

export async function GET() {
  try {
    const workbook = XLSX.utils.book_new()

    // ---- Sheet 1：填写说明（放在最前面，第一眼就能看到，重点内容加粗标红/高亮）----
    const helpRows: string[] = [
      '精尚慧个人信息导入模板 - 填写说明',
      '',
      '⚠️ 请先看这里，再去填表，能帮你省很多事：',
      '① 打开后面的"个人与企业信息"表，第3行是示例（小明），照着它的格式在下面新增一行，填你自己的真实信息，然后删除"小明"这一行。',
      '② 必填项只有4个：姓名、电话1、公司1、企业所属行业。其余字段都可以留空，不影响使用。',
      '③ 每次上传只会导入"你自己"这一条信息，不会把表格里的其他行也导进来，所以不用担心示例数据被误当成你的信息。',
      '④ 即使忘记删除"小明"这一示例行，系统上传时也会自动识别并跳过，不会混入你的数据——但还是建议手动删掉，保持表格干净。',
      '',
      '② 怎么填"上游供应商" / "下游客户"表（可选，不填不影响其他信息导入）：',
      '这两张表和"个人与企业信息"表一样，每一行代表一个供应商/客户；你有几个主要的，就填几行，同样删除示例行、只保留你自己的数据。',
      '',
      '③ 日期格式：出生年月日请填 YYYY-MM-DD，例如 1990-01-15。',
      '④ 多个值用逗号分隔的字段：个人爱好、擅长能力、关键词，例如：摄影,旅行,阅读。',
      '',
      '⑤ "行业大类"可选值参考（企业所属行业、供应商/客户行业大类均可参考此列表，没有完全匹配的可填"其他"）：',
      INDUSTRY_CATEGORIES.join('、'),
      '',
      '⑥ "企业规模"可选值参考：',
      COMPANY_SCALE_OPTIONS.join('、'),
      '',
      '⑦ "党派"可选值参考：',
      PARTY_OPTIONS.join('、'),
      '',
      '技术支持：请联系平台管理员',
    ]
    const helpSheet = XLSX.utils.aoa_to_sheet(helpRows.map(r => [r]))
    helpSheet['!cols'] = [{ wch: 110 }]
    // 标题行
    styleNoteSheetRow(helpSheet, 0, STYLE_TITLE)
    helpSheet['!rows'] = helpRows.map((_, i) => (i === 0 ? { hpt: 26 } : { hpt: 18 }))
    // 重点提醒整段（第2行"⚠️请先看这里"）用醒目的黄底红字
    styleNoteSheetRow(helpSheet, 2, STYLE_WARNING)
    // ①②③④ 四条最关键的操作提示，同样标红加粗
    ;[3, 4, 5, 6].forEach(i => styleNoteSheetRow(helpSheet, i, STYLE_WARNING))
    // 剩余小节标题（②③④⑤⑥⑦开头的行）用蓝色加粗，跟正文区分开
    helpRows.forEach((text, i) => {
      if (/^[②③④⑤⑥⑦]/.test(text)) styleNoteSheetRow(helpSheet, i, STYLE_SECTION)
    })
    XLSX.utils.book_append_sheet(workbook, helpSheet, '填写说明')

    // ---- Sheet 2：个人与企业信息（含1行示例：小明）----
    const mainSheet = XLSX.utils.aoa_to_sheet([MAIN_HEADERS, MAIN_NOTE_ROW, EXAMPLE_ROW])
    mainSheet['!cols'] = MAIN_COL_WIDTHS
    mainSheet['!rows'] = [{ hpt: 22 }]
    styleDataSheetRow(mainSheet, 0, MAIN_HEADERS.length, STYLE_HEADER_CELL)
    styleNoteRowByContent(mainSheet, 1, MAIN_NOTE_ROW)
    styleDataSheetRow(mainSheet, 2, MAIN_HEADERS.length, STYLE_EXAMPLE_ROW)
    XLSX.utils.book_append_sheet(workbook, mainSheet, '个人与企业信息')

    // ---- Sheet 3：上游供应商（可多行，每行一个供应商）----
    const supplierSheet = XLSX.utils.aoa_to_sheet([SUPPLIER_HEADERS, SUPPLIER_NOTE_ROW, ...SUPPLIER_EXAMPLE_ROWS])
    supplierSheet['!cols'] = [{ wch: 26 }, { wch: 18 }, { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }]
    styleDataSheetRow(supplierSheet, 0, SUPPLIER_HEADERS.length, STYLE_HEADER_CELL)
    styleNoteRowByContent(supplierSheet, 1, SUPPLIER_NOTE_ROW)
    SUPPLIER_EXAMPLE_ROWS.forEach((_, i) => styleDataSheetRow(supplierSheet, 2 + i, SUPPLIER_HEADERS.length, STYLE_EXAMPLE_ROW))
    XLSX.utils.book_append_sheet(workbook, supplierSheet, '上游供应商')

    // ---- Sheet 4：下游客户（可多行，每行一个客户）----
    const customerSheet = XLSX.utils.aoa_to_sheet([CUSTOMER_HEADERS, CUSTOMER_NOTE_ROW, ...CUSTOMER_EXAMPLE_ROWS])
    customerSheet['!cols'] = [{ wch: 26 }, { wch: 18 }, { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }]
    styleDataSheetRow(customerSheet, 0, CUSTOMER_HEADERS.length, STYLE_HEADER_CELL)
    styleNoteRowByContent(customerSheet, 1, CUSTOMER_NOTE_ROW)
    CUSTOMER_EXAMPLE_ROWS.forEach((_, i) => styleDataSheetRow(customerSheet, 2 + i, CUSTOMER_HEADERS.length, STYLE_EXAMPLE_ROW))
    XLSX.utils.book_append_sheet(workbook, customerSheet, '下游客户')

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="person-template.xlsx"',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Excel模板生成错误:', error)
    return NextResponse.json(
      { error: '生成模板失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    )
  }
}
