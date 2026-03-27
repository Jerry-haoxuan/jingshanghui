/**
 * 天眼查 Open API 客户端
 * 已开通接口：搜索(816) | 对外投资(823) | 融资历史(826) | 投资事件(829) | 历史股东信息(877) | 企业基本信息(1116)
 * 文档：https://open.tianyancha.com/console/mydata
 */

const TYC_TOKEN = process.env.TIANYANCHA_TOKEN || ''
const TYC_BASE = 'https://open.tianyancha.com'

// 通用请求函数
async function tycFetch<T>(path: string, params: Record<string, string | number> = {}): Promise<T | null> {
  if (!TYC_TOKEN) {
    console.warn('[天眼查] Token 未配置，跳过请求')
    return null
  }

  const url = new URL(`${TYC_BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))

  try {
    console.log(`[天眼查] 请求 ${path}，参数:`, params)
    const res = await fetch(url.toString(), {
      headers: { Authorization: TYC_TOKEN },
      cache: 'no-store', // 临时关闭缓存，方便调试
    })
    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      console.error(`[天眼查] HTTP 错误 ${path}: status=${res.status}, body=${errBody}`)
      return null
    }
    const json = await res.json()
    console.log(`[天眼查] 原始响应 ${path}:`, JSON.stringify(json).slice(0, 300))
    if (json.state !== 'ok' && json.code !== 200) {
      console.error(`[天眼查] 业务错误 ${path}: state=${json.state}, code=${json.code}, msg=${json.message || json.msg}`)
      return null
    }
    return json.data as T
  } catch (e) {
    console.error(`[天眼查] 网络错误 ${path}:`, e)
    return null
  }
}

// ========== 接口816：企业搜索 ==========
export interface TycSearchItem {
  id: string
  name: string
  legalPersonName: string
  regCapital: string
  regLocation: string
  estiblishTime: string
  category: string
}

export async function searchCompany(keyword: string, pageNum = 1, pageSize = 10): Promise<TycSearchItem[]> {
  const data = await tycFetch<{ items: TycSearchItem[] } | TycSearchItem[]>(
    '/services/v4/search/2.0',
    { word: keyword, pageSize, pageNum }
  )
  if (!data) return []
  // 兼容两种返回格式：直接数组 或 {items: [...]}
  if (Array.isArray(data)) return data
  return (data as { items: TycSearchItem[] }).items || []
}

// ========== 接口1116：企业基本信息 ==========
export interface TycCompanyBasic {
  id: string
  name: string
  legalPersonName: string
  regCapital: string
  actualCapital: string
  estiblishTime: string
  regLocation: string
  businessScope: string
  industry: string
  staffNumRange: string
  emails: string
  phoneNumber: string
  briefIntroduction: string
}

export async function getCompanyBasic(companyId: string): Promise<TycCompanyBasic | null> {
  return tycFetch<TycCompanyBasic>(
    '/services/v4/cloud-other-information/companyinfo/3.0',
    { id: companyId }
  )
}

// ========== 接口823：对外投资 ==========
export interface TycInvestment {
  id: string
  name: string           // 被投企业名称
  percent: string        // 持股比例
  amount: string         // 投资金额
  legalPersonName: string
  regCapital: string
}

export async function getOutwardInvestments(companyId: string, pageNum = 1, pageSize = 20): Promise<TycInvestment[]> {
  const data = await tycFetch<{ items: TycInvestment[] }>(
    '/services/v4/cloud-other-information/investment/2.0',
    { id: companyId, pageNum, pageSize }
  )
  return data?.items || []
}

// ========== 接口826：融资历史 ==========
export interface TycFinancing {
  id: string
  round: string          // 融资轮次（天使轮/A轮等）
  amount: string         // 融资金额
  date: string           // 融资日期
  investorList: string   // 投资方列表
}

export async function getFinancingHistory(companyId: string): Promise<TycFinancing[]> {
  const data = await tycFetch<{ items: TycFinancing[] }>(
    '/services/v4/cloud-other-information/financhingInfo/2.0',
    { id: companyId }
  )
  return data?.items || []
}

// ========== 接口829：投资事件 ==========
export interface TycInvestmentEvent {
  id: string
  companyName: string    // 被投企业
  round: string          // 轮次
  amount: string         // 金额
  date: string           // 日期
  investors: string      // 投资方
}

export async function getInvestmentEvents(companyId: string, pageNum = 1, pageSize = 20): Promise<TycInvestmentEvent[]> {
  const data = await tycFetch<{ items: TycInvestmentEvent[] }>(
    '/services/v4/cloud-other-information/investmentEvent/2.0',
    { id: companyId, pageNum, pageSize }
  )
  return data?.items || []
}

// ========== 接口877：历史股东信息 ==========
export interface TycShareholder {
  name: string           // 股东名称
  percent: string        // 持股比例
  amount: string         // 认缴金额
  type: string           // 股东类型（自然人/企业）
}

export async function getShareholderHistory(companyId: string, pageNum = 1, pageSize = 20): Promise<TycShareholder[]> {
  const data = await tycFetch<{ items: TycShareholder[] }>(
    '/services/v4/cloud-other-information/holderInfo/2.0',
    { id: companyId, pageNum, pageSize }
  )
  return data?.items || []
}

// ========== 高阶组合函数 ==========

/**
 * 先搜索企业拿到ID，再批量查询详细信息
 * 适用于已知企业名但不知道天眼查ID的场景
 */
export async function getCompanyFullProfile(companyName: string): Promise<{
  basic: TycCompanyBasic | null
  investments: TycInvestment[]
  financing: TycFinancing[]
  shareholders: TycShareholder[]
} | null> {
  const searchResults = await searchCompany(companyName, 1, 3)
  if (searchResults.length === 0) return null

  // 精确匹配优先，否则取第一条
  const match = searchResults.find(r => r.name === companyName) || searchResults[0]
  const id = match.id

  // 并行请求所有信息
  const [basic, investments, financing, shareholders] = await Promise.all([
    getCompanyBasic(id),
    getOutwardInvestments(id),
    getFinancingHistory(id),
    getShareholderHistory(id),
  ])

  return { basic, investments, financing, shareholders }
}

/**
 * 专门用于获取苏州永鑫方舟的对外投资组合
 * 每次调用前先搜索确认公司ID
 */
const YONGXIN_FANGZHOU = '苏州永鑫方舟股权投资管理合伙企业（普通合伙）'
let _yongxinId: string | null = null  // 缓存ID，避免重复搜索

export async function getYongxinPortfolio(): Promise<{
  companyId: string | null
  investments: TycInvestment[]
  events: TycInvestmentEvent[]
  formattedText: string
}> {
  if (!TYC_TOKEN) {
    return { companyId: null, investments: [], events: [], formattedText: '' }
  }

  // 搜索苏州永鑫方舟，拿到天眼查ID（用短关键词搜索效果更好）
  if (!_yongxinId) {
    const results = await searchCompany('永鑫方舟', 1, 10)
    console.log(`[天眼查] 搜索"永鑫方舟"结果数量: ${results.length}，结果:`, results.map(r => r.name).join('、'))
    const match = results.find(r => r.name.includes('永鑫方舟') && r.name.includes('苏州')) 
      || results.find(r => r.name.includes('永鑫方舟')) 
      || results[0]
    _yongxinId = match?.id || null
    console.log(`[天眼查] 永鑫方舟 ID: ${_yongxinId}，匹配公司: ${match?.name || '未找到'}`)
  }

  if (!_yongxinId) {
    return { companyId: null, investments: [], events: [], formattedText: '未找到苏州永鑫方舟的天眼查数据' }
  }

  const [investments, events] = await Promise.all([
    getOutwardInvestments(_yongxinId, 1, 50),
    getInvestmentEvents(_yongxinId, 1, 50),
  ])

  // 格式化为文本供 AI 使用
  let formattedText = `【苏州永鑫方舟 对外投资组合（来自天眼查）】\n`

  if (investments.length > 0) {
    formattedText += `\n对外投资企业（共${investments.length}家）：\n`
    investments.forEach((inv, i) => {
      formattedText += `${i + 1}. ${inv.name}`
      if (inv.percent) formattedText += `  持股${inv.percent}`
      if (inv.amount) formattedText += `  金额：${inv.amount}`
      formattedText += '\n'
    })
  }

  if (events.length > 0) {
    formattedText += `\n投资事件（共${events.length}条）：\n`
    events.forEach((ev, i) => {
      formattedText += `${i + 1}. ${ev.date} 投资了 ${ev.companyName}`
      if (ev.round) formattedText += `（${ev.round}）`
      if (ev.amount) formattedText += `  金额：${ev.amount}`
      formattedText += '\n'
    })
  }

  if (investments.length === 0 && events.length === 0) {
    formattedText += '（暂未获取到投资数据）'
  }

  return { companyId: _yongxinId, investments, events, formattedText }
}

/**
 * 将天眼查公司档案格式化为 AI 可读文本
 */
export function formatCompanyProfile(
  name: string,
  profile: Awaited<ReturnType<typeof getCompanyFullProfile>>
): string {
  if (!profile) return `未找到「${name}」的天眼查数据`

  const { basic, investments, financing, shareholders } = profile
  let text = `【${name} - 天眼查数据】\n`

  if (basic) {
    text += `- 法定代表人：${basic.legalPersonName || '未知'}\n`
    text += `- 注册资本：${basic.regCapital || '未知'}\n`
    text += `- 成立时间：${basic.estiblishTime || '未知'}\n`
    text += `- 注册地：${basic.regLocation || '未知'}\n`
    text += `- 行业：${basic.industry || '未知'}\n`
    text += `- 人员规模：${basic.staffNumRange || '未知'}\n`
    if (basic.briefIntroduction) text += `- 简介：${basic.briefIntroduction}\n`
  }

  if (investments.length > 0) {
    text += `- 对外投资（${investments.length}家）：${investments.slice(0, 5).map(i => i.name).join('、')}\n`
  }

  if (financing.length > 0) {
    text += `- 融资历史：${financing.map(f => `${f.round} ${f.amount} (${f.date})`).join(' | ')}\n`
  }

  if (shareholders.length > 0) {
    text += `- 主要股东：${shareholders.slice(0, 3).map(s => `${s.name}(${s.percent})`).join('、')}\n`
  }

  return text
}
