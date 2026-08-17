import { NextRequest, NextResponse } from 'next/server'

// 全站统一使用一把服务器端专用Key，绝不通过 NEXT_PUBLIC_ 前缀暴露给浏览器
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

// 新增一个人物后，用AI分析他与库内现有人物/公司的关系（同事、校友、行业伙伴等）。
// 原先这段逻辑直接写在客户端组件里调用DeepSeek，导致API Key被打进浏览器JS，存在被盗刷风险，
// 现改为统一走这个服务器端接口，Key只留在服务器环境变量里。
export async function POST(request: NextRequest) {
  try {
    const { newPerson, allPeople, allCompanies } = await request.json()

    if (!newPerson) {
      return NextResponse.json({ error: '缺少 newPerson 参数' }, { status: 400 })
    }

    if (!DEEPSEEK_API_KEY) {
      return NextResponse.json({ relationships: null, reason: 'no_api_key' })
    }

    const prompt = `
      请分析以下新增人物与现有人物和公司的关系：

      新增人物：${JSON.stringify(newPerson)}

      现有人物：${JSON.stringify((allPeople || []).filter((p: any) => p.id !== newPerson.id))}

      现有公司：${JSON.stringify(allCompanies || [])}

      请分析并返回JSON格式的关系数据，包含：
      1. 同事关系（相同公司的人）
      2. 校友关系（相同学校的人）
      3. 行业伙伴关系（相同行业的人）
      4. 业务关系（可能的供应商、客户等）

      返回格式：
      {
        "relationships": [
          {
            "relatedPersonId": "person_id",
            "relationshipType": "colleague|schoolmate|industry_partner|business_contact",
            "strength": 0.8,
            "description": "关系描述"
          }
        ]
      }
    `

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60_000)

    let response: Response
    try {
      response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: '你是一个专业的关系网络分析师，擅长分析人物之间的关系。' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[AnalyzeRelationships] DeepSeek API错误:', response.status, errorText)
      return NextResponse.json({ relationships: null, reason: 'api_error' })
    }

    const data = await response.json()
    const aiResult = data?.choices?.[0]?.message?.content

    if (!aiResult) {
      return NextResponse.json({ relationships: null, reason: 'empty_response' })
    }

    const parsedResult = JSON.parse(aiResult)
    return NextResponse.json({ relationships: parsedResult.relationships || [] })
  } catch (error: any) {
    console.error('[AnalyzeRelationships] 出错:', error)
    return NextResponse.json({ relationships: null, reason: 'exception' })
  }
}
