import { NextRequest, NextResponse } from 'next/server'
import { analyzeAllRelationships, getPersonRelationships, recommendConnections } from '@/lib/relationshipAnalyzer'
import { PersonData, CompanyData } from '@/lib/dataStore'
import { deterministicAliasName, shouldAliasName, findPersonByAliasName, findPeopleByAliasName } from '@/lib/deterministicNameAlias'

// DeepSeek API配置
const DEEPSEEK_API_KEY_MANAGER = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY_MANAGER || 'sk-393da700b1f64e94bd73ee12b450651a'
const DEEPSEEK_API_KEY_MEMBER = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY_MEMBER || 'sk-73f01c8df5354bc1a01a218ef6f27c16'
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

// 博查 (Bocha) 联网搜索 API — 国内搜索引擎，中文结果更优
// 注册地址：https://open.bochaai.com （微信扫码登录）
const BOCHA_API_KEY = process.env.BOCHA_API_KEY || ''

// ========== 联网搜索工具 ==========
interface WebSearchResult {
  title: string
  snippet: string
  link: string
}

async function webSearch(query: string, numResults = 5): Promise<{ results: WebSearchResult[]; success: boolean }> {
  if (!BOCHA_API_KEY) {
    console.log('[WebSearch] Bocha API Key 未配置，跳过联网搜索')
    return { results: [], success: false }
  }
  try {
    const res = await fetch('https://api.bochaai.com/v1/web-search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BOCHA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        summary: true,
        count: numResults,
      }),
    })
    if (!res.ok) {
      console.error('[WebSearch] Bocha API 错误:', res.status)
      return { results: [], success: false }
    }
    const data = await res.json()
    const webPages = data?.webPages?.value || data?.data?.webPages?.value || []
    const results: WebSearchResult[] = webPages.slice(0, numResults).map((item: any) => ({
      title: item.name || item.title || '',
      snippet: item.summary || item.snippet || '',
      link: item.url || item.link || '',
    }))
    console.log(`[WebSearch] 搜索「${query}」返回 ${results.length} 条结果`)
    return { results, success: true }
  } catch (e) {
    console.error('[WebSearch] 搜索失败:', e)
    return { results: [], success: false }
  }
}

// 从用户消息中提取需要联网搜索的公司名（与本地库中的公司匹配）
function extractCompanyNamesToSearch(
  message: string,
  allCompanyNames: string[]
): string[] {
  const found: string[] = []
  for (const name of allCompanyNames) {
    if (name.length >= 3 && message.includes(name)) {
      found.push(name)
    }
  }
  return found
}

// 批量联网搜索多个公司，汇总结果
async function batchWebSearch(
  queries: string[],
  maxQueries = 3
): Promise<{ searchSummary: string; sources: string[] }> {
  const toSearch = queries.slice(0, maxQueries)
  const allResults: WebSearchResult[] = []
  const sources: string[] = []

  await Promise.all(
    toSearch.map(async q => {
      const { results, success } = await webSearch(`${q} 公司业务 主营产品`)
      if (success) {
        allResults.push(...results)
        results.forEach(r => { if (r.link) sources.push(r.link) })
      }
    })
  )

  if (allResults.length === 0) return { searchSummary: '', sources: [] }

  const summary = allResults
    .map(r => `【${r.title}】${r.snippet}`)
    .join('\n')

  return { searchSummary: summary, sources: Array.from(new Set(sources)) }
}

export async function POST(request: NextRequest) {
  // 在函数顶层解析请求体，确保只读一次，catch 块也能访问
  let parsedBody: any = {}
  try {
    parsedBody = await request.json()
  } catch {
    return NextResponse.json({ response: '请求格式错误，请刷新页面重试。' }, { status: 400 })
  }

  const { message, history, people, companies, role, deepThinking } = parsedBody

  try {
    const isMember = role === 'member'
    const useDeepThinking = deepThinking === true
    
    const aliasMode = isMember
    const aliasNameFn = (name: string) => {
      if (!aliasMode) return name
      // 指定人物的别名覆盖（优先级最高）
      const ALIAS_OVERRIDES: Record<string, string> = {
        '徐翔': '宋江',
      }
      // 覆盖优先
      if (ALIAS_OVERRIDES[name]) {
        return ALIAS_OVERRIDES[name]
      }
      // 内部算法复制自 deterministicNameAlias，但不依赖shouldAliasName
      const CHARACTER_NAMES = [
        '宋江','卢俊义','吴用','公孙胜','关胜','林冲','秦明','呼延灼','花荣','柴进','李应','朱仝','鲁智深','武松','董平','张清','杨志','徐宁','索超','戴宗','刘唐','李逵','史进','穆弘','雷横','李俊','阮小二','张横','阮小五','张顺','阮小七','杨雄','石秀','解珍','解宝','燕青','朱武','黄信','孙立','宣赞','郝思文','韩滔','彭玘','单廷圭','魏定国','萧让','裴宣','欧鹏','邓飞','燕顺','孔明','孔亮','项充','李衮','金大坚','马麟','童威','童猛','孟康','侯健','陈达','杨春','郑天寿','陶宗旺','宋清','乐和','龚旺','丁得孙','穆春','曹正','宋万','杜迁','薛永','李忠','周通','汤隆','杜兴','邹润','蔡福','蔡庆','李立','李云','焦挺','石勇','孙新','顾大嫂','张青','孙二娘','王英','扈三娘','鲍旭','樊瑞','郭盛','吕方','杨林','凌振','蒋敬','唐僧','孙悟空','猪八戒','沙僧','观音菩萨','如来佛祖','太上老君','玉皇大帝','王母娘娘','太白金星','托塔天王','哪吒','二郎神','镇元大仙','菩提祖师','东海龙王','南海龙王','西海龙王','北海龙王','文殊菩萨','普贤菩萨','地藏王菩萨','弥勒佛','燃灯古佛','木叉','金吒','红孩儿','牛魔王','铁扇公主','土地公','山神','千里眼','顺风耳','四大天王','赤脚大仙','南极仙翁','福禄寿三星','八仙','嫦娥仙子'
      ]
      const hashString = (str: string) => {
        let hash = 5381
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i)
          hash = ((hash << 5) + hash) + char
        }
        return Math.abs(hash)
      }
      const index = hashString(name) % CHARACTER_NAMES.length
      return CHARACTER_NAMES[index]
    }

         // 覆盖同名函数，使后续代码保持兼容
     const shouldAliasName = () => aliasMode
     const deterministicAliasName = aliasNameFn

    // 始终优先从 Supabase 拉取最新完整数据，保证数据全面性
    // 客户端传来的数据只作为 Supabase 不可用时的降级备用
    let peopleData: PersonData[] = []
    let companyData: CompanyData[] = []

    try {
      const { isSupabaseReady } = await import('@/lib/supabaseClient')
      if (isSupabaseReady) {
        const { listPeopleFromCloud, listCompaniesFromCloud } = await import('@/lib/cloudStore')
        console.log('[AI Chat] 从 Supabase 拉取最新完整数据...')
        ;[peopleData, companyData] = await Promise.all([
          listPeopleFromCloud(),
          listCompaniesFromCloud(),
        ])
        console.log(`[AI Chat] Supabase 数据加载完成：${peopleData.length} 人，${companyData.length} 家企业档案`)
        // 调试：打印每家企业的上下游明细数量
        for (const c of companyData) {
          const si = c.supplierInfos?.length || 0
          const ci = c.customerInfos?.length || 0
          const s = c.suppliers?.length || 0
          const cu = c.customers?.length || 0
          if (si > 0 || ci > 0 || s > 0 || cu > 0) {
            console.log(`[AI Chat] 企业「${c.name}」: supplierInfos=${si}, customerInfos=${ci}, suppliers=${s}, customers=${cu}`)
          }
        }
        // 调试：打印每个人物的 allCompanies 数量
        for (const p of peopleData) {
          const ac = Array.isArray(p.allCompanies) ? p.allCompanies.length : 0
          if (ac > 0) {
            console.log(`[AI Chat] 人物「${p.name}」: allCompanies=${ac}家`)
          }
        }
      }
    } catch (e) {
      console.error('[AI Chat] Supabase 加载失败，降级使用客户端数据:', e)
    }

    // Supabase 不可用时，降级使用客户端传来的数据
    if (peopleData.length === 0) {
      peopleData = Array.isArray(people) ? people : []
      console.warn('[AI Chat] 使用客户端降级数据，人物数量:', peopleData.length)
    }
    if (companyData.length === 0) {
      companyData = Array.isArray(companies) ? companies : []
      console.warn('[AI Chat] 使用客户端降级数据，企业数量:', companyData.length)
    }

    if (peopleData.length === 0) {
      return NextResponse.json({
        response: '抱歉，我当前无法访问到数据库数据。请检查 Supabase 配置，或稍后重试。'
      })
    }
    
    // 分析所有人物关系
    const allRelationships = analyzeAllRelationships(peopleData)
    const relationshipSummary = allRelationships.length > 0 
      ? allRelationships.map(r => {
          const person1 = peopleData.find((p: any) => p.id === r.source)
          const person2 = peopleData.find((p: any) => p.id === r.target)
          if (person1 && person2) {
            const person1DisplayName = aliasMode 
              ? aliasNameFn(person1.name) 
              : `${person1.name} [${aliasNameFn(person1.name)}]`
            const person2DisplayName = aliasMode 
              ? aliasNameFn(person2.name) 
              : `${person2.name} [${aliasNameFn(person2.name)}]`
            return `${person1DisplayName} 与 ${person2DisplayName} - ${r.relationship}`
          }
          return ''
        }).filter(Boolean).join('\n')
      : '暂无分析出的关系'
    
    // ===== 构建全量公司清单（三个来源合并去重）=====
    // 来源1：独立企业档案（companies 表）
    // 来源2：人物档案的 allCompanies 字段
    // 来源3：企业档案的 supplierInfos / customerInfos 字段
    type CompanyEntry = { name: string; detail: string; source: string }
    const allCompanyMap = new Map<string, CompanyEntry>()

    // 来源1：独立企业档案 + 来源3：上下游关系
    for (const c of companyData) {
      if (!c.name) continue
      allCompanyMap.set(c.name, {
        name: c.name,
        detail: [c.industry, c.scale].filter(Boolean).join('・'),
        source: '独立企业档案',
      })

      // 来源3a：supplierInfos（详细版上游）
      if (Array.isArray(c.supplierInfos)) {
        for (const s of c.supplierInfos) {
          if (!s.supplierName || allCompanyMap.has(s.supplierName)) continue
          allCompanyMap.set(s.supplierName, {
            name: s.supplierName,
            detail: `${s.industryCategory || ''}・${s.subTitle || ''}`.replace(/^・|・$/g, ''),
            source: `${c.name}的上游供应商`,
          })
        }
      }
      // 来源3b：suppliers（简单字符串数组上游）
      if (Array.isArray(c.suppliers)) {
        for (const sName of c.suppliers) {
          if (!sName || allCompanyMap.has(sName)) continue
          allCompanyMap.set(sName, {
            name: sName,
            detail: '',
            source: `${c.name}的上游供应商`,
          })
        }
      }

      // 来源3c：customerInfos（详细版下游）
      if (Array.isArray(c.customerInfos)) {
        for (const cu of c.customerInfos) {
          if (!cu.customerName || allCompanyMap.has(cu.customerName)) continue
          allCompanyMap.set(cu.customerName, {
            name: cu.customerName,
            detail: `${cu.industryCategory || ''}・${cu.subTitle || ''}`.replace(/^・|・$/g, ''),
            source: `${c.name}的下游客户`,
          })
        }
      }
      // 来源3d：customers（简单字符串数组下游）——288家客户在这里！
      if (Array.isArray(c.customers)) {
        for (const cuName of c.customers) {
          if (!cuName || allCompanyMap.has(cuName)) continue
          allCompanyMap.set(cuName, {
            name: cuName,
            detail: '',
            source: `${c.name}的下游客户`,
          })
        }
      }
    }

    // 来源2：人物档案的 allCompanies
    for (const p of peopleData) {
      if (p.company && !allCompanyMap.has(p.company)) {
        allCompanyMap.set(p.company, {
          name: p.company,
          detail: p.industry || p.position || '',
          source: `${aliasMode ? aliasNameFn(p.name) : p.name}的主要公司`,
        })
      }
      if (Array.isArray(p.allCompanies)) {
        for (const ac of p.allCompanies as { company: string; position: string }[]) {
          if (!ac.company || allCompanyMap.has(ac.company)) continue
          allCompanyMap.set(ac.company, {
            name: ac.company,
            detail: ac.position || '',
            source: `${aliasMode ? aliasNameFn(p.name) : p.name}的关联公司`,
          })
        }
      }
    }

    const allCompaniesList = Array.from(allCompanyMap.values())
    const allCompaniesSection = allCompaniesList.length > 0
      ? allCompaniesList.map((c, i) =>
          `${i + 1}. ${c.name}${c.detail ? `（${c.detail}）` : ''}【来源：${c.source}】`
        ).join('\n')
      : '暂无公司数据'
    // ===== 全量公司清单构建完成 =====
    const allCompanyNamesArray = Array.from(allCompanyMap.keys())

    // ===== 联网搜索阶段 =====
    // 策略：
    // 1. 从用户消息中识别提到的公司名
    // 2. 对这些公司进行联网搜索获取最新业务信息
    // 3. 如果用户问题较通用（未提到具体公司），搜索关键词补充信息
    let webSearchSection = ''
    let webSearchSources: string[] = []
    let didWebSearch = false

    if (BOCHA_API_KEY) {
      const mentionedCompanies = extractCompanyNamesToSearch(message, allCompanyNamesArray)
      
      if (mentionedCompanies.length > 0) {
        // 用户提到了库里的公司，搜索其最新业务信息
        console.log(`[AI Chat] 用户提到公司: ${mentionedCompanies.join(', ')}，启动联网搜索`)
        const { searchSummary, sources } = await batchWebSearch(mentionedCompanies, 3)
        if (searchSummary) {
          webSearchSection = searchSummary
          webSearchSources = sources
          didWebSearch = true
        }
      } else {
        // 用户没提到具体公司，但可能在问通用商务问题，用消息关键词搜索
        const genericKeywords = message.replace(/[？?！!。，,、]/g, ' ').trim()
        if (genericKeywords.length > 4) {
          console.log(`[AI Chat] 通用问题联网搜索: ${genericKeywords}`)
          const { results, success } = await webSearch(genericKeywords, 3)
          if (success && results.length > 0) {
            webSearchSection = results.map(r => `【${r.title}】${r.snippet}`).join('\n')
            webSearchSources = results.map(r => r.link).filter(Boolean)
            didWebSearch = true
          }
        }
      }
    }
    // ===== 联网搜索阶段结束 =====

    // 增强的系统提示词
    const systemPrompt = `你是精尚慧平台的AI助理"慧慧"。你是一个专业、友好、智能的人脉助手。

你的角色和能力：
1. 帮助用户查找和了解人脉关系
2. 提供智能的人脉推荐和建议
3. 分析人物之间的潜在联系
4. 给出专业的商务社交建议
5. 结合联网搜索的最新信息，提供更准确全面的回答

回答策略（严格按此优先级）：
① 首先搜索精尚慧数据库（${allCompaniesList.length}家公司、${peopleData.length}位人物），优先使用库内数据回答
② 如果库内数据不足，结合联网搜索到的实时信息补充说明
③ 如果库内完全没有相关数据，则基于联网搜索结果给出最合适的回答
④ 回答时要明确区分哪些信息来自库内、哪些来自网络搜索

回答风格：
- 友好亲切，像朋友一样对话
- 专业但不失活泼
- 提供有价值的洞察
- 主动推荐相关联系人

重要的隐私保护规则：
${aliasMode ? `
- 你正在为会员用户服务，所有【人名】都已经AI化处理
- 显示的人名都是水浒传/西游记的角色名，这些是真实人物的代号
- 绝对不能透露或推测真实姓名
- 在所有回复中都要使用AI化的名字
- 当用户询问某个AI化名字时，要理解这是在找某个真实的人
- 用户搜索"沙僧"、"宋江"、"孙悟空"等名字时，要在数据库中精确匹配这些AI化名字
- 如果数据库中没有对应的AI化名字，要明确告诉用户当前可搜索的AI化名字列表
` : `
- 你正在为管理员用户服务，可以显示真实姓名
- 提供完整准确的人物信息
- 每个人名后面都会显示方括号中的AI化名字，格式如："张三 [金大坚]"
- 这个方括号中的名字是该人在会员版中的代号，方便管理者与会员沟通时对应
`}
⚠️ 重要：公司名称、企业名称【永远不需要AI化】，无论是会员还是管理员，都直接显示真实的公司名称。只有人名才需要AI化处理。

数据库公司数量说明：
- 信息库中的公司来自三个来源，合计共 ${allCompaniesList.length} 家（已去重）
- 来源①：独立建档企业（companies表，共${companyData.length}家，含完整详细信息）
- 来源②：人物档案中的关联公司（allCompanies字段，含历史任职公司）
- 来源③：企业上下游关系中的供应商和客户
- 当用户问"库里有多少公司"，应回答 ${allCompaniesList.length} 家，而不是只说${companyData.length}家

当前数据库中的人物信息（包含${people.length}人）：
${people.map((p: PersonData) => {
  const displayName = aliasMode 
    ? aliasNameFn(p.name) 
    : `${p.name} [${aliasNameFn(p.name)}]`;
  // 整理所有关联公司（allCompanies 包含完整的历史公司列表）
  const allCompanyList = Array.isArray(p.allCompanies) && p.allCompanies.length > 0
    ? p.allCompanies.map((c: { company: string; position: string }) => `${c.company}（${c.position}）`).join('、')
    : p.company
  return `
【${displayName}】
- 当前主要公司：${p.company}
- 当前职位：${p.position}
- 所有关联公司（共${Array.isArray(p.allCompanies) ? p.allCompanies.length : 1}家）：${allCompanyList}
- 现居地：${p.currentCity || p.location || '未知'}
- 家乡：${p.hometown || '未知'}
- 行业：${p.industry || '未知'}
- 电话：${aliasMode ? '仅管理员可见' : (p.phone || '未公开')}
- 邮箱：${aliasMode ? '仅管理员可见' : (p.email || '未公开')}
- 毕业院校：${p.school || '未知'}
- 产品/服务：${p.products || '未知'}
- 标签：${p.tags.join('、') || '暂无'}
- 其他信息：${p.additionalInfo || '暂无'}
`;
}).join('\n')}

公司信息：
${companyData.map((c: CompanyData) => {
  // 上游供应商明细（优先用 supplierInfos 详细版，降级用 suppliers 简单版）
  let supplierSection = ''
  if (c.supplierInfos && c.supplierInfos.length > 0) {
    supplierSection = `- 上游供应商（共${c.supplierInfos.length}家，含详细信息）：\n` +
      c.supplierInfos.map((s, i) =>
        `  ${i + 1}. ${s.supplierName}｜行业：${s.industryCategory}｜核心业务：${s.subTitle}${s.materialName ? `｜采购品类：${s.materialName}` : ''}${s.keywords ? `｜关键词：${s.keywords}` : ''}${s.keyPerson1 ? `｜关键人：${s.keyPerson1}${s.keyPerson2 ? '、' + s.keyPerson2 : ''}${s.keyPerson3 ? '、' + s.keyPerson3 : ''}` : ''}`
      ).join('\n')
  } else if (c.suppliers && c.suppliers.length > 0) {
    supplierSection = `- 上游供应商（共${c.suppliers.length}家）：${c.suppliers.join('、')}`
  }

  // 下游客户明细（优先用 customerInfos 详细版，降级用 customers 简单版）
  let customerSection = ''
  if (c.customerInfos && c.customerInfos.length > 0) {
    customerSection = `- 下游客户（共${c.customerInfos.length}家，含详细信息）：\n` +
      c.customerInfos.map((cu, i) =>
        `  ${i + 1}. ${cu.customerName}｜行业：${cu.industryCategory}｜核心业务：${cu.subTitle}${cu.productName ? `｜产品：${cu.productName}` : ''}${cu.keywords ? `｜关键词：${cu.keywords}` : ''}${cu.keyPerson1 ? `｜关键人：${cu.keyPerson1}${cu.keyPerson2 ? '、' + cu.keyPerson2 : ''}${cu.keyPerson3 ? '、' + cu.keyPerson3 : ''}` : ''}`
      ).join('\n')
  } else if (c.customers && c.customers.length > 0) {
    customerSection = `- 下游客户（共${c.customers.length}家）：${c.customers.join('、')}`
  }

  return `
【${c.name}】
- 行业：${c.industry}
- 规模：${c.scale}
- 主要产品：${c.products.join('、')}
${c.positioning ? `- 企业定位：${c.positioning}` : ''}
${c.value ? `- 企业价值：${c.value}` : ''}
${c.achievements ? `- 关键成就：${c.achievements}` : ''}
${c.demands ? `- 企业诉求：${c.demands}` : ''}
${supplierSection}
${customerSection}
- 简介：${c.additionalInfo || '暂无'}
`}).join('\n')}

已分析的人物关系：
${relationshipSummary}

智能搜索策略：
1. 优先匹配姓名${aliasMode ? '（AI化名字）' : ''}
2. 其次匹配公司、职位、标签、行业
3. 推荐同公司、同学校、同行业、同城的人
4. 分析潜在的商务合作机会
5. 基于已有关系推荐二度人脉

重要提醒：
- 用户可能刚上传了Excel数据，要准确反映最新的人物信息
- 要真实反映人物之间的关系，不要虚构不存在的关系
- 如果两个人没有共同点（公司、学校、行业、城市等），就说他们暂时没有直接联系
${aliasMode ? `
- 绝对不能暴露真实姓名，所有人名都必须使用AI化的名字
- 不要提及"真实姓名"、"AI化"等概念，要自然地使用AI化名字
- 当用户问到联系方式时，要引导联系管理员` : ''}

记住：你是慧慧，要表现得智能、专业且友好。不仅要回答用户的问题，还要主动提供有价值的人脉建议。

${aliasMode ? `重要的会员服务提醒：
1. 所有人名都是AI化的代号，要自然地使用这些名字
2. 当用户搜索AI化的名字时，要理解这是在找某个人
3. 在回答时自然地使用AI化的名字，不要暴露任何真实信息
4. 在回答中多处提醒用户联系管理员获取真实信息，如："若需了解真实信息和联系方式，请联系精尚慧管理员"` : ''}

===== 全量公司清单（共 ${allCompaniesList.length} 家，含所有来源）=====
${allCompaniesSection}
===== 全量公司清单结束 =====

${didWebSearch ? `
===== 联网搜索结果（实时从互联网获取）=====
以下是针对用户问题从网上搜索到的最新信息，可以作为补充参考：
${webSearchSection}

引用来源：${webSearchSources.slice(0, 3).join(' | ')}

使用规则：
- 如果库内已有相关数据，以库内为准，联网搜索仅作补充
- 如果库内没有，可以用联网搜索的信息来回答
- 引用联网信息时注明"根据网络公开信息"
===== 联网搜索结果结束 =====
` : ''}`

    // 构建对话历史
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...history.slice(-5).map((msg: any) => ({  // 只保留最近5条历史
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ]

    console.log('Calling DeepSeek API with message:', message)

    // 根据角色选择对应的API密钥
    const apiKey = isMember ? DEEPSEEK_API_KEY_MEMBER : DEEPSEEK_API_KEY_MANAGER

    // 深度思考模式使用 deepseek-reasoner，普通模式使用 deepseek-chat
    const modelName = useDeepThinking ? 'deepseek-reasoner' : 'deepseek-chat'
    console.log('[AI Chat] 使用模型:', modelName, '深度思考:', useDeepThinking)

    // 调用DeepSeek API（加超时控制：普通60秒，深度思考120秒）
    const timeoutMs = useDeepThinking ? 120_000 : 60_000
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    let response: Response
    try {
      response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: messages,
          temperature: useDeepThinking ? 0.6 : 0.8,
          max_tokens: useDeepThinking ? 4000 : 1500,
          top_p: 0.95
        }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DeepSeek API error:', response.status, errorText)
      
      // 如果是认证错误，提示用户
      if (response.status === 401) {
        return NextResponse.json({
          response: '抱歉，AI服务认证失败。不过我可以用本地搜索帮你找人！\n\n' + searchPeople(message, people, companies, role)
        })
      }
      
      // 其他错误使用本地搜索
      return NextResponse.json({
        response: searchPeople(message, people, companies, role)
      })
    }

    const data = await response.json()
    console.log('DeepSeek API response:', data)

    // 防御性检查：choices 可能为空（限流、服务端错误等情况）
    if (!data.choices || data.choices.length === 0 || !data.choices[0]?.message) {
      console.error('[AI Chat] DeepSeek 返回数据异常:', JSON.stringify(data))
      return NextResponse.json({
        response: '⚠️ AI 服务返回了空响应（可能正在限流）。\n\n让我用本地搜索帮你找一下：\n\n' +
          searchPeople(message, people, companies, role)
      })
    }
    
    const responseMessage = data.choices[0].message
    let aiResponse = responseMessage.content || ''
    // deepseek-reasoner 会返回 reasoning_content（思考过程）
    const reasoningContent: string | undefined = responseMessage.reasoning_content || undefined
    
    // 如果是会员用户，增强隐私提示
    if (aliasMode) {
      // 从回复中提取提到的人名
      const mentionedNames = people
        .map((p: PersonData) => aliasNameFn(p.name))
        .filter((name: string) => aiResponse.includes(name))
      
      // 在回复中间适当位置插入提醒
      if (mentionedNames.length > 0) {
        // 如果回复中包含"联系方式"、"电话"、"邮箱"等词，立即提醒
        if (aiResponse.includes('联系方式') || aiResponse.includes('电话') || aiResponse.includes('邮箱')) {
          aiResponse = aiResponse.replace(
            /联系方式[：:]/g, 
            '联系方式（若需真实联系方式，请联系精尚慧管理员）：'
          )
        }
        
        // 在介绍人物基本信息后添加提醒
        const infoEndPattern = /基本信息】[\s\S]*?\n\n/
        if (infoEndPattern.test(aiResponse)) {
          aiResponse = aiResponse.replace(infoEndPattern, (match: string) => 
            match + '💡 温馨提示：您看到的是AI化保护后的名字，若需了解真实信息，请联系精尚慧管理员。\n\n'
          )
        }
        
        // 末尾再次提醒
        aiResponse += `\n\n📞 如需了解${mentionedNames[0]}的真实信息和联系方式，请联系精尚慧管理员。`
      } else {
        // 通用提醒
        aiResponse += '\n\n💡 提醒：所有人名均已AI化保护，若需了解真实信息和联系方式，请联系精尚慧管理员。'
      }
    }

    return NextResponse.json({
      response: aiResponse,
      reasoning: reasoningContent,
      webSearch: didWebSearch,
      webSources: didWebSearch ? webSearchSources.slice(0, 3) : undefined,
    })

  } catch (error: any) {
    console.error('[AI Chat] 出错:', error)

    // 判断错误类型，给出更明确的提示
    const errMsg: string = error?.message || String(error)

    // 网络超时 / fetch 失败
    if (errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('timeout') || errMsg.includes('ECONNREFUSED')) {
      return NextResponse.json({
        response: '⚠️ 连接 AI 服务超时，可能是网络问题或 DeepSeek 服务暂时繁忙。\n\n让我用本地搜索帮你找一下：\n\n' +
          (message && people && companies ? searchPeople(message, people, companies, role) : '请稍后重试或刷新页面。')
      })
    }

    // 数据解析失败（choices 为空等）
    if (errMsg.includes('Cannot read') || errMsg.includes('undefined') || errMsg.includes('null')) {
      return NextResponse.json({
        response: '⚠️ AI 返回了异常数据（可能是模型限流）。\n\n让我用本地搜索帮你找一下：\n\n' +
          (message && people && companies ? searchPeople(message, people, companies, role) : '请稍后重试。')
      })
    }

    // 有请求数据时，降级到本地搜索
    if (message && people && companies) {
      return NextResponse.json({
        response: '⚠️ AI 服务暂时不可用，已切换到本地搜索模式：\n\n' + searchPeople(message, people, companies, role)
      })
    }

    return NextResponse.json({
      response: '抱歉，服务出现了异常，请刷新页面后重试。如持续出现请联系管理员。'
    })
  }
}

// 增强的本地搜索函数
function searchPeople(query: string, people: any[], companies: any[], role: string) {
  const lowerQuery = query.toLowerCase()
  const isMember = role === 'member'
  
  // 本地AI化函数
  const localAliasNameFn = (name: string) => {
    // 指定人物的别名覆盖（优先级最高）
    const ALIAS_OVERRIDES: Record<string, string> = {
      '徐翔': '宋江',
    }
    // 覆盖优先
    if (ALIAS_OVERRIDES[name]) {
      return ALIAS_OVERRIDES[name]
    }
    const CHARACTER_NAMES = ['宋江','卢俊义','吴用','公孙胜','关胜','林冲','秦明','呼延灼','花荣','柴进','李应','朱仝','鲁智深','武松','董平','张清','杨志','徐宁','索超','戴宗','刘唐','李逵','史进','穆弘','雷横','李俊','阮小二','张横','阮小五','张顺','阮小七','杨雄','石秀','解珍','解宝','燕青','朱武','黄信','孙立','宣赞','郝思文','韩滔','彭玘','单廷圭','魏定国','萧让','裴宣','欧鹏','邓飞','燕顺','孔明','孔亮','项充','李衮','金大坚','马麟','童威','童猛','孟康','侯健','陈达','杨春','郑天寿','陶宗旺','宋清','乐和','龚旺','丁得孙','穆春','曹正','宋万','杜迁','薛永','李忠','周通','汤隆','杜兴','邹润','蔡福','蔡庆','李立','李云','焦挺','石勇','孙新','顾大嫂','张青','孙二娘','王英','扈三娘','鲍旭','樊瑞','郭盛','吕方','杨林','凌振','蒋敬','唐僧','孙悟空','猪八戒','沙僧','观音菩萨','如来佛祖','太上老君','玉皇大帝','王母娘娘','太白金星','托塔天王','哪吒','二郎神','镇元大仙','菩提祖师','东海龙王','南海龙王','西海龙王','北海龙王','文殊菩萨','普贤菩萨','地藏王菩萨','弥勒佛','燃灯古佛','木叉','金吒','红孩儿','牛魔王','铁扇公主','土地公','山神','千里眼','顺风耳','四大天王','赤脚大仙','南极仙翁','福禄寿三星','八仙','嫦娥仙子']
    const hashString = (str: string) => {
      let hash = 5381
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) + hash) + char
      }
      return Math.abs(hash)
    }
    const index = hashString(name) % CHARACTER_NAMES.length
    return CHARACTER_NAMES[index]
  }
  
  // 获取显示名称的函数
  const getDisplayName = (name: string) => {
    return isMember ? localAliasNameFn(name) : `${name} [${localAliasNameFn(name)}]`
  }
  
  // 使用新的反向查找功能进行精确搜索
  let exactMatch = findPersonByAliasName(query, people)
  
  // 如果没有找到精确匹配，尝试更宽泛的搜索
  if (!exactMatch) {
    exactMatch = people.find(p => {
      const displayName = isMember ? localAliasNameFn(p.name) : p.name
      
      // 搜索时匹配当前用户角色对应的名字显示方式
      return displayName.toLowerCase() === lowerQuery ||
             displayName.toLowerCase().includes(lowerQuery) ||
             (!isMember && (p.name.toLowerCase() === lowerQuery || 
             p.name.toLowerCase().includes(lowerQuery)))
    })
  }
  
  if (exactMatch) {
    // 使用关系分析器获取相关人物
    const { relatedPeople, relationships } = getPersonRelationships(exactMatch.id, people)
    
    const displayName = getDisplayName(exactMatch.name)
    let response = `太好了！我找到了 ${displayName} 的信息！\n\n`
    response += `📋 **基本信息**\n`
    response += `• 姓名：${displayName}\n`
    response += `• 职位：${exactMatch.position}\n`
    response += `• 公司：${exactMatch.company}\n`
    response += `• 现居地：${exactMatch.currentCity || exactMatch.location}\n`
    if (exactMatch.hometown && exactMatch.hometown !== exactMatch.currentCity) {
      response += `• 家乡：${exactMatch.hometown}\n`
    }
    if (exactMatch.industry) {
      response += `• 行业：${exactMatch.industry}\n`
    }
    
    // 会员用户添加隐私提醒
    if (isMember) {
      response += `\n💡 温馨提示：您看到的是AI化保护后的名字，若需了解真实信息，请联系精尚慧管理员。\n`
    }
    
    // 对于会员用户，隐藏联系方式详情
    if (isMember) {
      response += `\n📞 **联系方式**\n`
      response += `• 联系方式：仅管理员可见（若需真实联系方式，请联系精尚慧管理员）\n`
    } else if (exactMatch.phone || exactMatch.email) {
      response += `\n📞 **联系方式**\n`
      if (exactMatch.phone) response += `• 电话：${exactMatch.phone}\n`
      if (exactMatch.email) response += `• 邮箱：${exactMatch.email}\n`
    }
    
    if (exactMatch.school) {
      response += `\n🎓 **教育背景**\n`
      response += `• 毕业院校：${exactMatch.school}\n`
    }
    
    if (exactMatch.tags.length > 0) {
      response += `\n🏷️ **标签**\n`
      response += `• ${exactMatch.tags.join('、')}\n`
    }
    
    if (exactMatch.additionalInfo) {
      response += `\n💡 **其他信息**\n`
      response += `• ${exactMatch.additionalInfo}\n`
    }
    
    // 智能推荐
    if (relatedPeople.length > 0) {
      response += `\n🤝 **${displayName}的人脉关系**\n`
      
      relationships.forEach((rel: any) => {
        const relatedPerson = relatedPeople.find((p: any) => p.id === rel.target || p.id === rel.source)
        if (relatedPerson && relatedPerson.id !== exactMatch.id) {
          const relatedDisplayName = getDisplayName(relatedPerson.name)
          response += `• ${relatedDisplayName} - ${relatedPerson.position} @ ${relatedPerson.company} (${rel.relationship})\n`
        }
      })
      
      // 推荐可能认识的人
      const recommendations = recommendConnections(exactMatch.id, people, 3)
      if (recommendations.length > 0) {
        response += `\n💡 **可能认识的人**\n`
        recommendations.forEach((rec: any) => {
          const recDisplayName = getDisplayName(rec.person.name)
          response += `• ${recDisplayName} - ${rec.person.position} @ ${rec.person.company} (${rec.reason})\n`
        })
      }
    }
    
    // 如果是会员用户，添加联系管理者的提示
    if (isMember) {
      response += `\n\n📞 如需了解${displayName}的真实信息和联系方式，请联系精尚慧管理员。`
    }
    
    return response
  }
  
  // 搜索公司
  const companyMatch = companies.find(c => 
    c.name.toLowerCase().includes(lowerQuery)
  )
  
  if (companyMatch) {
    const companyPeople = people.filter(p => p.company === companyMatch.name)
    let response = `我找到了 ${companyMatch.name} 的信息！\n\n`
    response += `🏢 **公司概况**\n`
    response += `• 公司名称：${companyMatch.name}\n`
    response += `• 所属行业：${companyMatch.industry}\n`
    response += `• 公司规模：${companyMatch.scale}\n`
    response += `• 主要产品：${companyMatch.products.join('、')}\n`
    
    // 添加新的企业信息字段
    if (companyMatch.positioning) {
      response += `\n🎯 **企业定位**\n`
      response += `• ${companyMatch.positioning}\n`
    }
    
    if (companyMatch.value) {
      response += `\n💎 **企业价值**\n`
      response += `• ${companyMatch.value}\n`
    }
    
    if (companyMatch.achievements) {
      response += `\n🏆 **关键成就**\n`
      response += `• ${companyMatch.achievements}\n`
    }
    
    // 供应链信息
    if ((companyMatch.suppliers && companyMatch.suppliers.length > 0) || 
        (companyMatch.customers && companyMatch.customers.length > 0)) {
      response += `\n🔗 **供应链关系**\n`
      
      if (companyMatch.suppliers && companyMatch.suppliers.length > 0) {
        response += `• 上游供应商：${companyMatch.suppliers.slice(0, 5).join('、')}`
        if (companyMatch.suppliers.length > 5) {
          response += `等${companyMatch.suppliers.length}个`
        }
        response += '\n'
      }
      
      if (companyMatch.customers && companyMatch.customers.length > 0) {
        response += `• 下游客户：${companyMatch.customers.slice(0, 5).join('、')}`
        if (companyMatch.customers.length > 5) {
          response += `等${companyMatch.customers.length}个`
        }
        response += '\n'
      }
    }
    
    if (companyMatch.additionalInfo) {
      response += `\n📝 **其他信息**\n`
      response += `• ${companyMatch.additionalInfo}\n`
    }
    
    if (companyPeople.length > 0) {
      response += `\n👥 **公司员工**\n`
      companyPeople.forEach(p => {
        const personDisplayName = getDisplayName(p.name)
        response += `• ${personDisplayName} - ${p.position}`
        if (p.tags.length > 0) {
          response += ` (${p.tags.slice(0, 2).join('、')})`
        }
        response += '\n'
      })
      
      response += `\n💡 提示：点击"智能关系网"可以查看更详细的信息哦！`
    }
    
    // 如果是会员用户，添加联系管理者的提示
    if (isMember) {
      response += '\n\n💡 提醒：所有人名均已AI化保护，若需了解真实信息和联系方式，请联系精尚慧管理员。'
    }
    
    return response
  }
  
  // 智能模糊搜索 - 使用增强的反向查找
  const relatedByAliasName = findPeopleByAliasName(query, people)
  const relatedByTag = people.filter(p => 
    p.tags.some((tag: string) => tag.toLowerCase().includes(lowerQuery))
  )
  const relatedByPosition = people.filter(p => 
    p.position.toLowerCase().includes(lowerQuery)
  )
  const relatedByCompany = people.filter(p => 
    p.company.toLowerCase().includes(lowerQuery)
  )
  
  const allRelated = Array.from(new Set([...relatedByAliasName, ...relatedByTag, ...relatedByPosition, ...relatedByCompany]))
  
  if (allRelated.length > 0) {
    let response = `虽然没有找到完全匹配"${query}"的结果，但我发现了一些相关的人脉：\n\n`
    
    // 按相关性分类显示，优先显示AI化名字匹配的结果
    if (relatedByAliasName.length > 0) {
      response += `👤 **相关人物**\n`
      relatedByAliasName.slice(0, 3).forEach(p => {
        const aliasPersonDisplayName = getDisplayName(p.name)
        response += `• ${aliasPersonDisplayName} - ${p.position} @ ${p.company}\n`
      })
      response += '\n'
    }
    
    if (relatedByTag.length > 0) {
      response += `🏷️ **相关标签的人**\n`
      relatedByTag.slice(0, 3).forEach(p => {
        if (!relatedByAliasName.includes(p)) {
          const tagPersonDisplayName = getDisplayName(p.name)
          response += `• ${tagPersonDisplayName} - ${p.position} @ ${p.company}\n`
        }
      })
      response += '\n'
    }
    
    if (relatedByPosition.length > 0 && relatedByPosition.length !== relatedByTag.length) {
      response += `💼 **相关职位的人**\n`
      relatedByPosition.slice(0, 3).forEach(p => {
        if (!relatedByTag.includes(p) && !relatedByAliasName.includes(p)) {
          const posPersonDisplayName = getDisplayName(p.name)
          response += `• ${posPersonDisplayName} - ${p.position} @ ${p.company}\n`
        }
      })
      response += '\n'
    }
    
    response += `💡 小建议：你可以告诉我更具体的信息，比如"找做AI的人"或"清华的校友"，我会给你更精准的推荐！`
    
    // 如果是会员用户，添加联系管理者的提示
    if (isMember) {
      response += '\n\n💡 提醒：所有人名均已AI化保护，若需了解真实信息和联系方式，请联系精尚慧管理员。'
    }
    
    return response
  }
  
  // 没有找到任何结果 - 为会员用户提供更好的提示
  let response = ''
  
  if (isMember) {
    // 会员用户搜索AI化名字但没找到
    response = `抱歉，我没有找到名为"${query}"的联系人。\n\n` +
      `目前我的数据库中有以下人员：\n\n` +
      people.slice(0, 5).map(p => {
        const aliasDisplayName = localAliasNameFn(p.name)
        return `• ${aliasDisplayName} - ${p.position} @ ${p.company}`
      }).join('\n') +
      '\n\n💡 小提示：\n' +
      '1. 请尝试搜索上面列出的名字\n' +
      '2. 或者描述你想找什么类型的人（比如"做AI的"、"金融行业"）\n' +
      '3. 如需添加新的人脉信息，可以联系管理者录入'
  } else {
    // 管理者用户的原始提示
    response = `哎呀，我暂时没有找到与"${query}"相关的信息呢。😅\n\n` +
      `不过我们数据库里有这些优秀的人才：\n\n` +
      people.slice(0, 5).map(p => {
        const displayName = `${p.name} [${localAliasNameFn(p.name)}]`
        return `• ${displayName} - ${p.position} @ ${p.company}`
      }).join('\n') +
      '\n\n你可以：\n' +
      '1. 告诉我具体的姓名\n' +
      '2. 描述你想找什么类型的人（比如"AI专家"、"金融行业"）\n' +
      '3. 或者先去"信息录入"添加新的人脉信息！'
  }
    
  // 如果是会员用户，添加联系管理者的提示
  if (isMember) {
    response += '\n\n💡 提醒：所有人名均已AI化保护，若需了解真实信息和联系方式，请联系精尚慧管理员。'
  }
  
  return response
} 
