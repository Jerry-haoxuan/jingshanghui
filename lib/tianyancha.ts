/**
 * 天眼查 Open API 客户端
 * 已开通接口：搜索(816) | 对外投资(823) | 融资历史(826) | 投资事件(829) | 历史股东信息(877) | 企业基本信息(1116)
 * 文档：https://open.tianyancha.com/console/mydata
 *
 * 接口路径可在天眼查控制台"测试工具"页查看，格式为：
 * https://open.api.tianyancha.com/services/open/<模块>/<接口名>/2.0
 */

const TYC_TOKEN = process.env.TIANYANCHA_TOKEN || ''
// 默认直连天眼查（Vercel 海外服务器会被封）
// 若部署在海外，需配置 TIANYANCHA_PROXY_BASE 指向国内中转代理，例如：
// TIANYANCHA_PROXY_BASE=https://your-proxy.your-domain.com
// 代理只需将请求原样转发给 https://open.api.tianyancha.com 即可
const TYC_BASE = process.env.TIANYANCHA_PROXY_BASE || 'https://open.api.tianyancha.com'

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
      cache: 'no-store',
    })
    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      console.error(`[天眼查] HTTP 错误 ${path}: status=${res.status}, body=${errBody}`)
      return null
    }
    const json = await res.json()
    console.log(`[天眼查] 原始响应 ${path}:`, JSON.stringify(json).slice(0, 300))

    // 天眼查响应格式：{ error_code: 0, reason: "ok", result: {...} }
    // error_code 为 0 表示成功，300000 表示无结果，其他为错误
    if (json.error_code !== 0) {
      console.warn(`[天眼查] 业务结果 ${path}: error_code=${json.error_code}, reason=${json.reason}`)
      return null
    }
    return json.result as T
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
  // 搜索接口返回：{ error_code: 0, reason: "ok", result: { total: N, items: [...] } }
  const data = await tycFetch<{ items: TycSearchItem[]; total: number } | TycSearchItem[]>(
    '/services/open/search/2.0',
    { word: keyword, pageSize, pageNum }
  )
  if (!data) return []
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
  // 接口1116：使用 keyword 参数（可传企业名称或天眼查ID）
  return tycFetch<TycCompanyBasic>(
    '/services/open/ic/baseinfoV3/2.0',
    { keyword: companyId }
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
  // 接口823：对外投资，使用 keyword 参数
  // 注意：若接口路径有变，请到天眼查控制台"测试工具"查看接口823的实际请求URL
  const data = await tycFetch<{ items: TycInvestment[] }>(
    '/services/open/ic/inverst/2.0',
    { keyword: companyId, pageNum, pageSize }
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
  // 接口826：融资历史，使用 keyword 参数
  // 注意：若接口路径有变，请到天眼查控制台"测试工具"查看接口826的实际请求URL
  const data = await tycFetch<{ items: TycFinancing[] }>(
    '/services/open/cd/financhingInfo/2.0',
    { keyword: companyId }
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
  // 接口829：投资事件，路径已通过天眼查控制台测试工具确认
  const data = await tycFetch<{ items: TycInvestmentEvent[] }>(
    '/services/open/cd/findTzanli/2.0',
    { keyword: companyId, pageNum, pageSize }
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
  // 接口877：历史股东信息，使用 keyword 参数
  // 注意：若接口路径有变，请到天眼查控制台"测试工具"查看接口877的实际请求URL
  const data = await tycFetch<{ items: TycShareholder[] }>(
    '/services/open/hi/holderInfo/2.0',
    { keyword: companyId, pageNum, pageSize }
  )
  return data?.items || []
}

// ========== 高阶组合函数 ==========

// 企业档案缓存，避免同一公司在短时间内重复查询
const _companyProfileCache = new Map<string, { result: any; fetchedAt: number }>()

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
  const cached = _companyProfileCache.get(companyName)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    console.log(`[天眼查] 企业"${companyName}"命中缓存`)
    return cached.result
  }

  const searchResults = await searchCompany(companyName, 1, 3)
  if (searchResults.length === 0) return null

  const match = searchResults.find(r => r.name === companyName) || searchResults[0]
  const id = match.id

  const [basic, investments, financing, shareholders] = await Promise.all([
    getCompanyBasic(id),
    getOutwardInvestments(id),
    getFinancingHistory(id),
    getShareholderHistory(id),
  ])

  const result = { basic, investments, financing, shareholders }
  _companyProfileCache.set(companyName, { result, fetchedAt: Date.now() })
  return result
}

/**
 * 专门用于获取苏州永鑫方舟的对外投资组合
 * 缓存完整结果 30 分钟，避免每次对话都触发多个 API 请求导致频率限制
 */
const YONGXIN_FANGZHOU = '苏州永鑫方舟股权投资管理合伙企业（普通合伙）'
let _yongxinId: string | null = null

interface YongxinCache {
  result: { companyId: string | null; investments: TycInvestment[]; events: TycInvestmentEvent[]; formattedText: string }
  fetchedAt: number
}
let _yongxinCache: YongxinCache | null = null
const CACHE_TTL_MS = 30 * 60 * 1000  // 30 分钟

export async function getYongxinPortfolio(): Promise<{
  companyId: string | null
  investments: TycInvestment[]
  events: TycInvestmentEvent[]
  formattedText: string
}> {
  if (!TYC_TOKEN) {
    return { companyId: null, investments: [], events: [], formattedText: '' }
  }

  // 命中缓存直接返回，避免频繁调用
  if (_yongxinCache && Date.now() - _yongxinCache.fetchedAt < CACHE_TTL_MS) {
    console.log('[天眼查] 永鑫方舟数据命中缓存，跳过 API 请求')
    return _yongxinCache.result
  }

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

  const result = { companyId: _yongxinId, investments, events, formattedText }
  _yongxinCache = { result, fetchedAt: Date.now() }
  return result
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
