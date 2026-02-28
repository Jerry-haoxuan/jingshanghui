import { NextResponse } from 'next/server'
import { supabase, isSupabaseReady } from '@/lib/supabaseClient'
import { randomUUID } from 'crypto'

// ── 行业关键词推断（与 dashboard 保持一致）─────────────────────
const INDUSTRY_KW: [string, string[]][] = [
  ['半导体', ['半导体','芯片','集成电路','晶圆','封装','光刻','eda','存储','射频','微电子','功率','传感器','mems','光电','光子','vcsel','激光','探测器','igbt','mosfet','gan','sic','碳化硅','氮化镓','mcu','cpu','gpu','fpga','dsp','adc','dac','放大器','驱动器','电源管理','电源ic','模拟','数模','模数','芯粒','先进封装','封测','代工','ip核','通信芯片','雷达芯片','微控制','微处理','硅光','化合物半导体','第三代半导体','宽禁带','电子元器件','分立器件','功率器件']],
  ['智能制造', ['智能制造','制造','工业','自动化','机器人','数控','精密','装备','plc','工控','仪器','仪表','激光切割','激光焊接','数字化工厂','智能工厂','工业互联网','mes','erp','工业软件','运动控制','伺服','步进','电机','减速机','传动','液压','气动','机床','模具','检测设备','测试仪','量测','计量','视觉检测','工业相机','机械','零部件','紧固件']],
  ['人工智能', ['人工智能','机器学习','深度学习','大数据','算法','nlp','自然语言','计算机视觉','语音识别','gpt','大模型','llm','生成式','aigc','chatbot','智能体','强化学习','神经网络','云计算','边缘计算','智能分析','知识图谱','推荐系统','数据挖掘']],
  ['新材料', ['新材料','材料','化工','碳纤维','复合材料','高分子','陶瓷','合金','涂料','石墨烯','纳米材料','功能材料','结构材料','金属材料','非金属','高性能材料','特种材料','粉末冶金','锻造','铸造','热处理','表面处理','镀膜','薄膜','胶黏剂','树脂','聚合物','橡胶','工程塑料','生物材料','半导体材料']],
  ['新能源', ['新能源','光伏','风电','储能','太阳能','氢能','燃料电池','锂电','电池','充电','逆变器','变流器','光储','风储','微电网','分布式能源','发电','并网','绿电','电化学储能','钠电池','固态电池','电芯','电极','隔膜','电解液','bms']],
  ['新能源汽车', ['新能源汽车','电动车','电动汽车','汽车','整车','车载','adas','自动驾驶','智能驾驶','车联网','充电桩','换电','车规','车载芯片','域控制器','智能座舱','底盘','电驱','电控','电桥','减速箱','热管理','空调压缩机','线控制动']],
  ['医疗器械', ['医疗器械','医疗','生物','医药','健康','基因','制药','诊断','影像','手术','植入','康复','体外诊断','ivd','超声','内窥镜','ct','mri','监护仪','呼吸机','骨科','眼科','心血管','神经','脑机接口','生物技术','抗体','疫苗','细胞治疗','基因编辑','医用耗材','医用材料','辅助检测','临床']],
  ['互联网/软件', ['互联网','软件','信息技术','saas','paas','iaas','app','平台','数字化','电商','游戏','社交','搜索','操作系统','数据库','中间件','安全','网络安全','云原生','微服务','devops','物联网','iot','5g','通信','网络','区块链','数字孪生','企业服务','oa','crm','供应链','仓储物流','电子政务']],
  ['金融投资', ['金融','投资','基金','银行','证券','保险','vc','pe','资产','信托','理财','期货','股权','创投','天使','产业基金','私募','公募','财富管理','资管','融资','并购']],
]

function inferIndustry(name: string, fallbackIndustry: string): string {
  const combined = (name + ' ' + fallbackIndustry).toLowerCase()
  for (const [cat, kws] of INDUSTRY_KW) {
    if (kws.some(kw => combined.includes(kw))) return cat
  }
  // 只用名称再试一次（不带 fallback industry，避免错误继承）
  const nameOnly = name.toLowerCase()
  for (const [cat, kws] of INDUSTRY_KW) {
    if (kws.some(kw => nameOnly.includes(kw))) return cat
  }
  return fallbackIndustry || '其他行业'
}

// ── GET：预览待导入企业 ──────────────────────────────────────────
export async function GET() {
  if (!isSupabaseReady) return NextResponse.json({ error: 'Supabase未配置' }, { status: 500 })

  const [{ data: companies, error: ce }, { data: people, error: pe }] = await Promise.all([
    supabase.from('companies').select('name'),
    supabase.from('people').select('name, industry, all_companies'),
  ])
  if (ce || pe) return NextResponse.json({ error: ce?.message ?? pe?.message }, { status: 500 })

  const existingNames = new Set((companies ?? []).map((c: any) => c.name.trim().toLowerCase()))
  const toImport: { name: string; industry: string; inferredIndustry: string; source: string }[] = []
  const seen = new Set<string>()

  for (const person of (people ?? []) as any[]) {
    if (!Array.isArray(person.all_companies)) continue
    for (const entry of person.all_companies) {
      const name = (entry.company ?? '').trim()
      if (!name) continue
      const key = name.toLowerCase()
      if (existingNames.has(key) || seen.has(key)) continue
      seen.add(key)
      const inferredIndustry = inferIndustry(name, person.industry ?? '')
      toImport.push({ name, industry: person.industry ?? '', inferredIndustry, source: person.name })
    }
  }

  return NextResponse.json({
    toImport,
    existingCount: companies?.length ?? 0,
    importCount: toImport.length,
  })
}

// ── POST：执行批量导入 ───────────────────────────────────────────
export async function POST() {
  if (!isSupabaseReady) return NextResponse.json({ error: 'Supabase未配置' }, { status: 500 })

  const [{ data: companies, error: ce }, { data: people, error: pe }] = await Promise.all([
    supabase.from('companies').select('name'),
    supabase.from('people').select('name, industry, all_companies'),
  ])
  if (ce || pe) return NextResponse.json({ error: ce?.message ?? pe?.message }, { status: 500 })

  const existingNames = new Set((companies ?? []).map((c: any) => c.name.trim().toLowerCase()))
  const rows: any[] = []
  const seen = new Set<string>()

  for (const person of (people ?? []) as any[]) {
    if (!Array.isArray(person.all_companies)) continue
    for (const entry of person.all_companies) {
      const name = (entry.company ?? '').trim()
      if (!name) continue
      const key = name.toLowerCase()
      if (existingNames.has(key) || seen.has(key)) continue
      seen.add(key)
      rows.push({
        id: randomUUID(),
        name,
        industry: inferIndustry(name, person.industry ?? ''),
        scale: '',
        products: [],
        is_followed: false,
        additional_info: `从人员档案导入（${person.name}）`,
        positioning: null,
        value: null,
        achievements: null,
        suppliers: [],
        customers: [],
        supplier_infos: null,
        customer_infos: null,
        demands: null,
      })
    }
  }

  if (rows.length === 0) {
    return NextResponse.json({ success: true, imported: 0, message: '无需导入，所有企业已存在' })
  }

  // 分批插入，每批 50 条
  const BATCH = 50
  let imported = 0
  const errors: string[] = []
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await supabase.from('companies').insert(batch)
    if (error) {
      errors.push(`批次 ${Math.floor(i / BATCH) + 1}: ${error.message}`)
    } else {
      imported += batch.length
    }
  }

  return NextResponse.json({
    success: errors.length === 0,
    imported,
    total: rows.length,
    errors,
  })
}
