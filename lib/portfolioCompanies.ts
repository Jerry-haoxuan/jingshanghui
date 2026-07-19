// 已投资并成功上市的企业名单，用于首页横向展示条与生态商圈页竖向展示条，
// 两处保持同一份数据，避免维护两份重复列表。
export interface PortfolioCompany {
  name: string
  code: string
  exchange: string
  tag: string
}

// 按知名度/市场热度排序（非按上市时间）
export const PORTFOLIO_COMPANIES: PortfolioCompany[] = [
  { name: '中际旭创', code: '300308', exchange: '深交所创业板', tag: '全球领先光模块龙头' },
  { name: '联讯仪器', code: '688808', exchange: '上交所科创板', tag: '国产高端测试仪器先锋' },
  { name: '罗博特科', code: '300757', exchange: '深交所创业板', tag: '光伏+泛半导体双主业' },
  { name: '纳芯微', code: '688052', exchange: '上交所科创板', tag: '车规级芯片设计龙头' },
  { name: '知行科技', code: '01274.HK', exchange: '港交所主板', tag: '港股自动驾驶第一股' },
  { name: '贝克微', code: '02149.HK', exchange: '港交所主板', tag: '国内最大模拟IC供应商' },
  { name: '东微半导', code: '688261', exchange: '上交所科创板', tag: '功率半导体专精特新' },
  { name: '胜科纳米', code: '688757', exchange: '上交所科创板', tag: '半导体检测第一股' },
  { name: '昀冢科技', code: '688260', exchange: '上交所科创板', tag: '精密电子零部件制造' },
  { name: '托伦斯', code: '301583', exchange: '深交所创业板', tag: '半导体精密零部件新锐' },
]
